export const USER_ROLES = ["learner", "coach", "organizer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type RecommendedPlanId = "free" | "monthly" | "yearly" | "enterprise";

export const USER_ROLE_META: Record<
  UserRole,
  { label: string; description: string; icon: "learner" | "coach" | "organizer" }
> = {
  learner: {
    label: "Player / learner",
    description: "I play tournaments and want clean, validated PGNs from my scoresheets.",
    icon: "learner",
  },
  coach: {
    label: "Coach",
    description: "I teach students and review games with a saved library and share links.",
    icon: "coach",
  },
  organizer: {
    label: "Enterprise / organization",
    description:
      "I run tournaments and need pay-as-you-go scan packs plus a public game library.",
    icon: "organizer",
  },
};

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function getRecommendedPlan(role: UserRole): RecommendedPlanId {
  switch (role) {
    case "learner":
      return "free";
    case "coach":
      return "yearly";
    case "organizer":
      return "enterprise";
  }
}

export function getPlanRecommendationCopy(role: UserRole): {
  headline: string;
  body: string;
  primaryPlan: RecommendedPlanId;
  secondaryPlan?: RecommendedPlanId;
} {
  switch (role) {
    case "learner":
      return {
        headline: "Start free — upgrade when you need more",
        body: "Your 2 free scans are perfect for trying GetPGN. Go Pro monthly when you digitize every week.",
        primaryPlan: "free",
        secondaryPlan: "monthly",
      };
    case "coach":
      return {
        headline: "Pro Yearly fits coaches best",
        body: "Save games for every student, share interactive replays, and get 1,000 scans per year.",
        primaryPlan: "yearly",
        secondaryPlan: "monthly",
      };
    case "organizer":
      return {
        headline: "Enterprise — pay-as-you-go",
        body: "From ₹4,000 for a 4,000-scan starter pack. Buy any volume you need and publish a public library.",
        primaryPlan: "enterprise",
        secondaryPlan: "yearly",
      };
  }
}
