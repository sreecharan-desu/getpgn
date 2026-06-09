#!/usr/bin/env node
/**
 * Create GetPGN Pro subscription plans in Razorpay with correct period/interval.
 *
 * Usage (from repo root, with .env loaded):
 *   node --env-file=.env scripts/razorpay-setup-plans.mjs
 *
 * Prints plan ids to set as RAZORPAY_MONTHLY_PLAN_ID and RAZORPAY_YEARLY_PLAN_ID.
 */
import Razorpay from 'razorpay';

const PLAN_SPECS = {
  monthly: {
    period: 'monthly',
    interval: 1,
    amountPaise: 10_000,
    currency: 'INR',
    name: 'GetPGN Pro Monthly',
    description: '₹100/month · 100 scans/month',
  },
  yearly: {
    period: 'yearly',
    interval: 1,
    amountPaise: 100_000,
    currency: 'INR',
    name: 'GetPGN Pro Yearly',
    description: '₹1,000/year · 1,200 scans/year',
  },
};

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

const keyId = sanitize(process.env.RAZORPAY_KEY_ID);
const keySecret = sanitize(process.env.RAZORPAY_KEY_SECRET);

if (!keyId || !keySecret) {
  console.error('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  process.exit(1);
}

const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

async function createPlan(planType) {
  const spec = PLAN_SPECS[planType];
  const plan = await razorpay.plans.create({
    period: spec.period,
    interval: spec.interval,
    item: {
      name: spec.name,
      amount: spec.amountPaise,
      currency: spec.currency,
      description: spec.description,
    },
    notes: { product: 'getpgn-pro', planType },
  });
  return plan;
}

async function main() {
  console.log(`Razorpay mode: ${keyId.startsWith('rzp_live_') ? 'live' : 'test'}\n`);

  const monthly = await createPlan('monthly');
  const yearly = await createPlan('yearly');

  console.log('Created plans:\n');
  console.log(`RAZORPAY_MONTHLY_PLAN_ID=${monthly.id}`);
  console.log(`  period=${monthly.period} interval=${monthly.interval} amount=${monthly.item?.amount}`);
  console.log(`RAZORPAY_YEARLY_PLAN_ID=${yearly.id}`);
  console.log(`  period=${yearly.period} interval=${yearly.interval} amount=${yearly.item?.amount}`);
  console.log('\nAdd these to Vercel env (production) and redeploy.');
}

main().catch((err) => {
  console.error(err?.error?.description || err?.message || err);
  process.exit(1);
});
