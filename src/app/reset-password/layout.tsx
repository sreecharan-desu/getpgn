import type { Metadata } from "next";
import { resetPasswordMetadata } from "@/lib/og/pages";

export const metadata: Metadata = resetPasswordMetadata();

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
