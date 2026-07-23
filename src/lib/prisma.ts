import { PrismaClient } from "@/generated/prisma/client";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createPgAdapter, ensureSslForRemotePostgres } from "@/lib/pg-adapter";

/** Incrémenter quand le schéma Prisma change (invalide le cache dev). */
const PRISMA_SCHEMA_VERSION = 18;

/**
 * Audit log suspendu (2026-07) : suspecté de contribuer à la saturation
 * mémoire serveur (scans jusqu'à 500 lignes par vérification de rate-limit,
 * écritures à chaque action). Repasser à `true` (ou définir la variable
 * d'env AUDIT_LOG_ENABLED=true) pour réactiver sans toucher aux ~90 sites
 * d'appel `prisma.auditLog.create` du code — ils redeviennent actifs
 * automatiquement.
 */
export function isAuditLogEnabled(): boolean {
  return process.env.AUDIT_LOG_ENABLED === "true";
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

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
  const adapter = createPgAdapter(resolveConnectionString());
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
    hasDelegate(client, "clubProject") &&
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

function wrapAuditLogDelegate(delegate: unknown) {
  return new Proxy(delegate as object, {
    get(target, prop, receiver) {
      if (prop === "create" && !isAuditLogEnabled()) {
        return async () => null;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
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
      const freshValue = readClientProperty(freshClient, prop, receiver);
      if (prop === "auditLog") return wrapAuditLogDelegate(freshValue);
      return freshValue;
    }

    if (prop === "auditLog") return wrapAuditLogDelegate(value);

    return value;
  },
});