import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Plantão Mendex", template: "%s · Plantão Mendex" },
  description: "Controle de atendimento de clientes e roleta de corretores no plantão de vendas",
};
export const viewport: Viewport = { themeColor: "#0a1d42" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
