import { after } from 'next/server';
import { prisma } from '@/lib/db';
import {
  sendOrganizerCreditsAddedEmail,
  sendOrganizerWalletHistoryEmail,
  sendPasswordChangedEmail,
  sendProSubscriptionEmail,
  sendReferrerFriendSignedUpEmail,
  type OrganizerCreditsEmailDetails,
  type OrganizerWalletHistoryEmailDetails,
  type ProSubscriptionEmailDetails,
} from '@/lib/email';
import { ensureOrganizerLibrary } from '@/lib/organizerLibrary';
import { REFERRAL_REWARD_SCANS } from '@/lib/referrals';

function queueEmail(
  label: string,
  send: () => Promise<{ success: boolean; error?: string }>,
): void {
  after(() => {
    void send().catch((err) => {
      console.error(`[${label}] Background send failed:`, err);
    });
  });
}

export function queueOrganizerCreditsAddedEmail(
  email: string,
  details: OrganizerCreditsEmailDetails,
): void {
  if (!email.trim()) return;
  queueEmail('Organizer Credits Email', () =>
    sendOrganizerCreditsAddedEmail(email, details),
  );
}

export function queueOrganizerWalletHistoryEmail(
  email: string,
  details: OrganizerWalletHistoryEmailDetails,
): void {
  if (!email.trim()) return;
  queueEmail('Organizer Wallet Email', () =>
    sendOrganizerWalletHistoryEmail(email, details),
  );
}

export function queueProSubscriptionEmail(
  email: string,
  details: ProSubscriptionEmailDetails,
): void {
  if (!email.trim()) return;
  queueEmail('Pro Subscription Email', () =>
    sendProSubscriptionEmail(email, details),
  );
}

export function queuePasswordChangedEmail(email: string, username: string): void {
  if (!email.trim()) return;
  queueEmail('Password Changed Email', () =>
    sendPasswordChangedEmail(email, username),
  );
}

/** Email the referrer when a friend signs up with their link. */
export function notifyReferrerFriendSignedUp(
  referrerId: string,
  refereeUsername: string,
): void {
  queueEmail('Referrer Signup Email', async () => {
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      select: { email: true, username: true },
    });
    if (!referrer?.email?.trim()) {
      return { success: false, error: 'Referrer has no email on file.' };
    }

    return sendReferrerFriendSignedUpEmail(referrer.email, {
      referrerUsername: referrer.username,
      refereeUsername,
      rewardScans: REFERRAL_REWARD_SCANS,
    });
  });
}

/** Fire-and-forget credits notification after wallet top-up (purchase or admin). */
export async function notifyOrganizerCreditsAdded(params: {
  userId: string;
  scansAdded: number;
  source: 'purchase' | 'admin';
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, username: true },
  });
  const account = await prisma.organizerAccount.findUnique({
    where: { userId: params.userId },
    select: {
      availableScans: true,
      totalScansPurchased: true,
    },
  });
  if (!user?.email || !account) return;

  try {
    await ensureOrganizerLibrary(params.userId, user.username);
  } catch (err) {
    console.error('[Organizer Library] ensure on credit failed:', err);
  }

  queueOrganizerCreditsAddedEmail(user.email, {
    username: user.username,
    scansAdded: params.scansAdded,
    availableScans: account.availableScans,
    totalScansPurchased: account.totalScansPurchased,
    source: params.source,
  });
}

/** Fire-and-forget wallet debit notification after a prepaid scan is consumed. */
export async function notifyOrganizerWalletScanUsed(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true },
  });
  const account = await prisma.organizerAccount.findUnique({
    where: { userId },
    select: {
      availableScans: true,
      totalScansUsed: true,
      totalScansPurchased: true,
    },
  });
  if (!user?.email || !account) return;

  queueOrganizerWalletHistoryEmail(user.email, {
    username: user.username,
    scansUsed: 1,
    availableScans: account.availableScans,
    totalScansUsed: account.totalScansUsed,
    totalScansPurchased: account.totalScansPurchased,
  });
}
