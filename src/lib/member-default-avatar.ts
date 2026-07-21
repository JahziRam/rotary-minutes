import fs from "fs";
import path from "path";
import { MEMBER_DEFAULT_AVATAR_PATH } from "@/lib/media-url";

export { MEMBER_DEFAULT_AVATAR_PATH };

let cachedDataUrl: string | null = null;

/** Embedded data URL for PDF (server-side only — uses Node fs). */
export function getMemberDefaultAvatarDataUrl(): string {
  if (cachedDataUrl) return cachedDataUrl;
  const filePath = path.join(
    process.cwd(),
    "public",
    "brand",
    "member-default-avatar.png"
  );
  const buf = fs.readFileSync(filePath);
  cachedDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedDataUrl;
}
