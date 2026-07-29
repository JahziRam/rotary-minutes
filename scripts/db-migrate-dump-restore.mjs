/**
 * Dump PostgreSQL → fichier SQL, puis restore optionnel (ex. Render → Neon).
 * N'utilise pas pg_dump (souvent absent sous Windows) : s'appuie sur le package `pg`.
 *
 * Usage (PowerShell) :
 *   $env:SOURCE_DATABASE_URL = "postgresql://...@....oregon-postgres.render.com/..."  # URL EXTERNE Render
 *   $env:TARGET_DATABASE_URL = "postgresql://...@ep-....neon.tech/neondb?sslmode=require"  # Neon DIRECT
 *   node scripts/db-migrate-dump-restore.mjs dump
 *   node scripts/db-migrate-dump-restore.mjs restore
 *
 * Options :
 *   dump   [outfile]   — défaut : rotary_minutes_dump.sql
 *   restore [infile]   — défaut : rotary_minutes_dump.sql
 *   both   [outfile]   — dump puis restore
 *
 * Sécurité : ne commitez jamais les URLs / le fichier dump s'il contient des secrets.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function usage() {
  console.log(`
Usage:
  node scripts/db-migrate-dump-restore.mjs dump [outfile.sql]
  node scripts/db-migrate-dump-restore.mjs restore [infile.sql]
  node scripts/db-migrate-dump-restore.mjs both [outfile.sql]

Env:
  SOURCE_DATABASE_URL  — dump (Render External URL, pas dpg-…-a interne)
  TARGET_DATABASE_URL  — restore (Neon direct, sans -pooler de préférence)
`);
}

function normalizeUrl(url) {
  if (!url?.trim()) return null;
  let u = url.trim();
  // Neon sometimes adds channel_binding=require which older clients dislike
  u = u.replace(/([?&])channel_binding=require&?/i, "$1").replace(/[?&]$/, "");
  if (!/[?&]sslmode=/i.test(u) && /neon\.tech|render\.com/i.test(u)) {
    u += (u.includes("?") ? "&" : "?") + "sslmode=require";
  }
  return u;
}

function warnIfInternalRender(url) {
  if (/@dpg-[a-z0-9-]+(?:\/|:|$)/i.test(url) && !/\.render\.com/i.test(url)) {
    console.error(`
[ERREUR] URL Render INTERNE détectée (host dpg-…-a sans .render.com).
Elle ne fonctionne que depuis le réseau Render, pas depuis votre PC.

Dans le dashboard Render → PostgreSQL → copiez "External Database URL"
(souvent …@dpg-….oregon-postgres.render.com:5432/…).
`);
    process.exit(1);
  }
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function escapePgTextArray(arr) {
  if (arr.length === 0) return `ARRAY[]::text[]`;
  const els = arr.map((x) => {
    if (x === null || x === undefined) return "NULL";
    return `'${String(x).replace(/'/g, "''")}'`;
  });
  return `ARRAY[${els.join(", ")}]::text[]`;
}

function escapeLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Buffer.isBuffer(value)) {
    return `E'\\\\x${value.toString("hex")}'`;
  }
  // pg returns Postgres text[] / arrays as JS arrays — not jsonb
  if (Array.isArray(value)) {
    if (value.every((x) => x === null || typeof x === "string")) {
      return escapePgTextArray(value);
    }
    if (value.every((x) => x === null || typeof x === "number")) {
      if (value.length === 0) return `ARRAY[]::float8[]`;
      return `ARRAY[${value.map((x) => (x === null ? "NULL" : String(x))).join(", ")}]`;
    }
    // mixed / objects → jsonb array
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Existing dumps cast JS string arrays to ::jsonb by mistake.
 * Rewrite pure JSON string arrays to text[] for Neon restore.
 * Objects/numbers jsonb stay as jsonb.
 */
function fixMistakenJsonbStringArrays(sql) {
  // Match '…'::jsonb where … is a JSON array (handles doubled single-quotes inside)
  return sql.replace(/'((?:[^']|'')*)'::jsonb/g, (full, inner) => {
    const jsonText = inner.replace(/''/g, "'");
    try {
      const parsed = JSON.parse(jsonText);
      if (
        Array.isArray(parsed) &&
        parsed.every((x) => x === null || typeof x === "string")
      ) {
        return escapePgTextArray(parsed);
      }
    } catch {
      /* keep original */
    }
    return full;
  });
}

async function listUserTables(client) {
  const { rows } = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return rows.map((r) => r.tablename);
}

