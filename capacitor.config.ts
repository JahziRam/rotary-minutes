import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android shell for the hosted Next.js app.
 * Production: CAPACITOR_SERVER_URL=https://clubminutes.api.mg/fr/dashboard
 * Emulator + local dev: CAPACITOR_SERVER_URL=http://10.0.2.2:3000/fr/dashboard
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "mg.api.clubminutes.app",
  appName: process.env.CAPACITOR_APP_NAME?.trim() || "Rotary Minutes",
  webDir: "public",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          androidScheme: "https",
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#071a30",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d2d52",
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#071a30",
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
  },
};

export default config;