"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  GraduationCap,
  Sparkles,
  Users,
} from "lucide-react";
import { SignupGuideLayout } from "@/components/auth/SignupGuideLayout";
import { Spinner } from "@/components/ui/Spinner";
import { Feedback } from "@/components/ui/Feedback";
import { friendlyError, readApiError } from "@/lib/friendlyError";
import {
  ONBOARDING_PLAN_CARDS,
  defaultPlanForRole,
  type OnboardingPlanId,
} from "@/lib/onboardingPlans";
import { storePendingUpgrade } from "@/lib/razorpayCheckout";
import {
  USER_ROLES,
  USER_ROLE_META,
  getPlanRecommendationCopy,
  type UserRole,
} from "@/lib/userRoles";

const ROLE_ICONS = {
  learner: GraduationCap,
  coach: Users,
  organizer: Building2,
} as const;

type OnboardingStep = "role" | "plan";

export default function OnboardingClient({ username }: { username: string }) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("role");
  const [role, setRole] = useState<UserRole | null>(null);
  const [plan, setPlan] = useState<OnboardingPlanId | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleRecommendation = role ? getPlanRecommendationCopy(role) : null;
  const recommendedPlanId = role ? defaultPlanForRole(role) : null;

  const selectedCard = ONBOARDING_PLAN_CARDS.find((card) => card.id === plan);

  const planGuide = useMemo(() => {
    if (!roleRecommendation) return null;
    return {
      headline: roleRecommendation.headline,
      copy: roleRecommendation.body,
    };
  }, [roleRecommendation]);

  const continueToPlans = () => {
    if (!role) return;
    setPlan(defaultPlanForRole(role));
    setStep("plan");
    setError(null);
  };

  const finishOnboarding = async () => {
    if (!role || !plan || saving) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, plan }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not save your preferences."));
      }

      if (plan === "monthly" || plan === "yearly") {
        storePendingUpgrade(plan);
        router.replace(`/dashboard?upgrade=${plan}`);
      } else if (plan === "organizer") {
        router.replace("/organizer");
      } else {
        router.replace("/dashboard");
      }

      router.refresh();
    } catch (err) {
      setError(friendlyError(err, "Could not save your preferences."));
      setSaving(false);
    }
  };

  if (step === "role") {
    return (
      <SignupGuideLayout
        step="role"
        guideHeadline={`You're in, ${username}.`}
        guideCopy="Tell us what best describes you — we'll recommend the right plan next."
        showBack={false}
      >
        <div className="space-y-5">
          {error ? <Feedback variant="error">{error}</Feedback> : null}

          <div className="grid gap-2.5">
            {USER_ROLES.map((r) => {
              const meta = USER_ROLE_META[r];
              const Icon = ROLE_ICONS[meta.icon];
              const selected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? "border-ink bg-surface shadow-[var(--shadow-soft)]"
                      : "border-line bg-paper hover:border-line-strong hover:bg-surface/60"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors ${
                      selected
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-surface text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">
                      {meta.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
                      {meta.description}
                    </span>
                  </span>
                  {selected ? (
                    <Check className="mt-1 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!role}
            onClick={continueToPlans}
            className="btn-primary btn-md w-full"
          >
            Continue to plans
          </button>
        </div>
      </SignupGuideLayout>
    );
  }

  return (
    <SignupGuideLayout
      step="plan"
      contentWidth="wide"
      guideHeadline={planGuide?.headline ?? `Almost done, ${username}.`}
      guideCopy={planGuide?.copy}
      showBack={false}
      footer={
        <button
          type="button"
          onClick={() => {
            setStep("role");
            setError(null);
          }}
          className="text-[13px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer"
        >
          Back to what describes you
        </button>
      }
    >
      <div className="space-y-5 lg:space-y-8">
        {error ? <Feedback variant="error">{error}</Feedback> : null}

        {role && roleRecommendation ? (
          <p className="rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted lg:hidden">
            <span className="font-semibold text-ink">{USER_ROLE_META[role].label}</span>
            {" · "}
            {roleRecommendation.body}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
          {ONBOARDING_PLAN_CARDS.map((card) => {
            const selected = plan === card.id;
            const isRecommended =
              card.id === recommendedPlanId || (card.recommended && role === "organizer");
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setPlan(card.id)}
                className={`group relative flex h-full flex-col rounded-xl border p-4 text-left transition-all sm:p-5 lg:rounded-2xl lg:p-6 ${
                  selected
                    ? "border-ink bg-surface shadow-[var(--shadow-soft)] ring-1 ring-ink/10"
                    : isRecommended
                      ? "border-ink/30 bg-surface/80 hover:border-ink/50 hover:bg-surface hover:shadow-[var(--shadow-soft)]"
                      : "border-line bg-paper hover:border-line-strong hover:bg-surface/60 hover:shadow-[var(--shadow-soft)]"
                }`}
              >
                {isRecommended ? (
                  <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full border border-ink bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Recommended
                  </span>
                ) : null}

                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-[14px] font-semibold text-ink lg:text-[15px]">
                      {card.title}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-muted lg:text-[13px]">
                      {card.tagline}
                    </span>
                  </span>
                  {selected ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
                  ) : null}
                </span>

                <span className="mt-4 flex items-baseline gap-1 lg:mt-5">
                  <span className="text-[1.35rem] font-semibold tracking-tight text-ink lg:text-[1.6rem]">
                    {card.price}
                  </span>
                  {card.priceSuffix ? (
                    <span className="text-[12px] text-muted lg:text-[13px]">
                      {card.priceSuffix}
                    </span>
                  ) : null}
                </span>

                <ul className="mt-3 space-y-1.5 lg:mt-4 lg:space-y-2">
                  {card.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-[12px] leading-relaxed text-muted lg:text-[13px]"
                    >
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="lg:flex lg:items-center lg:justify-between lg:gap-6 lg:border-t lg:border-line lg:pt-6">
          <p className="hidden max-w-md text-[12px] leading-relaxed text-muted-2 lg:block">
            Free stays on free features only. Paid plans open secure Razorpay checkout after you
            continue.
          </p>
          <button
            type="button"
            disabled={!plan || saving}
            onClick={finishOnboarding}
            className="btn-primary btn-md w-full lg:min-w-[220px] lg:w-auto lg:px-8"
          >
            {saving ? (
              <>
                <Spinner size={15} /> Saving…
              </>
            ) : (
              selectedCard?.cta ?? "Continue"
            )}
          </button>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted-2 lg:hidden">
          Free stays on free features only. Paid plans open secure Razorpay checkout after you
          continue.
        </p>
      </div>
    </SignupGuideLayout>
  );
}
