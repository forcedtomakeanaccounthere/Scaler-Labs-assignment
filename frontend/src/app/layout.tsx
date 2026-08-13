import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LenisProvider } from "@/providers/LenisProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: `${siteConfig.name} — AI-Powered PII Redaction Platform`,
  description: siteConfig.description,
  icons: {
    icon: "/l.png",
    shortcut: "/l.png",
    apple: "/l.png",
  },
  keywords: [
    "PII redaction",
    "DOCX redaction",
    "data privacy",
    "Aadhaar redaction",
    "AI compliance",
    "GDPR",
    "DPDPA",
    siteConfig.name,
  ],
  openGraph: {
    title: `${siteConfig.name} — AI-Powered PII Redaction Platform`,
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
          <AuthProvider>
            <LenisProvider>{children}</LenisProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
