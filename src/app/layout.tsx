import type { Metadata } from "next";
import { Audiowide, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const audiowide = Audiowide({
  variable: "--font-audiowide",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

import { SITE_DESCRIPTION } from "@/lib/og/constants";

export const metadata: Metadata = {
  metadataBase: new URL("https://getpgn.in"),
  title: {
    default: "GetPGN — Scoresheets to PGN, instantly",
    template: "%s · GetPGN",
  },
  description: SITE_DESCRIPTION,
  applicationName: "GetPGN",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "GetPGN — Scoresheets to PGN, instantly",
    description: SITE_DESCRIPTION,
    siteName: "GetPGN",
    type: "website",
    url: "https://getpgn.in",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "GetPGN — Scoresheets to PGN, instantly",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme to <html> before paint to avoid a flash/flip on refresh. */}
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${audiowide.variable} antialiased`}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {children}
        <Toaster
          position="top-center"
          richColors={false}
          toastOptions={{
            className: "gp-toast",
            style: {
              borderRadius: "12px",
              border: "1px solid var(--color-line-strong)",
              background: "var(--color-paper)",
              color: "var(--color-ink)",
              boxShadow: "var(--shadow-soft)",
              fontSize: "13px",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
