// dotenv is optional: Render/production inject env vars; local .env uses dotenv when installed.
try {
  await import("dotenv/config");
} catch {
  // module missing or already loaded — ignore
}
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI (db push, migrate, studio) needs the direct hostname (db.prisma.io).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
