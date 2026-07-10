import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const androidDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "android");
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(gradlew, ["assembleDebug"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);