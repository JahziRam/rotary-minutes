#!/usr/bin/env node
import pg from "pg";
import { createRenderApi } from "./render-env-api.mjs";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);

const { api } = createRenderApi(key);
const info = await api("/postgres/dpg-d95viunaqgkc73ek09pg-a/connection-info");
const ext = (info.connectionInfo || info).externalConnectionString;
const host = ext.split("@")[1].split("/")[0].split(":")[0];

async function test(name, config) {
  const pool = new pg.Pool({ ...config, connectionTimeoutMillis: 20000, max: 1 });
  try {
    const r = await pool.query("SELECT 1 AS ok");
    console.log(name, "OK", r.rows[0]);
  } catch (e) {
    console.log(name, "FAIL", e.message.split("\n")[0].slice(0, 120));
  } finally {
    await pool.end().catch(() => {});
  }
}

const parsed = new URL(ext.replace(/^postgres:/, "http:"));
await test("sni-servername", {
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
  ssl: { rejectUnauthorized: false, servername: parsed.hostname },
});
await test("sni+sslmode-url", {
  connectionString: ext + "?sslmode=require",
  ssl: { rejectUnauthorized: false, servername: host },
});
await test("no-ssl-obj+sslmode-url", {
  connectionString: ext + "?sslmode=require",
});