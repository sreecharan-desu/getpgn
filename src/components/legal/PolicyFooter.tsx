import Link from "next/link";
import { LEGAL } from "@/lib/legal";

type LegalLinkProps = {
  href: string;
  children: React.ReactNode;
  onDark?: boolean;
};

export function LegalLink({ href, children, onDark = false }: LegalLinkProps) {
  return (
    <Link
      href={href}
      className={onDark ? "legal-link legal-link--on-dark" : "legal-link"}
    >
      {children}
    </Link>
  );
}

export function PolicyFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-8 sm:px-8">
        <p className="max-w-2xl text-[12px] leading-relaxed text-muted">
          Your scoresheets and saved games are stored securely in your private
          account. We do not sell your data and we do not share it with
          advertisers or unrelated third parties.
        </p>
        <nav
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]"
          aria-label="Legal"
        >
          <LegalLink href="/privacy">Privacy Policy</LegalLink>
          <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>
          <LegalLink href="/refund">Refund &amp; Cancellation</LegalLink>
          <a href={`mailto:${LEGAL.contactEmail}`} className="legal-link">
            Contact
          </a>
        </nav>
        <p className="text-[11px] text-muted">
          Built by Chess Coaches. Powered by ABCChess Education LLP.
        </p>
        <p className="text-[11px] text-muted-2">
          © {new Date().getFullYear()} {LEGAL.siteName} · Chess scoresheet digitizer
        </p>
      </div>
    </footer>
  );
}

/** Compact trust line + policy links for app footers. */
export function LegalTrustLinks({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12px] leading-relaxed text-muted ${className}`}>
      Your data stays in your account — never sold or shared with third parties.{" "}
      <LegalLink href="/privacy">Privacy</LegalLink>
      {" · "}
      <LegalLink href="/terms">Terms</LegalLink>
      {" · "}
      <LegalLink href="/refund">Refunds</LegalLink>
    </p>
  );
}