async function dumpSchema(client) {
  // Full schema via pg_dump is better; here we use a pragmatic approach:
  // 1) Try to get CREATE from information_schema is incomplete for enums/FKs.
  // Prefer: user installs pg_dump. Fallback: dump data only after migrate deploy on empty Neon.
  const { rows: enums } = await client.query(`
    SELECT n.nspname AS schema,
           t.typname AS name,
           e.enumlabel AS label,
           e.enumsortorder AS ord
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `);

  const enumMap = new Map();
  for (const row of enums) {
    if (!enumMap.has(row.name)) enumMap.set(row.name, []);
    enumMap.get(row.name).push(row.label);
  }

  const parts = [];
  parts.push("-- Generated by scripts/db-migrate-dump-restore.mjs");
  parts.push("-- Prefer full schema via: node scripts/neon-bootstrap-schema.mjs on empty Neon, then restore.");
  parts.push("SET client_encoding = 'UTF8';");
  // Do NOT set session_replication_role — Neon (and most managed PG) deny it.
  parts.push("");

  for (const [name, labels] of enumMap) {
    const vals = labels.map((l) => `'${String(l).replace(/'/g, "''")}'`).join(", ");
    parts.push(
      `DO $$ BEGIN CREATE TYPE ${quoteIdent(name)} AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
    );
  }
  parts.push("");

  return parts.join("\n");
}

async function dumpTableData(client, table) {
  const { rows } = await client.query(`SELECT * FROM ${quoteIdent(table)}`);
  if (rows.length === 0) {
    return `-- ${table}: 0 rows\n`;
  }

  const cols = Object.keys(rows[0]);
  const colList = cols.map(quoteIdent).join(", ");
  const lines = [`-- ${table}: ${rows.length} rows`, `TRUNCATE TABLE ${quoteIdent(table)} CASCADE;`];

  // Batch inserts of 100
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = chunk
      .map((row) => `(${cols.map((c) => escapeLiteral(row[c])).join(", ")})`)
      .join(",\n  ");
    lines.push(
      `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES\n  ${values};`
    );
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Order tables for insert: simple heuristic — tables without FK first is hard;
 * with session_replication_role = replica, FK checks are deferred-ish.
 * We dump in name order; restore with replica role disables triggers/FK checks.
 */
async function cmdDump(outfile) {
  const source = normalizeUrl(process.env.SOURCE_DATABASE_URL || process.env.RENDER_DATABASE_URL);
  if (!source) {
    console.error("Set SOURCE_DATABASE_URL or RENDER_DATABASE_URL");
    usage();
    process.exit(1);
  }
  warnIfInternalRender(source);

  const out = path.resolve(outfile || "rotary_minutes_dump.sql");
  const client = new Client({
    connectionString: source,
    ssl: /render\.com|neon\.tech/i.test(source)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  console.log("Connecting to SOURCE…");
  await client.connect();
  try {
    const tables = await listUserTables(client);
    console.log(`Found ${tables.length} tables in public schema`);

    const chunks = [];
    chunks.push(await dumpSchema(client));

    // Skip pure migration bookkeeping last if needed — include _prisma_migrations data
    for (const table of tables) {
      process.stdout.write(`  dumping ${table}…`);
      chunks.push(await dumpTableData(client, table));
      console.log(" ok");
    }

    chunks.push("-- end dump");

    fs.writeFileSync(out, chunks.join("\n"), "utf8");
    const mb = (fs.statSync(out).size / (1024 * 1024)).toFixed(2);
    console.log(`\nDump written: ${out} (${mb} MB)`);
    console.log(`
Next:
  1) Empty Neon DB + apply schema:
       $env:DIRECT_URL = "<neon direct>"
       $env:DATABASE_URL = $env:DIRECT_URL
       npx prisma migrate deploy
  2) Restore data only (or full file if schema already matches):
       $env:TARGET_DATABASE_URL = "<neon direct>"
       node scripts/db-migrate-dump-restore.mjs restore "${path.basename(out)}"
`);
  } finally {
    await client.end();
  }
}

/** Split SQL into statements; keep DO $$ … $$ blocks intact. */
function splitSqlStatements(sql) {
  const statements = [];
  let buf = "";
  let i = 0;
  let inSingle = false;
  let dollarTag = null; // e.g. $$ or $tag$

  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (inSingle) {
      if (c === "'" && next === "'") {
        buf += "''";
        i += 2;
        continue;
      }
      if (c === "'") {
        inSingle = false;
        buf += c;
        i++;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (c === "'") {
      inSingle = true;
      buf += c;
      i++;
      continue;
    }

    // Dollar-quoting: $$ or $tag$
    if (c === "$") {
      const m = sql.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (m) {
        dollarTag = m[0];
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (c === "-" && next === "-") {
      // line comment
      while (i < sql.length && sql[i] !== "\n") {
        buf += sql[i];
        i++;
      }
      continue;
    }

    if (c === ";") {
      const stmt = buf.trim();
      if (stmt.length > 0 && !stmt.startsWith("--")) {
        statements.push(stmt);
      }
      buf = "";
      i++;
      continue;
    }

    buf += c;
    i++;
  }

  const tail = buf.trim();
  if (tail.length > 0 && !tail.startsWith("--")) {
    statements.push(tail);
  }
  return statements;
}

function shouldSkipRestoreStatement(stmt) {
  const s = stmt.replace(/\s+/g, " ").trim();
  // Neon / managed Postgres: not allowed for non-superuser
  if (/^SET\s+session_replication_role\b/i.test(s)) return true;
  return false;
}

async function dropForeignKeys(client) {
  const { rows } = await client.query(`
    SELECT con.conname AS name,
           nsp.nspname AS schema,
           rel.relname AS table
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
    ORDER BY rel.relname, con.conname
  `);

  const fks = [];
  for (const row of rows) {
    const { rows: defRows } = await client.query(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conname = $1
         AND conrelid = (
           SELECT c.oid FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE c.relname = $2 AND n.nspname = $3
         )`,
      [row.name, row.table, row.schema]
    );
    const def = defRows[0]?.def;
    if (!def) continue;
    fks.push({
      table: row.table,
      name: row.name,
      def,
    });
    await client.query(
      `ALTER TABLE ${quoteIdent(row.table)} DROP CONSTRAINT ${quoteIdent(row.name)}`
    );
  }
  console.log(`Dropped ${fks.length} foreign keys (will re-add after data load).`);
  return fks;
}

