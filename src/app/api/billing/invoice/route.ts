import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';
import { buildInvoicePdf } from '@/lib/invoicePdf';

function toInvoiceDate(value: Date | string | null | undefined): Date {
  if (!value) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function GET() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const user = auth.user;
    if (!isProUser(user)) {
      return NextResponse.json({ error: 'No invoice available.' }, { status: 404 });
    }

    const isSimulated = user.paymentProvider === 'simulated';
    const isYearly = user.subscriptionPlan === 'yearly';
    const cycle = isYearly ? 'Yearly' : 'Monthly';
    const amount = isSimulated ? 'Rs 0 (dev)' : isYearly ? 'Rs 1,000' : 'Rs 100';

    let payment: { razorpayPaymentId: string; createdAt: Date } | null = null;
    try {
      payment = await prisma.processedPayment.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { razorpayPaymentId: true, createdAt: true },
      });
    } catch (dbErr) {
      // Table may not exist yet on some deployments — invoice still works from subscription data.
      console.warn('[Invoice PDF] processed_payments lookup skipped:', dbErr);
    }

    const issuedAt = toInvoiceDate(
      payment?.createdAt ?? user.subscriptionStart,
    ).toLocaleDateString('en-IN', { dateStyle: 'long' });

    const invoiceNumber =
      payment?.razorpayPaymentId?.slice(-12).toUpperCase() ??
      user.subscriptionId?.slice(-12).toUpperCase() ??
      user.id.slice(0, 8).toUpperCase();

    const status =
      isSimulated
        ? 'Simulated'
        : user.subscriptionStatus === 'active' || user.subscriptionStatus === 'cancelled'
          ? 'Paid'
          : user.subscriptionStatus ?? 'Active';

    const pdf = buildInvoicePdf({
      invoiceNumber,
      issuedAt,
      username: user.username,
      email: user.email,
      planLabel: isSimulated
        ? 'GetPGN Pro - Dev simulation'
        : `GetPGN Pro - ${cycle} subscription`,
      amount,
      status,
      subscriptionId: user.subscriptionId,
      paymentId: payment?.razorpayPaymentId ?? null,
      simulated: isSimulated,
    });

    const filename = `GetPGN-invoice-${invoiceNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Invoice PDF]', error);
    return NextResponse.json({ error: 'Could not generate invoice.' }, { status: 500 });
  }
}
