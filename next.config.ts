import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep native/heavy deps out of the webpack server bundle (lower peak RAM).
  serverExternalPackages: ["pg", "pg-cloudflare", "sharp", "@prisma/client", "prisma"],
  experimental: {
    serverActions: {
      // Uploads max 5 MB/file; 8 MB leaves headroom for multipart overhead.
      // Was 50 MB — unnecessarily large heap risk on Server Actions.
      bodySizeLimit: "8mb",
    },
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@tanstack/react-query",
      "react-hook-form",
      "@hookform/resolvers",
      "@react-pdf/renderer",
    ],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default withNextIntl(nextConfig);