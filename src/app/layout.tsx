import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotary Minutes — Procès-verbaux modernes",
  description:
    "Plateforme SaaS collaborative pour la rédaction, l'archivage et l'authentification des procès-verbaux Rotary et Rotaract.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}