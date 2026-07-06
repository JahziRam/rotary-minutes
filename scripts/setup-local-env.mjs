#!/usr/bin/env node
/**
 * Configure .env for local Docker Postgres (replaces invalid Prisma Postgres URLs).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(ROOT, ".env");
const examplePath = resolve(ROOT, ".env.example");

const LOCAL_DB =
  "postgresql://rotary:rotary@localhost:5432/rotary_minutes?schema=public";

function parseEnv(text) {
  const lines = text.split("\n");
  const map = new Map();
  const order = [];
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      map.set(m[1], m[2].replace(/^"|"$/g, ""));
      order.push(m[1]);
    }
  }
  return { lines, map, order };
}

function serialize(lines, map) {
  const out = [];
  const written = new Set();
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (m) {
      const key = m[1];
      if (map.has(key)) {
        out.push(`${key}="${map.get(key)}"`);
        written.add(key);
      } else {
        out.push(line);
      }
    } else {
      out.push(line);
    }
  }
  for (const [key, value] of map) {
    if (!written.has(key)) out.push(`${key}="${value}"`);
  }
  return out.join("\n") + "\n";
}

if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    console.error("Missing .env and .env.example");
    process.exit(1);
  }
  writeFileSync(envPath, readFileSync(examplePath, "utf8"));
}

const parsed = parseEnv(readFileSync(envPath, "utf8"));
parsed.map.set("DATABASE_URL", LOCAL_DB);
parsed.map.set("DIRECT_URL", LOCAL_DB);

if (!parsed.map.get("AUTH_SECRET")?.trim()) {
  const { randomBytes } = await import("node:crypto");
  parsed.map.set("AUTH_SECRET", randomBytes(32).toString("base64"));
}
if (!parsed.map.get("CRON_SECRET")?.trim()) {
  const { randomBytes } = await import("node:crypto");
  parsed.map.set("CRON_SECRET", randomBytes(32).toString("base64"));
}

parsed.map.set("AUTH_URL", "http://localhost:3000");
parsed.map.set("NEXTAUTH_URL", "http://localhost:3000");
parsed.map.set("AUTH_TRUST_HOST", "true");
parsed.map.set("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

writeFileSync(envPath, serialize(parsed.lines, parsed.map));
console.log("Updated .env for local Docker Postgres (localhost:5432/rotary_minutes)");