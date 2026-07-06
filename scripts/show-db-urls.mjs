#!/usr/bin/env node
import pg from "pg";
import { createRenderApi } from "./render-env-api.mjs";

const key = process.env.RENDER_API_KEY;
const { api } = createRenderApi(key);
const info = await api("/postgres/dpg-d95viunaqgkc73ek09pg-a/connection-info");
const c = info.connectionInfo || info;

for (const k of ["internalConnectionString", "externalConnectionString"]) {
  const u = c[k];
  if (!u) continue;
  console.log(k + ":", String(u).replace(/:([^:@]+)@/, ":***@").slice(0, 120));
}

async function test(name, config) {
  const pool = new pg.Pool({ ...config, connectionTimeoutMillis: 15000, max: 1 });
  try {
    const r = await pool.query("SELECT 1");
    console.log(name, "OK", r.rows);
  } catch (e) {
    console.log(name, "FAIL", e.message.split("\n")[0].slice(0, 100));
  } finally {
    await pool.end().catch(() => {});
  }
}

const ext = c.externalConnectionString;
const int = c.internalConnectionString;
await test("ext+ssl obj", { connectionString: ext, ssl: { rejectUnauthorized: false } });
await test("ext+ssl true", { connectionString: ext, ssl: true });
await test("ext+libpq", {
  connectionString: ext + "?uselibpqcompat=true&sslmode=require",
});
await test("ext+verify-full", { connectionString: ext + "?sslmode=verify-full" });
await test("int plain", { connectionString: int });