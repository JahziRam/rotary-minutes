import type { Metadata } from "next";
import { DEFAULT_APP_NAME } from "@/lib/app-settings";

export const metadata: Metadata = {
  title: `${DEFAULT_APP_NAME} — Procès-verbaux modernes`,
  description:
    "Plateforme SaaS collaborative pour la rédaction, l'archivage et l'authentification des procès-verbaux Rotary et Rotaract. Produit de Visa Guard USA, LLC.",
  manifest: "/manifest.json",
  authors: [{ name: "Visa Guard USA, LLC" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}