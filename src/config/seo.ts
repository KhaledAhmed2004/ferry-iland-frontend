import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

export const seoConfig: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "IslandHop | Book • Travel • Explore",
    template: `%s | ${siteConfig.name}`
  },
  description:
    "Book ferry & speedboat tickets, travel between islands seamlessly, and explore top maritime routes—all in one simple booking experience.",
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
    title: "IslandHop | Book • Travel • Explore",
    description:
      "Book ferry & speedboat tickets, travel between islands seamlessly, and explore top maritime routes—all in one simple booking experience.",
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
