import type { Metadata } from "next";
import { testMetadata } from "@/lib/og/pages";

export const metadata: Metadata = testMetadata();

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
