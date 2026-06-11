import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isOnboardingPlanId } from '@/lib/onboardingPlans';
import { isUserRole } from '@/lib/userRoles';
import { apiError } from '@/lib/security';

export async function GET() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    return NextResponse.json({
      completed: auth.user.onboardingCompleted,
      role: auth.user.userRole,
    });
  } catch (error: unknown) {
    return apiError('Onboarding GET', error, 'Could not load onboarding status.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const roleRaw = typeof body?.role === 'string' ? body.role.trim() : '';
    const planRaw = typeof body?.plan === 'string' ? body.plan.trim() : '';

    if (!isUserRole(roleRaw)) {
      return NextResponse.json({ error: 'Please choose what best describes you.' }, { status: 400 });
    }

    if (!isOnboardingPlanId(planRaw)) {
      return NextResponse.json({ error: 'Please choose a valid plan.' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        userRole: roleRaw,
        onboardingCompleted: true,
      },
      select: {
        userRole: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      ok: true,
      plan: planRaw,
      role: user.userRole,
      completed: user.onboardingCompleted,
    });
  } catch (error: unknown) {
    return apiError('Onboarding POST', error, 'Could not save your preferences.');
  }
}
