import type { SiteConfig } from "@/types/site-config";
import { env } from "@/env";

export const siteConfig: SiteConfig = {
  name: "IslandHop",
  description:
    "Register early for your preferred ferry, make secure Payment for your trip, arrive to the terminal on time, Scan QR-Code and Board the ferry to your destination.",
  url: env.NEXT_PUBLIC_SITE_URL,
  author: "Shariar Sultan Fahim",
  locale: "en",
  themeColor: "#000000",
  keywords: ["islandhop", "book", "travel", "explore", "ferry", "speedboat", "booking", "island transfer", "maritime"],
  social: {
    twitter: "",
    github: "https://github.com/shariarSultanFahim",
    linkedin: "https://www.linkedin.com/in/shariarsultan"
  },
  ogImage: "/og.jpg"
} as const;
