import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Incrémenter quand le schéma Prisma change (invalide le cache dev). */
const PRISMA_SCHEMA_VERSION = 10;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
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
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }
  return client;
}

function readClientProperty(client: PrismaClient, prop: string | symbol, receiver: unknown) {
  const value = Reflect.get(client as object, prop, receiver);
  return typeof value === "function" ? value.bind(client) : value;
}

/** Proxy pour survivre au hot-reload Turbopack sans singleton périmé. */
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