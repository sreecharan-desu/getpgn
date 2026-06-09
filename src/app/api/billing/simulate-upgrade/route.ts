import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isDevRouteAllowed, devRouteBlockedResponse, apiError } from '@/lib/security';
import { buildProActivationScanFields } from '@/lib/scanLimits';

export async function POST() {
  if (!isDevRouteAllowed()) return devRouteBlockedResponse();

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const now = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'PAID',
        subscriptionExpiresAt: expiryDate,
        subscriptionId: null,
        subscriptionPlan: 'monthly',
        subscriptionStatus: 'active',
        subscriptionStart: now,
        subscriptionEnd: expiryDate,
        paymentProvider: 'simulated',
        ...buildProActivationScanFields('monthly', user.monthlyScanMonth),
      },
    });

    console.log(
      `[Billing Simulation] User ${user.username} upgraded to PAID. Expiry: ${expiryDate.toISOString()}`,
    );

    return NextResponse.json({
      success: true,
      plan: updatedUser.plan,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
      subscriptionPlan: updatedUser.subscriptionPlan,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionStart: updatedUser.subscriptionStart?.toISOString() ?? null,
      subscriptionEnd: updatedUser.subscriptionEnd?.toISOString() ?? null,
      subscriptionId: updatedUser.subscriptionId,
      paymentProvider: updatedUser.paymentProvider,
      monthlyScanCount: updatedUser.monthlyScanCount,
      monthlyScanMonth: updatedUser.monthlyScanMonth,
    });
  } catch (error) {
    return apiError('Billing Simulation', error);
  }
}

export async function DELETE() {
  if (!isDevRouteAllowed()) return devRouteBlockedResponse();

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'FREE',
        subscriptionExpiresAt: null,
        scanCount: 0,
        monthlyScanCount: 0,
        monthlyScanMonth: null,
        subscriptionId: null,
        subscriptionPlan: null,
        subscriptionStatus: null,
        subscriptionStart: null,
        subscriptionEnd: null,
        paymentProvider: null,
      },
    });

    console.log(`[Billing Simulation] User ${user.username} reverted to FREE.`);

    return NextResponse.json({
      success: true,
      plan: updatedUser.plan,
      subscriptionExpiresAt: null,
      scanCount: 0,
    });
  } catch (error) {
    return apiError('Billing Simulation Downgrade', error);
  }
}
