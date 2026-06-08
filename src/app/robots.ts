import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/auth/logout", "/share/"],
    },
    sitemap: `${LEGAL.siteUrl}/sitemap.xml`,
    host: LEGAL.siteUrl,
  };
}
