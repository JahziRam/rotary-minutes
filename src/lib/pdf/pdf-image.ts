/**
 * Prepare images for @react-pdf/renderer.
 * react-pdf crashes with TypeError (reading 'S') on empty/invalid Image src.
 * Only data:image/*;base64,... is reliable in serverless; HTTP fetches are flaky.
 */

export function isPdfSafeImageSrc(src: string | null | undefined): boolean {
  if (!src?.trim()) return false;
  return /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(
    src.trim().replace(/\s+/g, "")
  );
}

export type PdfImageOptions = {
  /** Max edge in px for embedded thumbs (default 72). */
  maxEdge?: number;
  /** Fallback data URL if conversion fails. */
  fallback?: string;
};

/**
 * Convert data URL or http(s) URL into a small JPEG data URL safe for react-pdf.
 * Returns `fallback` (or undefined) on any failure — never empty string.
 */
export async function toPdfEmbedImage(
  src: string | null | undefined,
  options: PdfImageOptions = {}
): Promise<string | undefined> {
  const fallback = options.fallback;
  const maxEdge = options.maxEdge ?? 72;

  if (!src?.trim()) return fallback;
  const s = src.trim();

  try {
    let buffer: Buffer;

    if (s.startsWith("data:image/")) {
      const match = s.match(/^data:image\/[a-z+]+;base64,(.+)$/i);
      if (!match?.[1]) return fallback;
      buffer = Buffer.from(match[1].replace(/\s/g, ""), "base64");
      if (buffer.byteLength < 32) return fallback;
    } else if (/^https?:\/\//i.test(s)) {
      const res = await fetch(s, {
        signal: AbortSignal.timeout(8_000),
        headers: { Accept: "image/*" },
      });
      if (!res.ok) return fallback;
      const ab = await res.arrayBuffer();
      if (ab.byteLength < 32 || ab.byteLength > 5 * 1024 * 1024) return fallback;
      buffer = Buffer.from(ab);
    } else {
      // Relative paths are not fetchable from the PDF worker reliably
      return fallback;
    }

    const sharp = (await import("sharp")).default;
    let out = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "cover",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 68, mozjpeg: true })
      .toBuffer();

    // Keep embeds tiny so many annex photos don't blow memory
    if (out.byteLength > 28_000) {
      out = await sharp(out)
        .resize({ width: 48, height: 48, fit: "cover" })
        .jpeg({ quality: 55, mozjpeg: true })
        .toBuffer();
    }

    const dataUrl = `data:image/jpeg;base64,${out.toString("base64")}`;
    return isPdfSafeImageSrc(dataUrl) ? dataUrl : fallback;
  } catch {
    return fallback;
  }
}

/** Process many images with bounded concurrency. */
export async function mapToPdfEmbedImages(
  sources: Array<string | null | undefined>,
  options: PdfImageOptions = {},
  concurrency = 4
): Promise<Array<string | undefined>> {
  const out: Array<string | undefined> = new Array(sources.length);
  let i = 0;

  async function worker() {
    while (i < sources.length) {
      const idx = i++;
      out[idx] = await toPdfEmbedImage(sources[idx], options);
    }
  }

  const n = Math.min(concurrency, Math.max(1, sources.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
