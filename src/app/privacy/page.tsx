import type { Metadata } from "next";
import Link from "next/link";
import { PolicyShell } from "@/components/legal/PolicyShell";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How GetPGN collects, stores, and protects your chess scoresheets, game data, and account information. We never sell or share your data.",
  alternates: { canonical: `${LEGAL.siteUrl}/privacy` },
  openGraph: {
    title: "Privacy Policy · GetPGN",
    description:
      "How GetPGN handles your scoresheets and account data. Stored securely, never sold or shared.",
    url: `${LEGAL.siteUrl}/privacy`,
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

export default function PrivacyPolicyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy",
    description: metadata.description,
    url: `${LEGAL.siteUrl}/privacy`,
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
        title="Privacy Policy"
        description={`Last updated ${LEGAL.lastUpdated}. This policy explains what we collect, how we store it, and our commitment to never sell or share your personal data.`}
      >
        <Section title="Our commitment">
          <p>
            {LEGAL.siteName} helps you digitize handwritten chess scoresheets
            into validated PGN files. We treat your scoresheets, extracted moves,
            and saved games as private data belonging to you. We do not sell
            your information, and we do not share it with advertisers, data
            brokers, or unrelated third parties.
          </p>
        </Section>

        <Section title="Information we collect">
          <p>
            <strong className="text-ink">Account information:</strong> When you
            create an account, we store your username, email address, and
            authentication credentials (passwords are hashed — we never store
            plain-text passwords).
          </p>
          <p>
            <strong className="text-ink">Scoresheet images:</strong> Photos you
            upload for digitization are processed to extract chess moves. Images
            may be temporarily held in memory during processing.
          </p>
          <p>
            <strong className="text-ink">Game data:</strong> For Pro users, we
            store your saved games, move lists, PGN output, and optional
            shareable replay links in our database.
          </p>
          <p>
            <strong className="text-ink">Usage data:</strong> We may record
            basic usage metrics (such as scan counts on the free plan) to enforce
            plan limits and improve the product.
          </p>
          <p>
            <strong className="text-ink">Payment information:</strong>{" "}
            Subscriptions are processed by{" "}
            <a
              href="https://razorpay.com"
              className="legal-link !text-ink"
              rel="noopener noreferrer"
              target="_blank"
            >
              Razorpay
            </a>
            . We do not store your full card or UPI details on our servers.
            Razorpay handles payment data under their own privacy policy.
          </p>
        </Section>

        <Section title="How your data is stored">
          <p>
            Account and game data are stored in encrypted databases hosted on
            secure cloud infrastructure. Access is restricted to authenticated
            systems required to operate the service. Saved games are tied to your
            user account and are not publicly visible unless you explicitly
            create and enable a share link.
          </p>
          <p>
            We use industry-standard security practices including HTTPS for all
            connections, hashed passwords, and server-side access controls.
          </p>
        </Section>

        <Section title="How we use your data">
          <p>We use your information only to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Provide scoresheet digitization and move validation</li>
            <li>Save and replay your games (Pro plan)</li>
            <li>Authenticate your account and manage subscriptions</li>
            <li>Respond to support requests and improve reliability</li>
          </ul>
          <p>
            We do not use your scoresheets or game content to train unrelated
            third-party models for advertising, and we do not sell your data to
            anyone.
          </p>
        </Section>

        <Section title="Sharing and disclosure">
          <p>
            We do not share, rent, or sell your personal data or game content
            with third parties for marketing purposes. We may disclose information
            only when:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Required by law, regulation, or valid legal process
            </li>
            <li>
              Necessary to process payments through Razorpay (payment processor
              only)
            </li>
            <li>
              You explicitly enable a public share link for a specific saved game
            </li>
            <li>
              Needed to protect the security or integrity of the service
            </li>
          </ul>
        </Section>

        <Section title="Data retention and deletion">
          <p>
            Your account data is retained while your account is active. Saved
            games remain until you delete them or close your account. You may
            delete individual games from your library at any time. To request
            account deletion, contact us at{" "}
            <a
              href={`mailto:${LEGAL.privacyEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.privacyEmail}
            </a>
            .
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You may access, correct, or delete your account data by using in-app
            controls or contacting us. If you are in a jurisdiction with
            additional privacy rights (such as GDPR), you may request access,
            correction, deletion, or portability of your personal data by
            emailing{" "}
            <a
              href={`mailto:${LEGAL.privacyEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.privacyEmail}
            </a>
            .
          </p>
        </Section>

        <Section title="Cookies and local storage">
          <p>
            We use essential cookies and browser local storage for session
            authentication, theme preferences, and in-progress workspace state.
            We do not use third-party advertising trackers.
          </p>
        </Section>

        <Section title="Children">
          <p>
            {LEGAL.siteName} is not directed at children under 13. We do not
            knowingly collect personal information from children.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. The &quot;Last
            updated&quot; date at the top will reflect changes. Continued use of
            the service after updates constitutes acceptance of the revised
            policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy? Email{" "}
            <a
              href={`mailto:${LEGAL.privacyEmail}`}
              className="legal-link !text-ink"
            >
              {LEGAL.privacyEmail}
            </a>
            . See also our{" "}
            <Link
              href="/refund"
              className="legal-link !text-ink"
            >
              Refund &amp; Cancellation Policy
            </Link>
            .
          </p>
        </Section>
      </PolicyShell>
    </>
  );
}
