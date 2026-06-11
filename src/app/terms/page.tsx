import type { Metadata } from "next";
import Link from "next/link";
import { PolicyShell } from "@/components/legal/PolicyShell";
import { LEGAL } from "@/lib/legal";
import { termsMetadata } from "@/lib/og/pages";
import { PRICING_DISPLAY, formatInr } from "@/lib/pricingDisplay";
import {
  ORGANIZER_MIN_SCANS,
  calculateOrganizerAmount,
  formatOrganizerInr,
} from "@/lib/organizerPricing";

export const metadata: Metadata = termsMetadata();

const { monthly, yearly } = PRICING_DISPLAY;
const organizerBaseInr = calculateOrganizerAmount(ORGANIZER_MIN_SCANS);

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

export default function TermsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms & Conditions",
    description: metadata.description,
    url: `${LEGAL.siteUrl}/terms`,
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
        title="Terms & Conditions"
        description={`Last updated ${LEGAL.lastUpdated}. By using ${LEGAL.siteName}, you agree to these terms.`}
      >
        <Section title="Agreement">
          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of{" "}
            {LEGAL.siteName} ({LEGAL.siteUrl}), operated by {LEGAL.entityName}.
            By creating an account or using the service, you agree to these Terms,
            our{" "}
            <Link href="/privacy" className="legal-link !text-ink">
              Privacy Policy
            </Link>
            , and our{" "}
            <Link href="/refund" className="legal-link !text-ink">
              Refund &amp; Cancellation Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="The service">
          <p>
            {LEGAL.siteName} digitizes handwritten chess scoresheets into validated
            PGN notation using AI-assisted extraction and browser-based move
            validation. Features available to you depend on the plan you choose.
          </p>
        </Section>

        <Section title="Plans and features">
          <p>
            <strong className="text-ink">Free:</strong> Includes 2 lifetime
            scoresheet scans, move validation, and session PGN export. Does not
            include a permanent cloud library, shareable replay links, board color
            themes, or Enterprise library publishing features.
          </p>
          <p>
            <strong className="text-ink">Pro · Monthly:</strong>{" "}
            {formatInr(monthly.priceInr)}/month for up to {monthly.scanLimit}{" "}
            scans per calendar month, plus Pro features (cloud library, shareable
            replays, board themes, and priority validation). Billed as a recurring
            subscription until cancelled.
          </p>
          <p>
            <strong className="text-ink">Pro · Yearly:</strong>{" "}
            {formatInr(yearly.priceInr)}/year for up to{" "}
            {yearly.scanLimit.toLocaleString("en-IN")} scans per subscription year,
            plus the same Pro features. Billed as a recurring subscription until
            cancelled.
          </p>
          <p>
            <strong className="text-ink">Enterprise (pay-as-you-go):</strong>{" "}
            Prepaid scan credits purchased in one-time packs (from{" "}
            {formatOrganizerInr(organizerBaseInr)} for a minimum of{" "}
            {ORGANIZER_MIN_SCANS.toLocaleString("en-IN")} scans). Credits are drawn
            from your wallet as you scan. Top-ups may be purchased at any time.
            Includes Enterprise library publishing and public library sharing when
            you have an active prepaid balance or completed purchase history as
            described in the product.
          </p>
          <p>
            Scan limits, pricing, and included features may change with notice; the
            prices shown at checkout or on our pricing page at the time of purchase
            apply to your transaction.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            You must provide accurate registration information and keep your
            credentials secure. You are responsible for activity under your
            account. One person or organization should not share login credentials
            across unrelated users.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            Paid subscriptions and Enterprise pay-as-you-go packs are processed by{" "}
            <a
              href="https://razorpay.com"
              className="legal-link !text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              Razorpay
            </a>
            . {LEGAL.siteName} does not store your full card or UPI credentials.
            Subscription renewals and prepaid purchases are subject to Razorpay&apos;s
            terms and applicable Indian payment regulations.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            You retain ownership of scoresheet images, extracted games, and PGN
            output you create. You grant {LEGAL.siteName} a limited license to
            process, store, and display your content solely to operate the service
            (for example, saving games to your library or rendering a share link you
            enable).
          </p>
          <p>
            If you publish games to a public Enterprise library, you confirm you have
            the right to share that content and understand that viewers with the
            library link may browse those games.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Use the service for unlawful purposes or to infringe others&apos; rights</li>
            <li>Attempt to bypass scan limits, billing, or security controls</li>
            <li>Upload malware, abusive content, or material you do not have rights to process</li>
            <li>Reverse engineer or scrape the service in ways that harm availability</li>
          </ul>
          <p>
            We may suspend or terminate accounts that violate these Terms or pose a
            security risk.
          </p>
        </Section>

        <Section title="Availability and changes">
          <p>
            We strive for reliable uptime but do not guarantee uninterrupted
            service. AI extraction may occasionally misread handwriting; you are
            responsible for reviewing moves before export. We may update features,
            limits, or these Terms. Material changes will be reflected in the
            &quot;Last updated&quot; date.
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>
            The service is provided &quot;as is&quot; to the fullest extent permitted by
            law. {LEGAL.siteName} is a digitization tool, not a substitute for
            official tournament reporting systems unless your organizer explicitly
            adopts it as such.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, {LEGAL.entityName} is not liable
            for indirect, incidental, or consequential damages arising from use of
            the service. Our total liability for any claim related to the service is
            limited to the amount you paid {LEGAL.siteName} in the twelve (12) months
            before the claim.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms:{" "}
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.contactEmail}
            </a>
            . Enterprise or high-volume organizer inquiries:{" "}
            <a
              href={`mailto:${LEGAL.enterpriseContactEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.enterpriseContactEmail}
            </a>
            .
          </p>
        </Section>
      </PolicyShell>
    </>
  );
}
