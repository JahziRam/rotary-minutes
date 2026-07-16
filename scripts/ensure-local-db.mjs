#!/usr/bin/env node
/**
 * Prepare local PostgreSQL for Rotary Minutes.
 *
 * Usage (PowerShell):
 *   $env:POSTGRES_PASSWORD = "votre_mot_de_passe_postgres"
 *   npm run db:setup-local
 */
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, ".env");
const DEV_VARS_PATH = resolve(ROOT, ".dev.vars");

const LOCAL_DB =
  "postgresql://rotary:rotary@localhost:5432/rotary_minutes?schema=public";

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    fail(`Commande échouée: ${cmd} ${args.join(" ")}`);
  }
}

function updateEnvFile() {
  if (!existsSync(ENV_PATH)) {
    fail("Fichier .env introuvable. Copiez .env.example vers .env.");
  }

  const lines = readFileSync(ENV_PATH, "utf8").split("\n");
  const keys = new Set([
    "DATABASE_URL",
    "DIRECT_URL",
    "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE",
  ]);
  const out = [];
  const written = new Set();

  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match && keys.has(match[1])) {
      if (match[1] === "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE") {
        out.push(`${match[1]}="${LOCAL_DB}"`);
      } else {
        out.push(`${match[1]}="${LOCAL_DB}"`);
      }
      written.add(match[1]);
      continue;
    }
    out.push(line);
  }

  for (const key of keys) {
    if (!written.has(key)) {
      out.push(`${key}="${LOCAL_DB}"`);
    }
  }

  writeFileSync(ENV_PATH, out.join("\n").replace(/\n*$/, "\n"));
  console.log("✅ .env mis à jour (DATABASE_URL + Hyperdrive local)");
}

function updateDevVarsFile() {
  const authSecret = existsSync(ENV_PATH)
    ? (readFileSync(ENV_PATH, "utf8").match(/^AUTH_SECRET="([^"]*)"/m)?.[1] ??
      "dev-secret-change-in-production-32chars-min")
    : "dev-secret-change-in-production-32chars-min";
  const cronSecret = existsSync(ENV_PATH)
    ? (readFileSync(ENV_PATH, "utf8").match(/^CRON_SECRET="([^"]*)"/m)?.[1] ?? "")
    : "";

  const lines = [
    "NEXTJS_ENV=development",
    `DATABASE_URL="${LOCAL_DB}"`,
    `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="${LOCAL_DB}"`,
    `AUTH_SECRET="${authSecret}"`,
    'NEXTAUTH_URL="http://localhost:3000"',
    'NEXT_PUBLIC_APP_URL="http://localhost:3000"',
  ];
  if (cronSecret) {
    lines.push(`CRON_SECRET="${cronSecret}"`);
  }

  writeFileSync(DEV_VARS_PATH, `${lines.join("\n")}\n`);
  console.log("✅ .dev.vars mis à jour (Hyperdrive local pour next dev)");
}

async function main() {
  const adminPassword = process.env.POSTGRES_PASSWORD?.trim();
  if (!adminPassword) {
    fail(
      [
        "Variable POSTGRES_PASSWORD manquante.",
        "",
        "PowerShell :",
        '  $env:POSTGRES_PASSWORD = "votre_mot_de_passe_postgres"',
        "  npm run db:setup-local",
        "",
        "C'est le mot de passe défini à l'installation de PostgreSQL 17 (utilisateur postgres).",
      ].join("\n")
    );
  }

  const adminUrl = `postgresql://postgres:${encodeURIComponent(adminPassword)}@localhost:5432/postgres`;
  const admin = new pg.Client({ connectionString: adminUrl });

  console.log("Connexion PostgreSQL (utilisateur postgres)...");
  try {
    await admin.connect();
    await admin.query("SELECT 1");
    console.log("✅ Connexion admin OK");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(
      [
        "Impossible de se connecter avec postgres / POSTGRES_PASSWORD.",
        message,
        "",
        "Vérifiez le mot de passe dans pgAdmin ou réinitialisez-le via l'installateur PostgreSQL.",
      ].join("\n")
    );
  }

  await admin.query(`
    DO $$ BEGIN
      CREATE ROLE rotary WITH LOGIN PASSWORD 'rotary';
    EXCEPTION WHEN duplicate_object THEN
      ALTER ROLE rotary WITH LOGIN PASSWORD 'rotary';
    END $$;
  `);

  const dbExists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = 'rotary_minutes'"
  );
  if (dbExists.rowCount === 0) {
    await admin.query("CREATE DATABASE rotary_minutes OWNER rotary");
    console.log("✅ Base rotary_minutes créée");
  } else {
    console.log("ℹ️  Base rotary_minutes déjà présente");
  }

  await admin.query("GRANT ALL PRIVILEGES ON DATABASE rotary_minutes TO rotary");
  await admin.end();

  const app = new pg.Client({ connectionString: LOCAL_DB });
  try {
    await app.connect();
    await app.query("SELECT 1");
    console.log("✅ Connexion rotary:rotary OK");
  } catch (error) {
    fail(
      `Utilisateur rotary créé mais connexion échouée: ${
        error instanceof Error ? error.message : error
      }`
    );
  } finally {
    await app.end().catch(() => {});
  }

  updateEnvFile();
  updateDevVarsFile();

  console.log("\nSynchronisation du schéma Prisma...");
  run("npx", ["prisma", "db", "push"]);

  console.log("\nSeed des données...");
  run("npm", ["run", "db:seed"]);

  console.log("\n✅ Base locale prête.");
  console.log("   npm run dev");
  console.log("   Login: superadmin@rotaryminutes.app / RotaryAdmin2026!");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});