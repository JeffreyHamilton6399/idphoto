import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IDPhoto — Passport photos cropped to spec, in your browser",
  description:
    "Turn any photo into a passport or ID photo that meets the official head-size and eye-line rules, then print a sheet at home. Your face never leaves your device — no uploads, no sign-up, no $15 download fee.",
  keywords: [
    "passport photo",
    "passport photo online",
    "ID photo maker",
    "visa photo",
    "2x2 passport photo",
    "35x45 photo",
    "free passport photo",
  ],
  authors: [{ name: "Jeffrey Hamilton" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "IDPhoto — Free passport photos, made in your browser",
    description:
      "Cropped to the official head-size and eye-line rules, with a printable sheet. Nothing uploaded.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "IDPhoto — Free passport photos, made in your browser",
    description:
      "Cropped to official spec, with a printable sheet. Nothing uploaded.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
