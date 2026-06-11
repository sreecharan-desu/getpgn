import type { Metadata } from "next";
import { SITE_DESCRIPTION } from "@/lib/og/constants";
import { buildPageMetadata } from "@/lib/og/metadata";

export const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export function homeMetadata(): Metadata {
  return buildPageMetadata({
    title: "Scoresheets to PGN, instantly",
    description: SITE_DESCRIPTION,
    path: "/",
    eyebrow: "Chess scoresheet digitizer",
    ogSubtitle: "AI extraction · live validation · cloud library",
  });
}

export function loginMetadata(): Metadata {
  return buildPageMetadata({
    title: "Log in",
    description:
      "Sign in to your GetPGN workspace to scan scoresheets, validate moves, and manage your game library.",
    path: "/login",
    eyebrow: "Account",
    ogSubtitle: "Access your scoresheet workspace",
    robots: NOINDEX,
  });
}

export function signupMetadata(): Metadata {
  return buildPageMetadata({
    title: "Create account",
    description:
      "Join GetPGN to digitize handwritten chess scoresheets into validated PGN files with AI-powered extraction.",
    path: "/signup",
    eyebrow: "Get started",
    ogSubtitle: "Free to start · upgrade when you need more",
    robots: NOINDEX,
  });
}

export function signupEmailMetadata(): Metadata {
  return buildPageMetadata({
    title: "Add your email",
    description:
      "Secure your GetPGN account with an email address for verification and password recovery.",
    path: "/signup/email",
    eyebrow: "Account setup",
    robots: NOINDEX,
  });
}

export function verifyEmailMetadata(): Metadata {
  return buildPageMetadata({
    title: "Verify email",
    description:
      "Confirm your email address to unlock your GetPGN workspace and start scanning scoresheets.",
    path: "/verify-email",
    eyebrow: "Account setup",
    robots: NOINDEX,
  });
}

export function onboardingMetadata(): Metadata {
  return buildPageMetadata({
    title: "Welcome",
    description:
      "Finish setting up your GetPGN account — choose your role and start digitizing chess games.",
    path: "/onboarding",
    eyebrow: "Account setup",
    ogSubtitle: "Learner, coach, or organizer",
    robots: NOINDEX,
  });
}

export function forgotPasswordMetadata(): Metadata {
  return buildPageMetadata({
    title: "Forgot password",
    description:
      "Reset your GetPGN password securely. We will email you a link to choose a new password.",
    path: "/auth/forgot-password",
    eyebrow: "Account",
    robots: NOINDEX,
  });
}

export function logoutMetadata(): Metadata {
  return buildPageMetadata({
    title: "Signing out",
    description: "You are being signed out of your GetPGN account.",
    path: "/auth/logout",
    eyebrow: "Account",
    robots: NOINDEX,
  });
}

export function resetPasswordMetadata(): Metadata {
  return buildPageMetadata({
    title: "Reset password",
    description:
      "Choose a new password for your GetPGN account and get back to your scoresheet workspace.",
    path: "/reset-password",
    eyebrow: "Account",
    robots: NOINDEX,
  });
}

export function dashboardMetadata(): Metadata {
  return buildPageMetadata({
    title: "Dashboard",
    description:
      "Upload chess scoresheets, extract PGN, validate moves, and save games to your GetPGN library.",
    path: "/dashboard",
    eyebrow: "Workspace",
    ogSubtitle: "Scan · validate · save",
    robots: NOINDEX,
  });
}

export function accountMetadata(): Metadata {
  return buildPageMetadata({
    title: "Account",
    description:
      "Manage your GetPGN profile, billing, referrals, and subscription settings.",
    path: "/account",
    eyebrow: "Settings",
    robots: NOINDEX,
  });
}

export function privacyMetadata(): Metadata {
  return buildPageMetadata({
    title: "Privacy Policy",
    description:
      "How GetPGN collects, stores, and protects your chess scoresheets, game data, and account information.",
    path: "/privacy",
    eyebrow: "Legal",
    ogSubtitle: "Your data stays yours",
  });
}

export function refundMetadata(): Metadata {
  return buildPageMetadata({
    title: "Refund & Cancellation Policy",
    description:
      "GetPGN refund and cancellation terms for Free, Pro subscriptions, and Enterprise pay-as-you-go credits.",
    path: "/refund",
    eyebrow: "Legal",
    ogSubtitle: "Clear, fair billing policies",
  });
}

export function termsMetadata(): Metadata {
  return buildPageMetadata({
    title: "Terms & Conditions",
    description:
      "Terms of use for GetPGN — accounts, plans, scoresheet processing, Enterprise libraries, and acceptable use.",
    path: "/terms",
    eyebrow: "Legal",
    ogSubtitle: "How GetPGN works",
  });
}

export function testMetadata(): Metadata {
  return buildPageMetadata({
    title: "Test pipeline",
    description: "Internal GetPGN extraction pipeline test page.",
    path: "/test",
    eyebrow: "Internal",
    robots: NOINDEX,
  });
}
