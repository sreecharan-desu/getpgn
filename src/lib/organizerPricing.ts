/** Enterprise pay-as-you-go prepaid scan packs via Razorpay Orders. */
export const ORGANIZER_PRICE_PER_SCAN_INR = 1;
export const ORGANIZER_MIN_SCANS = 4000;
export const ORGANIZER_DEFAULT_SCANS = 4000;

export function formatOrganizerInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function calculateOrganizerAmount(scans: number): number {
  return scans * ORGANIZER_PRICE_PER_SCAN_INR;
}

export function calculateOrganizerAmountPaise(scans: number): number {
  return calculateOrganizerAmount(scans) * 100;
}

export function parseOrganizerScanCount(raw: unknown): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : NaN;
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < ORGANIZER_MIN_SCANS) return null;
  return n;
}
