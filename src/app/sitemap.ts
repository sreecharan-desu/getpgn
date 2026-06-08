import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = LEGAL.siteUrl;
  const lastModified = new Date("2026-06-08");

  return [
    {
      url: base,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/privacy`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/refund`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/signup`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
