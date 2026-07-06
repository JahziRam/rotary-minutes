/** Types des bindings Wrangler — régénérer avec `npm run cf-typegen` */
interface CloudflareEnv {
  ASSETS: Fetcher;
  HYPERDRIVE: Hyperdrive;
  WORKER_SELF_REFERENCE: Fetcher;
}

interface Hyperdrive {
  connectionString: string;
}