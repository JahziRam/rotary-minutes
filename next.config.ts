import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-cloudflare"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@tanstack/react-query"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default withNextIntl(nextConfig);