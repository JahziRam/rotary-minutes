import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ApiKeyScope } from "@/generated/prisma/client";

export interface ApiAuthContext {
  clubId: string;
  apiKeyId: string;
  scopes: ApiKeyScope[];
}

export async function clubHasApiAccess(clubId: string): Promise<boolean> {
  const [features, subscription] = await Promise.all([
    prisma.clubFeatures.findUnique({ where: { clubId } }),
    prisma.subscription.findUnique({ where: { clubId } }),
  ]);

  if (features?.apiAccessEnabled) return true;
  return subscription?.plan === "ENTERPRISE" && subscription.status === "ACTIVE";
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function authenticateApiRequest(
  request: Request,
  requiredScope?: ApiKeyScope
): Promise<ApiAuthContext | { error: string; status: number }> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { error: "MISSING_API_KEY", status: 401 };
  }

  const rawKey = header.slice(7).trim();
  if (!rawKey.startsWith("rm_live_") || rawKey.length < 20) {
    return { error: "INVALID_API_KEY", status: 401 };
  }

  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.clubApiKey.findFirst({
    where: { keyPrefix, isActive: true },
  });

  if (!apiKey) {
    return { error: "INVALID_API_KEY", status: 401 };
  }

  if (apiKey.keyHash !== keyHash) {
    return { error: "INVALID_API_KEY", status: 401 };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { error: "API_KEY_EXPIRED", status: 401 };
  }

  const hasAccess = await clubHasApiAccess(apiKey.clubId);
  if (!hasAccess) {
    return { error: "API_ACCESS_DISABLED", status: 403 };
  }

  if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
    return { error: "INSUFFICIENT_SCOPE", status: 403 };
  }

  void prisma.clubApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    clubId: apiKey.clubId,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes,
  };
}