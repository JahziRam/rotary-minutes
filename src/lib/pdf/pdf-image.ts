/**
 * Prepare images for @react-pdf/renderer.
 * react-pdf crashes with TypeError (reading 'S') on empty/invalid Image src.
 * Only data:image/(png|jpeg|gif|webp);base64,... is reliable — always re-encode via sharp.
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
  /**
   * Resize fit. Use "cover" for avatars, "inside" for logos (preserve aspect).
   * Default: cover.
   */
  fit?: "cover" | "inside" | "contain";
  /** Max JPEG bytes before a second compress pass (default 28_000). */
  maxBytes?: number;
};

function decodeDataUrl(s: string): Buffer | null {
  // data:image/svg+xml;base64,... or data:image/png;base64,...
  const b64 = s.match(/^data:image\/[a-z0-9+.-]+;base64,(.+)$/i);
  if (b64?.[1]) {
    try {
      const buf = Buffer.from(b64[1].replace(/\s/g, ""), "base64");
      return buf.byteLength >= 16 ? buf : null;
    } catch {
      return null;
    }
  }
  // data:image/svg+xml;charset=utf-8,... or data:image/svg+xml,...
  const svgUtf = s.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?,(.*)$/i);
  if (svgUtf?.[1]) {
    try {
      const decoded = decodeURIComponent(svgUtf[1]);
      return Buffer.from(decoded, "utf8");
    } catch {
      return Buffer.from(svgUtf[1], "utf8");
    }
  }
  return null;
}

/**
 * Convert data URL or http(s) URL into a small JPEG data URL safe for react-pdf.
 * Supports SVG (sharp rasterize). Returns `fallback` (or undefined) on failure.
 */
export async function toPdfEmbedImage(
  src: string | null | undefined,
  options: PdfImageOptions = {}
): Promise<string | undefined> {
  const fallback = options.fallback;
  const maxEdge = options.maxEdge ?? 72;
  const fit = options.fit === "contain" ? "inside" : (options.fit ?? "cover");
  const maxBytes = options.maxBytes ?? 28_000;

  if (!src?.trim()) return fallback;
  const s = src.trim();

  try {
    let buffer: Buffer;

    if (s.startsWith("data:image/") || s.startsWith("data:image/svg")) {
      const decoded = decodeDataUrl(s);
      if (!decoded) return fallback;
      buffer = decoded;
    } else if (/^https?:\/\//i.test(s)) {
      const res = await fetch(s, {
        signal: AbortSignal.timeout(8_000),
        headers: { Accept: "image/*,image/svg+xml" },
      });
      if (!res.ok) return fallback;
      const ab = await res.arrayBuffer();
      if (ab.byteLength < 16 || ab.byteLength > 5 * 1024 * 1024) return fallback;
      buffer = Buffer.from(ab);
    } else {
      // Relative paths are not fetchable from the PDF worker reliably
      return fallback;
    }

    const sharp = (await import("sharp")).default;
    let pipeline = sharp(buffer, {
      failOn: "none",
      // SVG needs density for decent raster quality
      density: 144,
    }).rotate();

    pipeline = pipeline.resize({
      width: maxEdge,
      height: maxEdge,
      fit,
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });

    // Flatten alpha onto white so JPEG doesn't turn transparent logos black
    let out = await pipeline
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    if (out.byteLength > maxBytes) {
      out = await sharp(out)
        .resize({
          width: Math.min(maxEdge, 120),
          height: Math.min(maxEdge, 120),
          fit,
          withoutEnlargement: true,
        })
        .jpeg({ quality: 60, mozjpeg: true })
        .toBuffer();
    }

    const dataUrl = `data:image/jpeg;base64,${out.toString("base64")}`;
    return isPdfSafeImageSrc(dataUrl) ? dataUrl : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Logo-oriented embed: preserve aspect ratio, larger max edge, higher byte budget.
 * Returns `{ dataUrl, aspectRatio }` or undefined.
 */
export async function toPdfLogoImage(
  src: string | null | undefined,
  maxEdge = 200
): Promise<{ dataUrl: string; aspectRatio: number } | undefined> {
  if (!src?.trim()) return undefined;
  try {
    const dataUrl = await toPdfEmbedImage(src, {
      maxEdge,
      fit: "inside",
      maxBytes: 60_000,
    });
    if (!dataUrl || !isPdfSafeImageSrc(dataUrl)) return undefined;

    const b64 = dataUrl.split(",")[1];
    if (!b64) return undefined;
    const sharp = (await import("sharp")).default;
    const meta = await sharp(Buffer.from(b64, "base64")).metadata();
    const w = meta.width ?? maxEdge;
    const h = meta.height ?? Math.round(maxEdge / 3);
    return { dataUrl, aspectRatio: h > 0 ? w / h : 3.5 };
  } catch {
    return undefined;
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
