import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_STORED_IMAGE_BYTES, validateImageDataUrl } from "@/lib/image-data-url";
import { optimizeImageBuffer } from "@/lib/image-storage";

async function makeNoisyJpeg(width: number, height: number): Promise<Buffer> {
  // Pseudo-noise so the source is realistically large (not a solid-color PNG).
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = (i * 37 + (i % 251)) & 0xff;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("optimizeImageBuffer", () => {
  it("shrinks a large image under the stored size cap", async () => {
    const input = await makeNoisyJpeg(1600, 1200);
    expect(input.byteLength).toBeGreaterThan(200_000);

    const { buffer, mime } = await optimizeImageBuffer(input, {
      maxEdge: 400,
      quality: 80,
    });

    expect(mime).toBe("image/jpeg");
    expect(buffer.byteLength).toBeLessThanOrEqual(MAX_STORED_IMAGE_BYTES);
    expect(buffer.byteLength).toBeLessThan(input.byteLength);

    const meta = await sharp(buffer).metadata();
    expect(meta.width ?? 0).toBeLessThanOrEqual(400);
    expect(meta.height ?? 0).toBeLessThanOrEqual(400);
  });

  it("produces a valid data URL under validateImageDataUrl", async () => {
    const input = await makeNoisyJpeg(800, 800);
    const { buffer, mime } = await optimizeImageBuffer(input);
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    expect(validateImageDataUrl(dataUrl)).toBeNull();
  });
});