async function restoreForeignKeys(client, fks) {
  let ok = 0;
  for (const fk of fks) {
    try {
      await client.query(
        `ALTER TABLE ${quoteIdent(fk.table)} ADD CONSTRAINT ${quoteIdent(fk.name)} ${fk.def}`
      );
      ok++;
    } catch (e) {
      console.warn(
        `  warn: could not re-add FK ${fk.table}.${fk.name}: ${e.message}`
      );
    }
  }
  console.log(`Re-added ${ok}/${fks.length} foreign keys.`);
}

async function cmdRestore(infile) {
  const target = normalizeUrl(
    process.env.TARGET_DATABASE_URL || process.env.NEON_DIRECT_URL
  );
  if (!target) {
    console.error("Set TARGET_DATABASE_URL or NEON_DIRECT_URL");
    usage();
    process.exit(1);
  }

  const file = path.resolve(infile || "rotary_minutes_dump.sql");
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  let sql = fs.readFileSync(file, "utf8");
  const beforeFix = sql.length;
  sql = fixMistakenJsonbStringArrays(sql);
  if (sql.length !== beforeFix || sql.includes("::text[]")) {
    console.log(
      "Normalized string arrays: '…'::jsonb → ARRAY[…]::text[] (ClubDocument.tags, etc.)"
    );
  }

  const client = new Client({
    connectionString: target,
    ssl: /neon\.tech|render\.com/i.test(target)
      ? { rejectUnauthorized: false }
      : undefined,
    connectionTimeoutMillis: 60_000,
  });

  console.log("Connecting to TARGET…");
  await client.connect();
  let fks = [];
  try {
    // Neon cannot SET session_replication_role — drop FKs instead.
    fks = await dropForeignKeys(client);

    const rawStatements = splitSqlStatements(sql);
    const statements = rawStatements.filter((s) => !shouldSkipRestoreStatement(s));
    const skippedRole = rawStatements.length - statements.length;
    if (skippedRole > 0) {
      console.log(
        `Skipped ${skippedRole} statement(s) (session_replication_role — not allowed on Neon).`
      );
    }

    console.log(
      `Restoring ${file} (${(sql.length / 1024 / 1024).toFixed(2)} MB, ${statements.length} statements)…`
    );

    let ok = 0;
    let skipped = 0;
    for (let n = 0; n < statements.length; n++) {
      const stmt = statements[n];
      try {
        await client.query(stmt);
        ok++;
      } catch (e) {
        const msg = e.message || String(e);
        if (
          /already exists|duplicate key|unique constraint/i.test(msg) &&
          /CREATE TYPE|INSERT INTO/i.test(stmt.slice(0, 120))
        ) {
          skipped++;
          continue;
        }
        // Empty truncate on missing table after partial bootstrap
        if (/does not exist/i.test(msg) && /^TRUNCATE\b/i.test(stmt.trim())) {
          skipped++;
          continue;
        }
        console.error(`\nFailed at statement ${n + 1}/${statements.length}:`);
        console.error(msg);
        console.error("Statement preview:", stmt.slice(0, 200).replace(/\s+/g, " "));
        throw e;
      }
      if ((n + 1) % 50 === 0 || n + 1 === statements.length) {
        process.stdout.write(`\r  ${n + 1}/${statements.length}…`);
      }
    }
    console.log(`\nData load finished (${ok} ok, ${skipped} skipped).`);

    await restoreForeignKeys(client, fks);
    console.log("Restore finished OK.");
  } catch (e) {
    console.error("Restore failed:", e.message);
    if (fks.length) {
      console.error("Attempting to re-add foreign keys after failure…");
      try {
        await restoreForeignKeys(client, fks);
      } catch {
        /* ignore */
      }
    }
    console.error(`
If errors are about missing relations/tables, first run:
  node scripts/neon-bootstrap-schema.mjs

Then re-run restore.
`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const [cmd, fileArg] = process.argv.slice(2);
if (!cmd || !["dump", "restore", "both"].includes(cmd)) {
  usage();
  process.exit(1);
}

if (cmd === "dump") {
  await cmdDump(fileArg);
} else if (cmd === "restore") {
  await cmdRestore(fileArg);
} else {
  await cmdDump(fileArg);
  await cmdRestore(fileArg || "rotary_minutes_dump.sql");
}
