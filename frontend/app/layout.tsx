import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { Providers } from "./providers";

// Typography ported from the Ecosystem Fund Guardian lemon design system.
// Both families load as variable fonts, so the full weight range is
// self-hosted and preloaded — Inter covers headings (100-900) and
// JetBrains Mono covers body/UI (100-800), including the font-bold (700)
// used throughout. EFG loaded the same two from Google Fonts as static
// weights; this replaces that with no external request and no FOUT.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShipGuard",
  description:
    "Escrowed funding for teams. A team opens a raise with a condition, an evidence URL, and a close date. Backers deposit GEN. At the close date GenLayer's AI reads the evidence — condition met, the funds release to the team; not met, every backer is refunded.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#d4ff00", // lemon
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} ${inter.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
