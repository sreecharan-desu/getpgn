/** Shared prepaid purchase list pagination — cursor-based, newest first. */

export const ORGANIZER_PURCHASES_INITIAL_PAGE_SIZE = 10;

export const ORGANIZER_PURCHASES_PAGE_SIZE = 10;

export type OrganizerPurchaseCursor = {
  createdAt: string;
  id: string;
};

export function encodeOrganizerPurchaseCursor(cursor: OrganizerPurchaseCursor): string {
  return `${cursor.createdAt}|${cursor.id}`;
}

export function decodeOrganizerPurchaseCursor(
  raw: string | null | undefined,
): OrganizerPurchaseCursor | null {
  if (!raw?.trim()) return null;
  const sep = raw.lastIndexOf('|');
  if (sep <= 0) return null;
  const createdAt = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  if (!createdAt || !id) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return { createdAt: date.toISOString(), id };
}

export function cursorFromOrganizerPurchase(purchase: {
  id: string;
  createdAt: string | Date;
}): string {
  const createdAt =
    typeof purchase.createdAt === 'string'
      ? purchase.createdAt
      : purchase.createdAt.toISOString();
  return encodeOrganizerPurchaseCursor({ createdAt, id: purchase.id });
}
