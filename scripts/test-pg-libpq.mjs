#!/usr/bin/env node
import pg from "pg";
import { createRenderApi } from "./render-env-api.mjs";

const key = process.env.RENDER_API_KEY;
const { api } = createRenderApi(key);
const info = await api("/postgres/dpg-d95viunaqgkc73ek09pg-a/connection-info");
const ext = (info.connectionInfo || info).externalConnectionString;

async function test(name, config) {
  const pool = new pg.Pool({ ...config, connectionTimeoutMillis: 20000, max: 1 });
  try {
    const r = await pool.query("SELECT 1 AS ok");
    console.log(name, "OK");
  } catch (e) {
    console.log(name, "FAIL", e.message.split("\n")[0].slice(0, 120));
  } finally {
    await pool.end().catch(() => {});
  }
}

const base = ext.split("?")[0];
await test("libpq-require-no-ssl-obj", {
  connectionString: `${base}?uselibpqcompat=true&sslmode=require`,
});
await test("libpq-prefer", {
  connectionString: `${base}?uselibpqcompat=true&sslmode=prefer`,
});
await test("no-sslmode-ssl-obj-sni", {
  connectionString: base,
  ssl: { rejectUnauthorized: false, servername: base.split("@")[1].split("/")[0].split(":")[0] },
});