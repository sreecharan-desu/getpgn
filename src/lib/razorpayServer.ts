import Razorpay from 'razorpay';
import { isValidPlanId } from '@/lib/razorpaySubscriptions';

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  mode: 'live' | 'test';
};

/** User-facing copy — never mention env vars, Vercel, or key names. */
export const PAYMENTS_UNAVAILABLE =
  "Payments aren't available right now. Please try again later.";
export const CHECKOUT_FAILED =
  "We couldn't start checkout. Please try again in a few minutes.";
export const PLAN_UNAVAILABLE =
  "This plan isn't available right now. Please try again later.";

/** Strip whitespace and accidental wrapping quotes from pasted env values. */
export function sanitizeEnv(value: string | undefined): string {
  if (!value) return '';
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  const flag = sanitizeEnv(value).toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

/** When true, rzp_test_ keys work even under NODE_ENV=production (local prod builds). */
export function isRazorpayTestModeAllowed(): boolean {
  return isTruthyEnvFlag(process.env.RAZORPAY_ALLOW_TEST_KEYS);
}

export function readRazorpayConfig():
  | { ok: true; config: RazorpayConfig }
  | { ok: false; error: string } {
  const keyId = sanitizeEnv(process.env.RAZORPAY_KEY_ID);
  const keySecret = sanitizeEnv(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    console.error('[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.');
    return { ok: false, error: PAYMENTS_UNAVAILABLE };
  }

  let mode: 'live' | 'test' | null = null;
  if (keyId.startsWith('rzp_live_')) mode = 'live';
  else if (keyId.startsWith('rzp_test_')) mode = 'test';

  if (!mode) {
    console.error('[Razorpay] RAZORPAY_KEY_ID has an invalid prefix.');
    return { ok: false, error: PAYMENTS_UNAVAILABLE };
  }

  if (isProductionDeploy() && mode === 'test' && !isRazorpayTestModeAllowed()) {
    console.error(
      '[Razorpay] Production deploy is using test keys. Set RAZORPAY_ALLOW_TEST_KEYS=true to override.',
    );
    return { ok: false, error: PAYMENTS_UNAVAILABLE };
  }

  if (isProductionDeploy() && mode === 'test' && isRazorpayTestModeAllowed()) {
    console.warn('[Razorpay] Test keys active in production build — no real charges.');
  }

  if (keySecret.length < 24) {
    console.error('[Razorpay] RAZORPAY_KEY_SECRET looks truncated.');
    return { ok: false, error: PAYMENTS_UNAVAILABLE };
  }

  return { ok: true, config: { keyId, keySecret, mode } };
}

export function getRazorpayPlanId(
  planType: 'monthly' | 'yearly' | 'enterprise',
): string | null {
  const envKey =
    planType === 'monthly'
      ? 'RAZORPAY_MONTHLY_PLAN_ID'
      : planType === 'yearly'
        ? 'RAZORPAY_YEARLY_PLAN_ID'
        : 'RAZORPAY_ENTERPRISE_PLAN_ID';
  const planId = sanitizeEnv(process.env[envKey]);

  if (!planId || planId.includes('placeholder')) return null;
  if (!isValidPlanId(planId)) {
    console.error(`[Razorpay] Invalid plan id format for ${planType}: ${planId}`);
    return null;
  }
  return planId;
}

export function createRazorpayClient(config: RazorpayConfig): Razorpay {
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

/** Diagnostics for server logs only — never logs secrets. */
export function logRazorpayDiagnostics(planType?: string, context?: string): void {
  const keyId = sanitizeEnv(process.env.RAZORPAY_KEY_ID);
  const secret = sanitizeEnv(process.env.RAZORPAY_KEY_SECRET);
  const monthly = sanitizeEnv(process.env.RAZORPAY_MONTHLY_PLAN_ID);
  const yearly = sanitizeEnv(process.env.RAZORPAY_YEARLY_PLAN_ID);

  console.error('[Razorpay] Config snapshot:', {
    context: context ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? 'local',
    keyIdPrefix: keyId ? `${keyId.slice(0, 12)}…` : '(missing)',
    keyMode: keyId.startsWith('rzp_live_')
      ? 'live'
      : keyId.startsWith('rzp_test_')
        ? 'test'
        : 'invalid',
    secretLength: secret.length,
    monthlyPlanSet: Boolean(monthly),
    yearlyPlanSet: Boolean(yearly),
    requestedPlan: planType ?? null,
    requestedPlanId: planType ? getRazorpayPlanId(planType as 'monthly' | 'yearly')?.slice(0, 8) : null,
  });
}

/** Map Razorpay SDK errors to safe client responses. */
export function mapRazorpayError(error: unknown, planType?: string): { status: number; message: string } {
  const err = error as {
    statusCode?: number;
    error?: { description?: string; code?: string };
    message?: string;
  };

  const code = err?.statusCode ?? 500;
  const description = err?.error?.description ?? err?.message ?? '';

  if (code === 401) {
    logRazorpayDiagnostics(planType, 'authentication_failed');
    return { status: 503, message: CHECKOUT_FAILED };
  }

  if (code === 400 && description.toLowerCase().includes('plan')) {
    logRazorpayDiagnostics(planType, 'plan_not_found');
    return { status: 503, message: PLAN_UNAVAILABLE };
  }

  const lower = description.toLowerCase();
  if (
    lower.includes('recurring') &&
    (lower.includes('not enabled') || lower.includes('does not support'))
  ) {
    logRazorpayDiagnostics(planType, 'recurring_not_enabled');
    return {
      status: 503,
      message:
        "Recurring payments aren't enabled on this account yet. Contact Razorpay support to enable Subscriptions and card mandates.",
    };
  }

  console.error('[Razorpay] Checkout error:', { statusCode: code, description });
  return { status: 502, message: CHECKOUT_FAILED };
}
