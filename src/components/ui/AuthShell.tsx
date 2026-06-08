import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "./Logo";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  title,
  subtitle,
  children,
  footer,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm gp-fade-up">
          <div className="mb-7 text-center">
            <Logo size={28} tile className="mx-auto mb-5" showWordmark />
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {children}
          {footer && (
            <div className="mt-6 border-t border-line pt-5 text-center text-[13px] text-muted">
              {footer}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-line py-5 text-center">
        <p className="text-[12px] text-muted-2">
          © {new Date().getFullYear()} GetPGN — Chess scoresheet digitizer
        </p>
      </footer>
    </div>
  );
};

export default AuthShell;
