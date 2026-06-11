import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/constants";
import { createOgImageResponse } from "@/lib/og/image";

export const runtime = "nodejs";
export const alt = "GetPGN — Scoresheets to PGN, instantly";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpenGraphImage() {
  return createOgImageResponse({
    eyebrow: "Chess scoresheet digitizer",
    title: "Scoresheets to PGN, instantly",
    subtitle: "AI extraction · live validation · cloud library",
  });
}
