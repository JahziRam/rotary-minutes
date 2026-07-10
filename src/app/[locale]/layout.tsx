import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { RegisterSW } from "@/components/pwa/register-sw";
import { CapacitorBridge } from "@/components/native/capacitor-bridge";
import { GoogleAnalyticsConsentDefault } from "@/components/analytics/google-analytics-consent-default";
import { AnalyticsConfigProvider } from "@/components/analytics/analytics-config-provider";
import { CookieConsentProvider } from "@/components/analytics/cookie-consent-provider";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { CookieBanner } from "@/components/analytics/cookie-banner";
import { AnalyticsConfigHydrator } from "@/components/analytics/analytics-config-hydrator";
import { getEnvAnalyticsConfig } from "@/lib/analytics-env";
import { getAppBranding } from "@/lib/app-settings";
import { patchMessagesWithBranding } from "@/lib/i18n-branding";
import { AppBrandingProvider } from "@/components/brand/app-branding-provider";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d2d52",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { appName } = await getAppBranding();
  return {
    manifest: `/${locale}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);
  const branding = await getAppBranding();
  const messages = patchMessagesWithBranding(await getMessages(), branding);
  const { measurementId, enabled: analyticsEnabled } = getEnvAnalyticsConfig();

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <GoogleAnalyticsConsentDefault enabled />
        <NextIntlClientProvider messages={messages}>
          <AppBrandingProvider branding={branding}>
            <AnalyticsConfigProvider measurementId={measurementId} enabled={analyticsEnabled}>
              <AnalyticsConfigHydrator />
              <CookieConsentProvider>
                <GoogleAnalytics />
                <CookieBanner />
                <RegisterSW />
                <CapacitorBridge />
                {children}
              </CookieConsentProvider>
            </AnalyticsConfigProvider>
          </AppBrandingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}