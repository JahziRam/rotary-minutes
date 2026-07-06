import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Avoid preloading all routes into the main worker (smaller cold-start bundle).
  routePreloadingBehavior: "none",
});