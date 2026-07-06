"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { fileToDataUrl, validateImageDataUrl } from "@/lib/image-storage";

export async function uploadClubLogo(formData: FormData) {
  const auth = await requirePermission("settings.manage");
  if (auth.error) return { error: auth.error };
  const { ctx } = auth;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "NO_FILE" as const };
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    const validationError = validateImageDataUrl(dataUrl);
    if (validationError) return { error: validationError };

    await prisma.club.update({
      where: { id: ctx.clubId },
      data: { logoUrl: dataUrl },
    });

    revalidatePath("/fr/settings");
    revalidatePath("/en/settings");
    return { success: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg };
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

  try {
    const dataUrl = await fileToDataUrl(file);
    const validationError = validateImageDataUrl(dataUrl);
    if (validationError) return { error: validationError };

    await prisma.member.update({
      where: { id: memberId },
      data: { photoUrl: dataUrl },
    });

    revalidatePath("/fr/members");
    revalidatePath("/en/members");
    revalidatePath(`/fr/members/${memberId}`);
    revalidatePath(`/en/members/${memberId}`);
    return { success: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg };
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