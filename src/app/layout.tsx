import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const sans = Inter_Tight({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-app-mono",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
