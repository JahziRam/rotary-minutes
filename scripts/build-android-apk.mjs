/**
 * Build a complete installable APK (debug + release) and copy to dist/android/
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android");
const distDir = path.join(root, "dist", "android");
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

const jdkCandidates = [
  process.env.JAVA_HOME,
  "C:\\Program Files\\Microsoft\\jdk-21.0.11.10-hotspot",
  "C:\\Program Files\\Microsoft\\jdk-17.0.19.10-hotspot",
  "C:\\Program Files\\Java\\jdk-21",
  "C:\\Program Files\\Java\\jdk-17",
].filter(Boolean);

const javaHome = jdkCandidates.find((p) => fs.existsSync(p));
if (!javaHome) {
  console.error("JAVA_HOME introuvable. Installez JDK 17 (Microsoft.OpenJDK.17).");
  process.exit(1);
}

const sdkRoot = path.join(root, ".android-sdk");
const localProps = path.join(androidDir, "local.properties");
if (!fs.existsSync(localProps) && fs.existsSync(sdkRoot)) {
  fs.writeFileSync(localProps, `sdk.dir=${sdkRoot.replace(/\\/g, "\\\\")}\n`);
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: sdkRoot,
  ANDROID_SDK_ROOT: sdkRoot,
  CAPACITOR_SERVER_URL:
    process.env.CAPACITOR_SERVER_URL || "https://clubminutes.api.mg/fr/dashboard",
};

function runGradle(task) {
  console.log(`\n▶ gradlew ${task}`);
  const result = spawnSync(gradlew, [task], {
    cwd: androidDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Sync Capacitor assets first
console.log("▶ cap sync android");
const sync = spawnSync("npx", ["cap", "sync", "android"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env,
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

// Generate signing keystore for release APK
const keystoreScript = path.join(root, "scripts", "ensure-android-keystore.ps1");
spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", keystoreScript], {
  cwd: root,
  stdio: "inherit",
  env,
});

runGradle("assembleDebug");
runGradle("assembleRelease");

fs.mkdirSync(distDir, { recursive: true });

const releaseApk = [
  path.join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk"),
  path.join(androidDir, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk"),
].find((p) => fs.existsSync(p));

const artifacts = [
  {
    src: path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
    dest: path.join(distDir, "rotary-minutes-debug.apk"),
  },
  ...(releaseApk
    ? [{ src: releaseApk, dest: path.join(distDir, "rotary-minutes-release.apk") }]
    : []),
];

for (const { src, dest } of artifacts) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const size = Math.round(fs.statSync(dest).size / 1024);
    console.log(`✓ ${dest} (${size} Ko)`);
  }
}

console.log("\nAPK prêts dans dist/android/");