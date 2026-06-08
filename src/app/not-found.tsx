import Link from "next/link";
import { StatusShell } from "@/components/ui/StatusShell";

export default function NotFound() {
  return (
    <StatusShell
      eyebrow="404"
      title="This page isn't on the board"
      subtitle="The link may be broken, or the page may have been moved. Head home or open your dashboard to keep playing."
      actions={
        <>
          <Link href="/" className="btn-primary btn-md w-full sm:w-auto sm:min-w-[9.5rem]">
            Back to home
          </Link>
          <Link href="/dashboard" className="btn-secondary btn-md w-full sm:w-auto sm:min-w-[9.5rem]">
            Open dashboard
          </Link>
        </>
      }
    />
  );
}
