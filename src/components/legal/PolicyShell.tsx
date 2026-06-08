import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { PolicyFooter } from "./PolicyFooter";

interface PolicyShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PolicyShell({ title, description, children }: PolicyShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="group/logo -ml-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
            aria-label="GetPGN home"
          >
            <Logo wordmarkSize="md" />
          </Link>
          <Link
            href="/"
            className="text-[12px] font-medium text-muted transition-colors hover:text-ink"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
          <header className="mb-10 border-b border-line pb-8">
            <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
              {description}
            </p>
          </header>

          <div className="policy-prose space-y-6 text-[14px] leading-[1.7] text-ink/90">
            {children}
          </div>
        </article>
      </main>

      <PolicyFooter />
    </div>
  );
}
