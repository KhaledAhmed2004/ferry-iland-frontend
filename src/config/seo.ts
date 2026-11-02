import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

export const seoConfig: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "IslandHop | Book your travel, Skip the lines and Advance to your destination",
    template: `%s | ${siteConfig.name}`
  },
  description:
    "Register early for your preferred ferry, make secure Payment for your trip, arrive to the terminal on time, Scan QR-Code and Board the ferry to your destination.",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    shortcut: "/favicon.ico"
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    title: "IslandHop | Book your travel, Skip the lines and Advance to your destination",
    description:
      "Register early for your preferred ferry, make secure Payment for your trip, arrive to the terminal on time, Scan QR-Code and Board the ferry to your destination.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.social.twitter,
    creator: siteConfig.social.twitter,
    images: [siteConfig.ogImage]
  }
};
