import type { Metadata } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-font",
});
const manrope = Manrope({ subsets: ["latin"], variable: "--font-body-font" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-font",
});

export const metadata: Metadata = {
  title: "Narukku | Premium Solana Lottery",
  description: "A premium, skeuomorphic Solana lottery experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body className="neu-base bg-[var(--background-base)] h-[100dvh] overflow-hidden antialiased selection:bg-[var(--accent-primary)] selection:text-white">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
