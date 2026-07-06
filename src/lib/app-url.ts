/** Runtime app URL — avoids localhost baked in at build time via NEXT_PUBLIC_* */
export function getAppBaseUrl(): string {
  const url =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}