/** Guided signup flow — queen walks users through each gate. */

export const SIGNUP_STEPS = [
  'username',
  'password',
  'email',
  'verify',
  'role',
  'plan',
] as const;

export type SignupGuideStep = (typeof SIGNUP_STEPS)[number];

export const SIGNUP_STEP_INDEX: Record<SignupGuideStep, number> = {
  username: 1,
  password: 2,
  email: 3,
  verify: 4,
  role: 5,
  plan: 6,
};

export const SIGNUP_STEP_TOTAL = SIGNUP_STEPS.length;

export const SIGNUP_GUIDE: Record<
  SignupGuideStep,
  { headline: string; copy: string; title: string; subtitle: string }
> = {
  username: {
    headline: "First, claim your name.",
    copy: "Pick a username you'll recognize every time you sign in. It must be unique across GetPGN.",
    title: "Choose a username",
    subtitle: "Step 1 of 6 — your chess identity",
  },
  password: {
    headline: "Now lock it down.",
    copy: "A strong password keeps your games and library safe. Mix letters, numbers, and symbols.",
    title: "Create a password",
    subtitle: "Step 2 of 6 — keep your account secure",
  },
  email: {
    headline: "Where should we reach you?",
    copy: "We'll send a quick verification link. No spam — just what you need to activate your account.",
    title: "Add your email",
    subtitle: "Step 3 of 6 — one quick verification ahead",
  },
  verify: {
    headline: "Check your inbox.",
    copy: "Tap the link we sent. Then tell us what best describes you and pick a plan.",
    title: "Verify your email",
    subtitle: "Step 4 of 6 — almost there",
  },
  role: {
    headline: "What brings you here?",
    copy: "We'll tailor plan recommendations — player, coach, or enterprise organization.",
    title: "What best describes you?",
    subtitle: "Step 5 of 6 — one quick question",
  },
  plan: {
    headline: "Choose your plan.",
    copy: "Start free or upgrade now. You can change plans anytime from your account.",
    title: "Pick a plan",
    subtitle: "Step 6 of 6 — final step",
  },
};

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  meetsMinimum: boolean;
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Too weak', meetsMinimum: false };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(4, Math.max(0, score - 1)) as PasswordStrength['score'];
  const labels: PasswordStrength['label'][] = [
    'Too weak',
    'Weak',
    'Fair',
    'Strong',
    'Very strong',
  ];

  return {
    score: clamped,
    label: labels[clamped],
    meetsMinimum: password.length >= 8,
  };
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
