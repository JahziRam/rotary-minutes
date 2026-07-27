/**
 * Bootstrap an empty Neon DB when `prisma migrate deploy` fails because
 * `20260101000000_baseline` is a no-op (schema was originally created with db push).
 *
 * Usage (PowerShell):
 *   $env:DIRECT_URL = "postgresql://...@ep-....neon.tech/rotary-minutes?sslmode=require"
 *   $env:DATABASE_URL = $env:DIRECT_URL
 *   node scripts/neon-bootstrap-schema.mjs
 *
 * Then restore data:
 *   $env:TARGET_DATABASE_URL = $env:DIRECT_URL
 *   node scripts/db-migrate-dump-restore.mjs restore rotary_minutes_dump.sql
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "prisma", "migrations");

function run(cmd) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
}

if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  console.error("Set DATABASE_URL and/or DIRECT_URL to your Neon direct connection string.");
  process.exit(1);
}

// Prefer direct URL for DDL
if (process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

console.log(`
Neon bootstrap
--------------
1) prisma db push  → full schema from schema.prisma
2) mark all migrations as already applied (baseline is empty by design)
`);

// Clear failed migration row if present (best-effort via resolve)
const dirs = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{14}_/.test(d.name))
  .map((d) => d.name)
  .sort();

// Roll back failed migration name if user hit P3018 on subscription_payment
try {
  run(
    `npx prisma migrate resolve --rolled-back 20260710120000_add_subscription_payment`
  );
} catch {
  console.log("(no failed migration to roll back — ok)");
}

run(`npx prisma db push --accept-data-loss`);

for (const name of dirs) {
  try {
    run(`npx prisma migrate resolve --applied ${name}`);
  } catch {
    console.log(`(already recorded or skipped: ${name})`);
  }
}

console.log(`
Done. Schema is ready on Neon.

Next — restore your dump:
  $env:TARGET_DATABASE_URL = $env:DIRECT_URL
  node scripts/db-migrate-dump-restore.mjs restore rotary_minutes_dump.sql

Then set Vercel env:
  DATABASE_URL  = Neon pooled (-pooler)
  DIRECT_URL    = Neon direct
  and Redeploy.
`);
