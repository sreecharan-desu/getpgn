/** Shared Prisma `select` shapes — fetch only columns each route needs. */

export const userSessionSelect = {
  id: true,
  username: true,
  email: true,
  emailVerified: true,
  plan: true,
  scanCount: true,
  monthlyScanCount: true,
  monthlyScanMonth: true,
  bonusScanCount: true,
  referralCode: true,
  avatarPiece: true,
  userRole: true,
  onboardingCompleted: true,
  subscriptionExpiresAt: true,
  subscriptionId: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  subscriptionStart: true,
  subscriptionEnd: true,
  paymentProvider: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userAuthSelect = {
  id: true,
  username: true,
  email: true,
  passwordHash: true,
  plan: true,
  emailVerified: true,
} as const;

export const savedGameListSelect = {
  id: true,
  title: true,
  whitePlayer: true,
  blackPlayer: true,
  movesJson: true,
  isDraft: true,
  createdAt: true,
  publicLink: {
    select: {
      slug: true,
      enabled: true,
    },
  },
} as const;

export const savedGameDetailSelect = {
  id: true,
  title: true,
  whitePlayer: true,
  blackPlayer: true,
  pgn: true,
  movesJson: true,
  isDraft: true,
  createdAt: true,
  publicLink: {
    select: {
      slug: true,
      enabled: true,
    },
  },
} as const;
