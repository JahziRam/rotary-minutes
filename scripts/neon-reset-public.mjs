import pg from "pg";

const url = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.TARGET_DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL / DIRECT_URL");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: /neon\.tech/i.test(url) ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
console.log("Resetting public schema on Neon…");
await client.query("DROP SCHEMA IF EXISTS public CASCADE");
await client.query("CREATE SCHEMA public");
await client.query("GRANT ALL ON SCHEMA public TO neondb_owner");
await client.query("GRANT ALL ON SCHEMA public TO public");
console.log("Done — empty public schema.");
await client.end();
