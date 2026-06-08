import type { Metadata } from "next";
import Link from "next/link";
import { PolicyShell } from "@/components/legal/PolicyShell";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "GetPGN Pro subscription refund and cancellation terms. Clear, fair policies for monthly and yearly plans processed via Razorpay.",
  alternates: { canonical: `${LEGAL.siteUrl}/refund` },
  openGraph: {
    title: "Refund & Cancellation Policy · GetPGN",
    description:
      "Refund and cancellation terms for GetPGN Pro subscriptions.",
    url: `${LEGAL.siteUrl}/refund`,
    siteName: LEGAL.siteName,
    type: "website",
  },
  robots: { index: true, follow: true },
};

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
    dateModified: "2026-06-08",
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
        description={`Last updated ${LEGAL.lastUpdated}. Fair and transparent terms for GetPGN Pro subscriptions, processed securely via Razorpay.`}
      >
        <Section title="Overview">
          <p>
            {LEGAL.siteName} offers a free plan with limited scans and a paid
            Pro plan with unlimited digitizing, cloud game library, and
            shareable replays. This policy explains how cancellations and
            refunds work for Pro subscriptions.
          </p>
        </Section>

        <Section title="Plans and billing">
          <p>
            <strong className="text-ink">Pro · Monthly:</strong> Billed every
            month. Renews automatically until cancelled.
          </p>
          <p>
            <strong className="text-ink">Pro · Yearly:</strong> Billed once per
            year. Renews automatically until cancelled.
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

        <Section title="Cancellation">
          <p>
            You may cancel your Pro subscription at any time from your account
            billing settings. When you cancel:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Your Pro access continues until the end of the current billing
              period you have already paid for
            </li>
            <li>
              Auto-renewal is stopped — you will not be charged again unless you
              resubscribe
            </li>
            <li>
              Your saved games remain in your account; free-plan limits apply
              after the paid period ends
            </li>
          </ul>
          <p>
            Cancellation takes effect at the end of the current billing cycle,
            not immediately, unless otherwise required by applicable law.
          </p>
        </Section>

        <Section title="Refund eligibility">
          <p>
            We want you to be satisfied with {LEGAL.siteName}. Refunds may be
            issued in the following cases:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Within 7 days of first purchase:</strong>{" "}
              If Pro does not meet your expectations, contact us within seven
              (7) calendar days of your initial subscription payment for a full
              refund.
            </li>
            <li>
              <strong className="text-ink">Duplicate or erroneous charges:</strong>{" "}
              If you were charged twice or billed in error, we will refund the
              duplicate amount promptly.
            </li>
            <li>
              <strong className="text-ink">Extended service outage:</strong>{" "}
              If a verified platform outage prevented meaningful use of paid
              features for an extended period, contact us for a proportional
              credit or refund.
            </li>
          </ul>
        </Section>

        <Section title="Non-refundable cases">
          <p>Refunds are generally not provided when:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              You cancel midway through an active billing period (access
              continues until period end)
            </li>
            <li>
              You change from yearly to monthly or vice versa mid-cycle without
              a qualifying reason above
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
            and a brief description of your request. We aim to respond within 2–3
            business days.
          </p>
          <p>
            Approved refunds are processed back to your original payment method
            via Razorpay. Depending on your bank or payment provider, funds may
            take 5–10 business days to appear.
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
            If your subscription ends, your account and saved games remain. We
            do not delete your data upon cancellation. Your scoresheets and
            games stay in your private account and are never sold or shared.
            See our{" "}
            <Link
              href="/privacy"
              className="legal-link !text-ink"
            >
              Privacy Policy
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
