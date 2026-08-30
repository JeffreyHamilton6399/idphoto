import type { Metadata, Viewport } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const sans = Instrument_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-app-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IDPhoto: crop a passport photo to spec",
  description:
    "Pick a country, line the face up against the head-size and eye-line guides, and print a sheet at home. Covers the common 2x2 inch and 35x45 mm formats.",
  authors: [{ name: "Jeffrey Hamilton" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "IDPhoto",
    description:
      "Crop a passport photo to the official head-size rules and print a sheet at home.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "IDPhoto",
    description:
      "Crop a passport photo to the official head-size rules.",
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
        className={`${sans.variable} ${mono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
