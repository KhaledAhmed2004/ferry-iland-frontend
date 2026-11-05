import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GoogleAnalytics } from "@next/third-parties/google";

import { seoConfig } from "@/config/seo";
import { siteConfig } from "@/config/site";
import { env } from "@/env";

import { Toaster } from "@/ui";
import { Providers } from "@/providers";

import "@/tailwind";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = seoConfig;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={siteConfig.locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground flex min-h-screen w-full flex-col font-sans antialiased`}
      >
        <Providers>
          <main className="flex-1">{children}</main>
          <Toaster richColors position="top-right" />
        </Providers>

        {env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
