import type { Metadata } from "next";
import Link from "next/link";
import { PolicyShell } from "@/components/legal/PolicyShell";
import { LEGAL } from "@/lib/legal";
import { refundMetadata } from "@/lib/og/pages";
import { PRICING_DISPLAY, formatInr } from "@/lib/pricingDisplay";
import {
  ORGANIZER_MIN_SCANS,
  calculateOrganizerAmount,
  formatOrganizerInr,
} from "@/lib/organizerPricing";

export const metadata: Metadata = refundMetadata();

const { monthly, yearly } = PRICING_DISPLAY;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-[16px] font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="space-y-3 text-muted">{children}</div>
    </section>
  );
}

export default function RefundPolicyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Refund & Cancellation Policy",
    description: metadata.description,
    url: `${LEGAL.siteUrl}/refund`,
    isPartOf: { "@type": "WebSite", name: LEGAL.siteName, url: LEGAL.siteUrl },
    dateModified: "2026-06-09",
    publisher: { "@type": "Organization", name: LEGAL.entityName, url: LEGAL.siteUrl },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PolicyShell
        title="Refund & Cancellation Policy"
        description={`Last updated ${LEGAL.lastUpdated}. Fair and transparent billing for Free, Pro, and Enterprise pay-as-you-go plans — processed securely via Razorpay.`}
      >
        <Section title="Overview">
          <p>
            {LEGAL.siteName} offers a <strong className="text-ink">Free</strong>{" "}
            plan (2 lifetime scans), recurring <strong className="text-ink">Pro</strong>{" "}
            subscriptions, and an <strong className="text-ink">Enterprise</strong>{" "}
            pay-as-you-go prepaid scan wallet. This policy explains cancellations
            and refunds for paid products.
          </p>
        </Section>

        <Section title="Plans and billing">
          <p>
            <strong className="text-ink">Free:</strong> No payment required. No
            refunds apply.
          </p>
          <p>
            <strong className="text-ink">Pro · Monthly:</strong>{" "}
            {formatInr(monthly.priceInr)}/month · up to {monthly.scanLimit} scans
            per month. Renews automatically until cancelled.
          </p>
          <p>
            <strong className="text-ink">Pro · Yearly:</strong>{" "}
            {formatInr(yearly.priceInr)}/year · up to{" "}
            {yearly.scanLimit.toLocaleString("en-IN")} scans per year. Renews
            automatically until cancelled.
          </p>
          <p>
            <strong className="text-ink">Enterprise (pay-as-you-go):</strong>{" "}
            One-time prepaid scan packs from{" "}
            {formatOrganizerInr(calculateOrganizerAmount(ORGANIZER_MIN_SCANS))}{" "}
            (minimum {ORGANIZER_MIN_SCANS.toLocaleString("en-IN")} scans per pack).
            Credits stay in your wallet until used. You may buy additional packs at
            any time. This is not a recurring subscription.
          </p>
          <p>
            All payments are processed by{" "}
            <a
              href="https://razorpay.com"
              className="legal-link !text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              Razorpay
            </a>
            . We do not store your full payment credentials on our servers.
          </p>
        </Section>

        <Section title="Pro subscription cancellation">
          <p>
            You may cancel your Pro subscription at any time from your account
            billing settings. When you cancel:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Pro access continues until the end of the current billing period you
              have already paid for
            </li>
            <li>
              Auto-renewal stops — you will not be charged again unless you
              resubscribe
            </li>
            <li>
              Your saved games remain in your account; free-plan limits apply after
              the paid period ends
            </li>
          </ul>
          <p>
            Cancellation takes effect at the end of the current billing cycle, not
            immediately, unless otherwise required by applicable law.
          </p>
        </Section>

        <Section title="Refund eligibility — Pro subscriptions">
          <p>Refunds for Pro subscriptions may be issued when:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Within 7 days of first purchase:</strong>{" "}
              Contact us within seven (7) calendar days of your initial subscription
              payment for a full refund if Pro does not meet your expectations.
            </li>
            <li>
              <strong className="text-ink">Duplicate or erroneous charges:</strong>{" "}
              We will refund duplicate or mistaken charges promptly.
            </li>
            <li>
              <strong className="text-ink">Extended service outage:</strong>{" "}
              A verified platform outage that prevented meaningful use of paid
              features for an extended period may qualify for a proportional credit
              or refund.
            </li>
          </ul>
        </Section>

        <Section title="Refund eligibility — Enterprise pay-as-you-go credits">
          <p>Enterprise packs are prepaid scan credits, not subscriptions:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Within 7 days, unused credits:</strong>{" "}
              If no scans have been consumed from a pack within seven (7) calendar
              days of purchase, you may request a full refund of that pack.
            </li>
            <li>
              <strong className="text-ink">Partially used packs:</strong> Once scans
              from a prepaid pack have been used, the pack is generally
              non-refundable except for billing errors.
            </li>
            <li>
              <strong className="text-ink">Duplicate or erroneous charges:</strong>{" "}
              We will refund mistaken or duplicate Enterprise pack payments.
            </li>
          </ul>
          <p>
            Unused prepaid credits remain in your wallet and do not expire while your
            account is active, unless otherwise stated at purchase.
          </p>
        </Section>

        <Section title="Non-refundable cases">
          <p>Refunds are generally not provided when:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              You cancel a Pro subscription midway through an active billing period
              (access continues until period end)
            </li>
            <li>
              You change between monthly and yearly billing mid-cycle without a
              qualifying reason above
            </li>
            <li>
              Enterprise prepaid scans have already been consumed from the pack in
              question
            </li>
            <li>
              Free-plan scan limits were already consumed before upgrading
            </li>
            <li>
              The refund request is made more than 7 days after the initial
              purchase, except for billing errors
            </li>
          </ul>
        </Section>

        <Section title="How to request a refund">
          <p>
            Email{" "}
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.contactEmail}
            </a>{" "}
            with your account username, the email used at checkout, payment date,
            plan type (Pro or Enterprise), and a brief description. We aim to respond
            within 2–3 business days.
          </p>
          <p>
            Approved refunds are processed back to your original payment method via
            Razorpay. Depending on your bank or payment provider, funds may take 5–10
            business days to appear.
          </p>
        </Section>

        <Section title="Chargebacks">
          <p>
            If you believe a charge is unauthorized, please contact us first at{" "}
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.contactEmail}
            </a>{" "}
            before initiating a chargeback. We will work with you to resolve the
            issue quickly.
          </p>
        </Section>

        <Section title="Data after cancellation">
          <p>
            If your Pro subscription ends, your account and saved games remain. We
            do not delete your data upon cancellation. Enterprise prepaid credits you
            have already purchased remain in your wallet until used. See our{" "}
            <Link href="/privacy" className="legal-link !text-ink">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="legal-link !text-ink">
              Terms &amp; Conditions
            </Link>{" "}
            for details.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Billing questions or refund requests:{" "}
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.contactEmail}
            </a>
          </p>
        </Section>
      </PolicyShell>
    </>
  );
}
