import crypto from 'crypto';
import { prisma } from '@/lib/db';

/** Default public library title for a new organizer library. */
export function defaultOrganizerLibraryTitle(username: string): string {
  const handle = username.trim() || 'organizer';
  return `${handle}'s Library`;
}

export function organizerLibrarySlugFromUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

/** Create organizer library with public link enabled by default (no-op if it exists). */
export async function ensureOrganizerLibrary(userId: string, username: string) {
  const slug = organizerLibrarySlugFromUserId(userId);
  return prisma.organizerLibrary.upsert({
    where: { userId },
    create: {
      userId,
      slug,
      title: defaultOrganizerLibraryTitle(username),
      enabled: true,
    },
    update: {},
  });
}
