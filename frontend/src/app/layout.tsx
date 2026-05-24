import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeoArchitect — AI Architectural Synthesis Platform",
  description: "Design client building requirements into intelligent 2D floor plans, interactive 3D structures, and cinematic CGI visuals in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground bg-grid-cyber">
        {children}
      </body>
    </html>
  );
}
