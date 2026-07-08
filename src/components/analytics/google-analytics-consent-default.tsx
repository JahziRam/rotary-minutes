import Script from "next/script";

export function GoogleAnalyticsConsentDefault({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null;

  return (
    <Script id="google-analytics-consent-default" strategy="beforeInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          wait_for_update: 500
        });
      `}
    </Script>
  );
}