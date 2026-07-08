#!/usr/bin/env node
import { createRenderApi } from "./render-env-api.mjs";

const key = process.env.RENDER_API_KEY;
if (!key) process.exit(1);
const { api, getOwnerId, findService } = createRenderApi(key);
const ownerId = await getOwnerId();
const s = await findService(ownerId, "rotary-minutes");
console.log(JSON.stringify(s, null, 2));