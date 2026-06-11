import { redirect } from 'next/navigation';
import { isDevFeaturesEnabled } from '@/lib/security';
import { getSession, getCurrentUser, getPostAuthRedirectPath, hasBrokenSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';
import { getOrganizerAccount } from '@/lib/organizerWallet';
import { savedGameListSelect } from '@/lib/dbSelects';
import { SAVED_GAMES_INITIAL_PAGE_SIZE, buildSavedGamesWhere } from '@/lib/savedGamesQuery';
import { ORGANIZER_PURCHASES_INITIAL_PAGE_SIZE } from '@/lib/organizerPurchasesQuery';
import { getReferralBonusNotice } from '@/lib/referralNotifications';

export type WorkspaceView = 'upload' | 'game' | 'account';

export async function loadWorkspacePageData() {
  let user = null;

  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('[Workspace] Failed to resolve current user:', err);
  }

  if (!user) {
    const session = await getSession();
    if (session) {
      const broken = await hasBrokenSession();
      if (broken) redirect('/auth/logout');
      redirect('/login?error=schema');
    }
    redirect('/login');
  }

  const postAuthPath = getPostAuthRedirectPath(user);
  if (postAuthPath !== '/dashboard') {
    redirect(postAuthPath);
  }

  const isPro = isProUser(user);
  const organizerAccount = await getOrganizerAccount(user.id);
  const hasOrganizerWallet = (organizerAccount?.totalScansPurchased ?? 0) > 0;
  const canUseSavedGames = isPro || hasOrganizerWallet;

  let savedGames: Array<{
    id: string;
    title: string;
    whitePlayer: string;
    blackPlayer: string;
    movesJson: string;
    createdAt: Date;
    publicLink: { slug: string; enabled: boolean } | null;
  }> = [];
  let savedGamesTotal = 0;

  if (canUseSavedGames) {
    try {
      const listWhere = buildSavedGamesWhere(user.id, undefined, null);
      const [rows, total] = await Promise.all([
        prisma.savedGame.findMany({
          where: listWhere,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: SAVED_GAMES_INITIAL_PAGE_SIZE,
          select: savedGameListSelect,
        }),
        prisma.savedGame.count({ where: listWhere }),
      ]);
      savedGames = rows;
      savedGamesTotal = total;
    } catch (err) {
      console.error('[Workspace] Failed to load saved games:', err);
    }
  }

  const sanitizedUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarPiece: user.avatarPiece,
    createdAt: user.createdAt.toISOString(),
    plan: user.plan,
    scanCount: user.scanCount,
    bonusScanCount: user.bonusScanCount,
    monthlyScanCount: user.monthlyScanCount,
    monthlyScanMonth: user.monthlyScanMonth,
    subscriptionId: user.subscriptionId,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStart: user.subscriptionStart ? user.subscriptionStart.toISOString() : null,
    subscriptionEnd: user.subscriptionEnd ? user.subscriptionEnd.toISOString() : null,
    paymentProvider: user.paymentProvider,
  };

  let organizerPurchases: Array<{
    id: string;
    scansPurchased: number;
    amount: number;
    status: string;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    createdAt: string;
    completedAt: string | null;
  }> = [];
  let organizerPurchasesTotal = 0;

  if (hasOrganizerWallet) {
    try {
      const purchaseWhere = { userId: user.id, status: 'COMPLETED' as const };
      const [total, rows] = await Promise.all([
        prisma.organizerPurchase.count({ where: purchaseWhere }),
        prisma.organizerPurchase.findMany({
          where: purchaseWhere,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: ORGANIZER_PURCHASES_INITIAL_PAGE_SIZE,
          select: {
            id: true,
            scansPurchased: true,
            amount: true,
            status: true,
            razorpayOrderId: true,
            razorpayPaymentId: true,
            createdAt: true,
            completedAt: true,
          },
        }),
      ]);
      organizerPurchasesTotal = total;
      organizerPurchases = rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      }));
    } catch (err) {
      console.error('[Workspace] Failed to load organizer purchases:', err);
    }
  }

  const sanitizedGames = savedGames.map((game) => ({
    id: game.id,
    title: game.title,
    whitePlayer: game.whitePlayer,
    blackPlayer: game.blackPlayer,
    movesJson: game.movesJson,
    createdAt: game.createdAt.toISOString(),
    publicLink: game.publicLink
      ? { slug: game.publicLink.slug, enabled: game.publicLink.enabled }
      : null,
  }));

  let referralBonusNotice: { referrerUsername: string; rewardScans: number } | null =
    null;
  try {
    referralBonusNotice = await getReferralBonusNotice(user.id);
  } catch (err) {
    console.error('[Workspace] Failed to load referral bonus notice:', err);
  }

  return {
    user: sanitizedUser,
    games: sanitizedGames,
    gamesTotal: savedGamesTotal,
    isDevMode: isDevFeaturesEnabled(),
    isPro,
    hasOrganizerWallet,
    organizerAccount,
    organizerPurchases,
    organizerPurchasesTotal,
    referralBonusNotice,
  };
}
