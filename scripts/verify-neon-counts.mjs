/**
 * Vérifie le schéma + compteurs clés sur Neon (post-restore).
 *
 *   $env:DIRECT_URL = (neonctl connection-string --project-id … --database-name rotary-minutes)
 *   node scripts/verify-neon-counts.mjs
 */
import pg from "pg";
const { Client } = pg;

let u = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").trim();
u = u.replace(/([?&])channel_binding=require&?/i, "$1").replace(/[?&]$/, "");
if (!u) {
  console.error("Set DIRECT_URL (Neon direct connection string)");
  process.exit(1);
}

const c = new Client({
  connectionString: u,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 60_000,
});

await c.connect();
const t = await c.query(
  "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'"
);
console.log("public tables:", t.rows[0].n);

try {
  const m = await c.query(
    "SELECT count(*)::int AS n FROM _prisma_migrations"
  );
  console.log("migrations:", m.rows[0].n);
} catch (e) {
  console.log("migrations err:", e.message);
}

const samples = [
  "User",
  "Club",
  "Member",
  "Meeting",
  "Minute",
  "RoleConfig",
  "Attendance",
  "ClubDocument",
  "Subscription",
];
for (const name of samples) {
  try {
    const r = await c.query(`SELECT count(*)::int AS n FROM "${name}"`);
    console.log(`count ${name}:`, r.rows[0].n);
  } catch (e) {
    console.log(`count ${name}:`, e.message);
  }
}

const fk = await c.query(`
  SELECT count(*)::int AS n
  FROM pg_constraint con
  JOIN pg_namespace nsp ON nsp.oid = con.connamespace
  WHERE con.contype = 'f' AND nsp.nspname = 'public'
`);
console.log("foreign keys:", fk.rows[0].n);

await c.end();
console.log("OK");
