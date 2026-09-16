import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { Providers } from "./providers";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShipGuard",
  description:
    "Fund teams that ship, without trusting them blindly. Backers pledge to a project — meet the commitments, the team gets funded; miss them, and every backer is refunded. Settled by GenLayer's AI against the project's own repos and links.",
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
