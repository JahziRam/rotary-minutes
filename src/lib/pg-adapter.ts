import { PrismaPg } from "@prisma/adapter-pg";

export function isRenderInternalPostgres(url: string): boolean {
  return /@dpg-[a-z0-9-]+(?:\/|:|$)/i.test(url) && !/\.render\.com/i.test(url);
}

export function ensureSslForRemotePostgres(url: string): string {
  if (isRenderInternalPostgres(url)) return url;
  if (!/render\.com|prisma\.io/i.test(url)) return url;
  if (/sslmode=|ssl=true/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require`;
}

function connectionHostname(url: string): string | null {
  try {
    const normalized = url.replace(/^postgres(ql)?:\/\//, "http://");
    return new URL(normalized).hostname;
  } catch {
    return null;
  }
}

export function createPgAdapter(connectionString: string): PrismaPg {
  const resolved = ensureSslForRemotePostgres(connectionString);
  const useSsl =
    /render\.com|prisma\.io/i.test(resolved) && !isRenderInternalPostgres(resolved);
  if (!useSsl) {
    return new PrismaPg({ connectionString: resolved });
  }
  const hostname = connectionHostname(resolved);
  return new PrismaPg({
    connectionString: resolved,
    ssl: {
      rejectUnauthorized: false,
      ...(hostname ? { servername: hostname } : {}),
    },
  });
}