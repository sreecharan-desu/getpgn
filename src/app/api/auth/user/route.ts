import { NextResponse } from 'next/server';
import { getSession, getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    const user = await getCurrentUser();

    if (!user) {
      if (session) {
        return NextResponse.json(
          {
            authenticated: false,
            error: 'User not found.',
            code: 'USER_NOT_FOUND',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: user.username,
        plan: user.plan,
        emailVerified: user.emailVerified,
        scanCount: user.scanCount,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionId: user.subscriptionId,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        paymentProvider: user.paymentProvider
      }
    });
  } catch (err) {
    console.error('[Auth User API] Error:', err);
    return NextResponse.json(
      {
        authenticated: false,
        error: 'User not found.',
        code: 'USER_NOT_FOUND',
      },
      { status: 500 },
    );
  }
}
