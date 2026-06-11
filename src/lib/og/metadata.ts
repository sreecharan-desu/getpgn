import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { OG_SIZE } from "@/lib/og/constants";

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  eyebrow?: string;
  ogSubtitle?: string;
  robots?: Metadata["robots"];
  ogVariant?: "default" | "share" | "library";
  ogSlug?: string;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function ogImageUrl(input: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  variant?: "default" | "share" | "library";
  slug?: string;
}): string {
  const params = new URLSearchParams();
  params.set("title", truncate(input.title, 120));
  if (input.subtitle) params.set("subtitle", truncate(input.subtitle, 180));
  if (input.eyebrow) params.set("eyebrow", truncate(input.eyebrow, 60));
  if (input.variant && input.variant !== "default") {
    params.set("variant", input.variant);
  }
  if (input.slug) params.set("slug", input.slug);
  return `/api/og?${params.toString()}`;
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const url = `${LEGAL.siteUrl}${input.path}`;
  const ogTitle = `${input.title} · GetPGN`;
  const imageAlt = input.title;
  const imageUrl = ogImageUrl({
    title: input.title,
    subtitle: input.ogSubtitle ?? input.description,
    eyebrow: input.eyebrow,
    variant: input.ogVariant,
    slug: input.ogSlug,
  });

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.robots,
    openGraph: {
      title: ogTitle,
      description: input.description,
      url,
      siteName: LEGAL.siteName,
      type: "website",
      locale: "en_IN",
      images: [
        {
          url: imageUrl,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: input.description,
      images: [imageUrl],
    },
  };
}
