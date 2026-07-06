/** Types des bindings Wrangler — régénérer avec `npm run cf-typegen` */
interface CloudflareEnv {
  ASSETS: Fetcher;
  HYPERDRIVE: Hyperdrive;
  IMAGES: ImagesBinding;
  WORKER_SELF_REFERENCE: Fetcher;
}

interface Hyperdrive {
  connectionString: string;
}