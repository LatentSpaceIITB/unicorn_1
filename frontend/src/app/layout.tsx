import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Providers } from "./providers";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",  // For notched phones
};

export const metadata: Metadata = {
  title: "Read the Room",
  description: "Can you survive a first date? 20 Turns. 3 Stats. Don't get friendzoned.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} ${playfairDisplay.variable} antialiased`}
        style={{ backgroundColor: 'var(--terminal-bg)' }}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
