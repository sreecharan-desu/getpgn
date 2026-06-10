#!/usr/bin/env node
/**
 * Probe whether Razorpay pause/resume is enabled for this key pair.
 *
 * Razorpay has no "feature flags" API. We infer availability from API errors:
 * - "feature is not enabled" → account does not have pause/resume
 * - state errors (e.g. "only ... active state") → feature is enabled
 *
 * Safe: only probes subscriptions in `created` or `paused` state — never
 * touches `active` subscriptions.
 *
 * Usage:
 *   node --env-file=.env scripts/check-razorpay-pause-resume.mjs
 */
import Razorpay from 'razorpay';

function sanitize(value) {
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

function classifyProbe(description, action) {
  const lower = description.toLowerCase();

  if (lower.includes('feature is not enabled')) {
    return { enabled: false, reason: description };
  }

  if (
    action === 'pause' &&
    (lower.includes('active') || lower.includes('created state') || lower.includes('authenticated'))
  ) {
    return { enabled: true, reason: 'Pause API is enabled (subscription state validation failed as expected).' };
  }

  if (action === 'resume') {
    if (lower.includes('paused')) {
      return { enabled: true, reason: 'Resume API is enabled (subscription state validation failed as expected).' };
    }
    if (lower.includes('not enabled') || lower.includes('cannot be resumed')) {
      return { enabled: false, reason: description };
    }
  }

  return { enabled: null, reason: description };
}

async function probe(razorpay, label, action, subscriptionId) {
  try {
    const result =
      action === 'pause'
        ? await razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' })
        : await razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });

    console.log(`[${label}] Unexpected success on ${subscriptionId}: status=${result?.status}`);
    return { enabled: true, reason: `Subscription ${action} succeeded (status: ${result?.status}).` };
  } catch (error) {
    const description = error?.error?.description ?? error?.message ?? String(error);
    const code = error?.statusCode ?? error?.status ?? 'unknown';
    const verdict = classifyProbe(description, action);
    console.log(`[${label}] HTTP ${code}: ${description}`);
    return verdict;
  }
}

const keyId = sanitize(process.env.RAZORPAY_KEY_ID);
const keySecret = sanitize(process.env.RAZORPAY_KEY_SECRET);

if (!keyId || !keySecret) {
  console.error('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  process.exit(1);
}

const mode = keyId.startsWith('rzp_live_') ? 'live' : keyId.startsWith('rzp_test_') ? 'test' : 'unknown';
console.log(`Razorpay key mode: ${mode} (${keyId.slice(0, 12)}…)\n`);

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

let subs = [];
try {
  const list = await razorpay.subscriptions.all({ count: 50 });
  subs = list.items ?? [];
} catch (error) {
  const description = error?.error?.description ?? error?.message ?? String(error);
  console.error('Could not list subscriptions:', description);
  process.exit(1);
}

console.log(
  'Subscription sample:',
  subs.length
    ? subs.map((s) => `${s.id}:${s.status}`).join(', ')
    : '(none — create a subscription link first to probe safely)',
);

const created = subs.find((s) => s.status === 'created');
const paused = subs.find((s) => s.status === 'paused');

let pauseResult = { enabled: null, reason: 'No `created` subscription to probe. Create a test subscription link (do not pay) and re-run.' };
if (created) {
  console.log(`\nProbing pause on created subscription ${created.id} (non-destructive)…`);
  pauseResult = await probe(razorpay, 'pause', 'pause', created.id);
}

let resumeResult = { enabled: null, reason: 'No `paused` subscription to probe resume.' };
if (paused) {
  console.log(`\nProbing resume on paused subscription ${paused.id}…`);
  resumeResult = await probe(razorpay, 'resume', 'resume', paused.id);
}

console.log('\n--- Result ---');
console.log('Pause:', formatVerdict(pauseResult));
console.log('Resume:', formatVerdict(resumeResult));

if (pauseResult.enabled === true && resumeResult.enabled !== false) {
  console.log('\nPause/resume appears available. You can uncomment the dashboard UI.');
} else if (pauseResult.enabled === false) {
  console.log('\nPause is not enabled on this Razorpay account. Contact Razorpay support.');
} else {
  console.log('\nInconclusive — see messages above.');
}

function formatVerdict({ enabled, reason }) {
  if (enabled === true) return `ENABLED — ${reason}`;
  if (enabled === false) return `DISABLED — ${reason}`;
  return `UNKNOWN — ${reason}`;
}
