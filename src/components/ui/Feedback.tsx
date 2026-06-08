import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Variant = "error" | "success" | "info";

const styles: Record<Variant, { wrap: string; icon: React.ReactNode }> = {
  error: {
    wrap: "border-[#fbcfe3] bg-danger-bg text-danger",
    icon: <AlertCircle className="h-4 w-4 shrink-0" />,
  },
  success: {
    wrap: "border-[#bbf7d0] bg-positive-bg text-positive",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  },
  info: {
    wrap: "border-line-strong bg-surface text-ink",
    icon: <Info className="h-4 w-4 shrink-0 text-muted" />,
  },
};

interface FeedbackProps {
  variant: Variant;
  children: React.ReactNode;
}

/** Consistent inline form feedback banner. */
export const Feedback: React.FC<FeedbackProps> = ({ variant, children }) => {
  const s = styles[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`gp-fade-in flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] leading-relaxed ${s.wrap}`}
    >
      <span className="mt-px">{s.icon}</span>
      <span>{children}</span>
    </div>
  );
};

export default Feedback;
