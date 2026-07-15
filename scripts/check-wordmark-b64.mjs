import fs from "fs";
import sharp from "sharp";

const ts = fs.readFileSync("src/lib/rotary-wordmark-b64.ts", "utf8");
const b64 = ts.match(/ROTARY_WORDMARK_PNG_BASE64 = "([^"]+)"/)?.[1];
const fromFile = fs.readFileSync("public/brand/rotary-wordmark.png");
const fromB64 = Buffer.from(b64 ?? "", "base64");

console.log("match", fromB64.equals(fromFile));
const [fileMeta, b64Meta] = await Promise.all([
  sharp(fromFile).metadata(),
  sharp(fromB64).metadata(),
]);
console.log("file", fileMeta.width, fileMeta.height);
console.log("b64 ", b64Meta.width, b64Meta.height);