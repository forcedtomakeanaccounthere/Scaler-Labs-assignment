import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LenisProvider } from "@/providers/LenisProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: `${siteConfig.name} — AI-Powered Product Intelligence Platform`,
  description: siteConfig.description,
  icons: {
    icon: "/l.png",
    shortcut: "/l.png",
    apple: "/l.png",
  },
  keywords: [
    "product intelligence",
    "AI",
    "industrial data",
    "adaptive platform",
    "data extraction",
    "commerce",
    siteConfig.name,
  ],
  openGraph: {
    title: `${siteConfig.name} — AI-Powered Product Intelligence Platform`,
    description: siteConfig.description,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased noise" suppressHydrationWarning>
        <ThemeProvider>
          <LenisProvider>{children}</LenisProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
