import type { Metadata } from "next";
import { forgotPasswordMetadata } from "@/lib/og/pages";

export const metadata: Metadata = forgotPasswordMetadata();

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
