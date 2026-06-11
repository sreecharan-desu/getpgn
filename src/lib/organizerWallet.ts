import crypto from 'crypto';
import { prisma } from '@/lib/db';
import type { ProAccessUser } from '@/lib/proAccess';
import { isEnterpriseUser } from '@/lib/proAccess';

export type OrganizerAccountSnapshot = {
  availableScans: number;
  totalScansPurchased: number;
  totalScansUsed: number;
};

/** Sync check from a wallet snapshot (SSR / client props). */
export function hasOrganizerWallet(
  account?: OrganizerAccountSnapshot | null,
): boolean {
  return (account?.totalScansPurchased ?? 0) > 0;
}

export async function getOrganizerAccount(
  userId: string,
): Promise<OrganizerAccountSnapshot | null> {
  const row = await prisma.organizerAccount.findUnique({
    where: { userId },
    select: {
      availableScans: true,
      totalScansPurchased: true,
      totalScansUsed: true,
    },
  });
  return row;
}

/** Wallet purchaser with at least one completed pack — library + organizer features. */
export async function hasOrganizerWalletAccess(userId: string): Promise<boolean> {
  const account = await prisma.organizerAccount.findUnique({
    where: { userId },
    select: { totalScansPurchased: true },
  });
  return (account?.totalScansPurchased ?? 0) > 0;
}

/** Enterprise subscription or prepaid organizer wallet. */
export async function hasOrganizerLibraryAccess(
  user: ProAccessUser & { id: string },
): Promise<boolean> {
  if (isEnterpriseUser(user)) return true;
  return hasOrganizerWalletAccess(user.id);
}

/**
 * Idempotent credit after verified Razorpay payment (verify route + webhooks).
 * Returns true if credits were applied (or already applied for this payment).
 */
export async function completeOrganizerPurchase(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<{ ok: true; alreadyCompleted: boolean } | { ok: false; error: string }> {
  const { razorpayOrderId, razorpayPaymentId } = params;

  return prisma.$transaction(async (tx) => {
    const existingByPayment = await tx.organizerPurchase.findUnique({
      where: { razorpayPaymentId },
    });
    if (existingByPayment?.status === 'COMPLETED') {
      return { ok: true as const, alreadyCompleted: true };
    }

    const purchase = await tx.organizerPurchase.findUnique({
      where: { razorpayOrderId },
    });
    if (!purchase) {
      return { ok: false as const, error: 'Purchase not found.' };
    }
    if (purchase.status === 'COMPLETED') {
      return { ok: true as const, alreadyCompleted: true };
    }

    if (existingByPayment && existingByPayment.id !== purchase.id) {
      return { ok: false as const, error: 'Payment already used.' };
    }

    await tx.organizerPurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'COMPLETED',
        razorpayPaymentId,
        completedAt: new Date(),
      },
    });

    await tx.organizerAccount.upsert({
      where: { userId: purchase.userId },
      create: {
        userId: purchase.userId,
        availableScans: purchase.scansPurchased,
        totalScansPurchased: purchase.scansPurchased,
        totalScansUsed: 0,
      },
      update: {
        availableScans: { increment: purchase.scansPurchased },
        totalScansPurchased: { increment: purchase.scansPurchased },
      },
    });

    return { ok: true as const, alreadyCompleted: false };
  });
}

export async function reserveOrganizerWalletScan(userId: string): Promise<boolean> {
  const result = await prisma.organizerAccount.updateMany({
    where: { userId, availableScans: { gt: 0 } },
    data: {
      availableScans: { decrement: 1 },
      totalScansUsed: { increment: 1 },
    },
  });
  return result.count === 1;
}

export async function rollbackOrganizerWalletScan(userId: string): Promise<void> {
  await prisma.organizerAccount
    .updateMany({
      where: { userId, totalScansUsed: { gt: 0 } },
      data: {
        availableScans: { increment: 1 },
        totalScansUsed: { decrement: 1 },
      },
    })
    .catch((err) =>
      console.error('[Organizer Wallet] Scan rollback failed:', err),
    );
}

/** Admin / support — manual scan credit (audited via purchase row). */
export async function adminCreditOrganizerScans(params: {
  userId: string;
  scans: number;
  note?: string;
}): Promise<OrganizerAccountSnapshot> {
  const scans = Math.max(1, Math.floor(params.scans));
  const receipt = `admin_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

  return prisma.$transaction(async (tx) => {
    await tx.organizerPurchase.create({
      data: {
        userId: params.userId,
        scansPurchased: scans,
        amount: scans,
        razorpayOrderId: `manual_${receipt}`,
        razorpayPaymentId: `manual_pay_${receipt}`,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return tx.organizerAccount.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        availableScans: scans,
        totalScansPurchased: scans,
        totalScansUsed: 0,
      },
      update: {
        availableScans: { increment: scans },
        totalScansPurchased: { increment: scans },
      },
      select: {
        availableScans: true,
        totalScansPurchased: true,
        totalScansUsed: true,
      },
    });
  });
}
