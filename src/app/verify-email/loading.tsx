import { AuthShell } from "@/components/ui/AuthShell";
import { Spinner } from "@/components/ui/Spinner";

export default function VerifyEmailLoading() {
  return (
    <AuthShell
      title="Verify your email"
      subtitle="One quick step before you can start digitizing scoresheets."
    >
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Spinner size={24} />
        <p className="text-[13px] text-muted">Preparing your verification screen…</p>
      </div>
    </AuthShell>
  );
}
