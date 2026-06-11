import type { Metadata } from "next";
import { logoutMetadata } from "@/lib/og/pages";

export const metadata: Metadata = logoutMetadata();

export default function LogoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
