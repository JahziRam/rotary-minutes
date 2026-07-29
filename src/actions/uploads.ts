"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import {
  fileToOptimizedImageStorage,
  MAX_IMAGE_SOURCE_BYTES,
  validateImageDataUrl,
} from "@/lib/image-storage";
import { isDataUrl } from "@/lib/image-data-url";

function mapImageUploadError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
  if (
    msg === "TOO_LARGE" ||
    msg === "INVALID_TYPE" ||
    msg === "NO_FILE" ||
    msg === "UPLOADS_SUSPENDED" ||
    msg === "INVALID_FORMAT"
  ) {
    return msg;
  }
  return "UPLOAD_FAILED";
}

export async function uploadClubLogo(formData: FormData) {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "NO_FILE" as const };
  }
  if (file.size > MAX_IMAGE_SOURCE_BYTES) {
    return { error: "TOO_LARGE" as const };
  }

  try {
    const stored = await fileToOptimizedImageStorage(
      file,
      `clubs/${ctx.clubId}/logo`,
      { maxEdge: 512, quality: 82 }
    );
    if (isDataUrl(stored)) {
      const validationError = validateImageDataUrl(stored);
      if (validationError) return { error: validationError };
    }

    await prisma.club.update({
      where: { id: ctx.clubId },
      data: { logoUrl: stored },
    });

    revalidatePath("/fr/settings");
    revalidatePath("/en/settings");
    revalidatePath("/es/settings");
    return { success: true as const };
  } catch (e) {
    return { error: mapImageUploadError(e) };
  }
}

export async function removeClubLogo() {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  await prisma.club.update({
    where: { id: ctx.clubId },
    data: { logoUrl: null },
  });

  revalidatePath("/fr/settings");
  revalidatePath("/en/settings");
  return { success: true as const };
}

export async function uploadMemberPhoto(memberId: string, formData: FormData) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "NO_FILE" as const };
  }
  if (file.size > MAX_IMAGE_SOURCE_BYTES) {
    return { error: "TOO_LARGE" as const };
  }

  try {
    const stored = await fileToOptimizedImageStorage(
      file,
      `clubs/${ctx.clubId}/members/${memberId}`,
      { maxEdge: 400, quality: 80 }
    );
    if (isDataUrl(stored)) {
      const validationError = validateImageDataUrl(stored);
      if (validationError) return { error: validationError };
    }

    await prisma.member.update({
      where: { id: memberId },
      data: { photoUrl: stored },
    });

    revalidatePath("/fr/members");
    revalidatePath("/en/members");
    revalidatePath("/es/members");
    revalidatePath(`/fr/members/${memberId}`);
    revalidatePath(`/en/members/${memberId}`);
    revalidatePath(`/es/members/${memberId}`);
    return { success: true as const };
  } catch (e) {
    return { error: mapImageUploadError(e) };
  }
}

export async function removeMemberPhoto(memberId: string) {
  const auth = await requirePermission("members.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: ctx.clubId },
  });
  if (!member) return { error: "NOT_FOUND" as const };

  await prisma.member.update({
    where: { id: memberId },
    data: { photoUrl: null },
  });

  revalidatePath("/fr/members");
  revalidatePath("/en/members");
  revalidatePath(`/fr/members/${memberId}`);
  revalidatePath(`/en/members/${memberId}`);
  return { success: true as const };
}
