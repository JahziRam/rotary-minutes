#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);
const { api } = createRenderApi(key);
const db = await api("/postgres/dpg-d95viunaqgkc73ek09pg-a");
const p = db.postgres || db;
console.log(JSON.stringify(p, null, 2));