import Razorpay from 'razorpay';

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  mode: 'live' | 'test';
};

/** Strip whitespace and accidental wrapping quotes from Vercel-pasted values. */
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

export function readRazorpayConfig():
  | { ok: true; config: RazorpayConfig }
  | { ok: false; error: string } {
  const keyId = sanitizeEnv(process.env.RAZORPAY_KEY_ID);
  const keySecret = sanitizeEnv(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    return {
      ok: false,
      error: isProductionDeploy()
        ? 'Razorpay is not configured on this deployment. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel → Production environment variables, then redeploy.'
        : 'Razorpay keys are not configured.',
    };
  }

  let mode: 'live' | 'test' | null = null;
  if (keyId.startsWith('rzp_live_')) mode = 'live';
  else if (keyId.startsWith('rzp_test_')) mode = 'test';

  if (!mode) {
    return {
      ok: false,
      error:
        'RAZORPAY_KEY_ID must start with rzp_live_ (production) or rzp_test_ (local sandbox).',
    };
  }

  if (isProductionDeploy() && mode === 'test') {
    return {
      ok: false,
      error:
        'This deployment uses Razorpay test keys. In Vercel, set live keys (rzp_live_…) under Production environment variables — local .env is not used in prod.',
    };
  }

  if (keySecret.length < 24) {
    return {
      ok: false,
      error:
        'RAZORPAY_KEY_SECRET looks truncated. Regenerate the secret in Razorpay Dashboard and paste the full value into Vercel (Production).',
    };
  }

  return { ok: true, config: { keyId, keySecret, mode } };
}

export function getRazorpayPlanId(planType: 'monthly' | 'yearly'): string | null {
  const planId = sanitizeEnv(
    planType === 'monthly'
      ? process.env.RAZORPAY_MONTHLY_PLAN_ID
      : process.env.RAZORPAY_YEARLY_PLAN_ID,
  );

  if (!planId || planId.includes('placeholder')) return null;
  return planId;
}

export function createRazorpayClient(config: RazorpayConfig): Razorpay {
  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

/** Safe diagnostics for Vercel logs — never logs secrets. */
export function logRazorpayDiagnostics(planType?: string): void {
  const keyId = sanitizeEnv(process.env.RAZORPAY_KEY_ID);
  const secret = sanitizeEnv(process.env.RAZORPAY_KEY_SECRET);
  const monthly = sanitizeEnv(process.env.RAZORPAY_MONTHLY_PLAN_ID);
  const yearly = sanitizeEnv(process.env.RAZORPAY_YEARLY_PLAN_ID);

  console.error('[Razorpay] Config snapshot (prod debug):', {
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
  const description = err?.error?.description ?? err?.message ?? 'Payment provider error.';

  if (code === 401) {
    logRazorpayDiagnostics(planType);
    return {
      status: 503,
      message: isProductionDeploy()
        ? 'Payment authentication failed on production. In Vercel → Production env vars, set matching live Razorpay Key ID + Secret and live plan IDs, then redeploy.'
        : 'Payment provider authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.',
    };
  }

  if (code === 400 && description.toLowerCase().includes('plan')) {
    logRazorpayDiagnostics(planType);
    return {
      status: 503,
      message:
        'Subscription plan not found for this Razorpay mode. Create plans in Live mode and set RAZORPAY_MONTHLY_PLAN_ID / RAZORPAY_YEARLY_PLAN_ID on Vercel Production.',
    };
  }

  return { status: 502, message: description };
}
