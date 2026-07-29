/**
 * Optional object storage for media/documents (Vercel Blob).
 * When BLOB_READ_WRITE_TOKEN is unset, callers fall back to DB data URLs.
 */

export function isObjectStorageEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN?.trim();
}

export type PutObjectResult = {
  url: string;
  pathname: string;
};

/**
 * Upload a buffer to Vercel Blob (public read).
 * Throws if token missing or upload fails.
 */
export async function putObject(
  pathname: string,
  body: Buffer,
  contentType: string
): Promise<PutObjectResult> {
  if (!isObjectStorageEnabled()) {
    throw new Error("OBJECT_STORAGE_DISABLED");
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/** Safe key segment for club/member scoped paths. */
export function storagePath(
  parts: Array<string | number | null | undefined>
): string {
  return parts
    .filter((p) => p != null && String(p).length > 0)
    .map((p) =>
      String(p)
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .slice(0, 80)
    )
    .join("/");
}
