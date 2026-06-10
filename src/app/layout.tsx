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

const siteDescription =
  "Turn handwritten chess scoresheets into validated PGN files. AI extraction, live move validation, smart repair, and cloud storage — built for tournament players and coaches.";

export const metadata: Metadata = {
  metadataBase: new URL("https://getpgn.in"),
  title: {
    default: "GetPGN — Scoresheets to PGN, instantly",
    template: "%s · GetPGN",
  },
  description: siteDescription,
  applicationName: "GetPGN",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "GetPGN — Scoresheets to PGN, instantly",
    description: siteDescription,
    siteName: "GetPGN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GetPGN — Scoresheets to PGN, instantly",
    description: siteDescription,
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
          position="top-right"
          gap={10}
          toastOptions={{
            style: {
              borderRadius: "12px",
              border: "1px solid var(--color-line-strong)",
              background: "var(--color-paper)",
              color: "var(--color-ink)",
              boxShadow: "var(--shadow-pop)",
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
