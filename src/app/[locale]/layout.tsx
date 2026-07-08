import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { RegisterSW } from "@/components/pwa/register-sw";
import { GoogleAnalyticsConsentDefault } from "@/components/analytics/google-analytics-consent-default";
import { AnalyticsConfigProvider } from "@/components/analytics/analytics-config-provider";
import { CookieConsentProvider } from "@/components/analytics/cookie-consent-provider";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { CookieBanner } from "@/components/analytics/cookie-banner";
import { AnalyticsConfigHydrator } from "@/components/analytics/analytics-config-hydrator";
import { getEnvAnalyticsConfig } from "@/lib/analytics-env";
import "../globals.css";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Rotary Minutes",
    statusBarStyle: "default",
  },
};

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
  const messages = await getMessages();
  const { measurementId, enabled: analyticsEnabled } = getEnvAnalyticsConfig();

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <GoogleAnalyticsConsentDefault enabled />
        <NextIntlClientProvider messages={messages}>
          <AnalyticsConfigProvider measurementId={measurementId} enabled={analyticsEnabled}>
            <AnalyticsConfigHydrator />
            <CookieConsentProvider>
              <GoogleAnalytics />
              <CookieBanner />
              <RegisterSW />
              {children}
            </CookieConsentProvider>
          </AnalyticsConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}