import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Incrémenter quand le schéma Prisma change (invalide le cache dev). */
const PRISMA_SCHEMA_VERSION = 12;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

function ensureSslForRemotePostgres(url: string): string {
  if (!/render\.com|prisma\.io/i.test(url)) return url;
  if (/sslmode=|ssl=true/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=require`;
}

function resolveConnectionString(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (!fromEnv) {
    throw new Error("DATABASE_URL is not set");
  }

  try {
    const { env } = getCloudflareContext();
    const hyperdrive = (env as CloudflareEnv).HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      return ensureSslForRemotePostgres(hyperdrive.connectionString);
    }
  } catch {
    // next dev, build, ou environnement Node classique
  }

  return ensureSslForRemotePostgres(fromEnv);
}

function createPrismaClient() {
  const connectionString = resolveConnectionString();
  const needsSsl = /render\.com|prisma\.io/i.test(connectionString);
  const adapter = new PrismaPg(
    needsSsl
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : { connectionString }
  );
  return new PrismaClient({ adapter });
}

function hasDelegate(
  client: PrismaClient,
  key: keyof PrismaClient
): boolean {
  const delegate = client[key];
  return (
    delegate !== null &&
    delegate !== undefined &&
    typeof delegate === "object" &&
    "findUnique" in delegate &&
    typeof (delegate as { findUnique?: unknown }).findUnique === "function"
  );
}

function isPrismaClientReady(client: PrismaClient): boolean {
  return (
    globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION &&
    hasDelegate(client, "clubFeatures") &&
    hasDelegate(client, "planConfig") &&
    hasDelegate(client, "minuteTemplate") &&
    hasDelegate(client, "featureFlag") &&
    hasDelegate(client, "clubApiKey")
  );
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientReady(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => {});
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  return client;
}

function readClientProperty(client: PrismaClient, prop: string | symbol, receiver: unknown) {
  const value = Reflect.get(client as object, prop, receiver);
  return typeof value === "function" ? value.bind(client) : value;
}

/** Proxy pour survivre au hot-reload et réutiliser le client par isolate Worker. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = readClientProperty(client, prop, receiver);

    if (
      value === undefined &&
      typeof prop === "string" &&
      !prop.startsWith("$") &&
      !prop.startsWith("_")
    ) {
      globalForPrisma.prismaSchemaVersion = -1;
      const freshClient = getPrismaClient();
      return readClientProperty(freshClient, prop, receiver);
    }

    return value;
  },
});