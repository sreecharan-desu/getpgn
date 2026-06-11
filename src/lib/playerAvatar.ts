/** Deterministic avatar colors from a player's first name. */

const PALETTES: [string, string][] = [
  ['#6366f1', '#4f46e5'],
  ['#8b5cf6', '#7c3aed'],
  ['#ec4899', '#db2777'],
  ['#f43f5e', '#e11d48'],
  ['#f97316', '#ea580c'],
  ['#eab308', '#ca8a04'],
  ['#22c55e', '#16a34a'],
  ['#14b8a6', '#0d9488'],
  ['#06b6d4', '#0891b2'],
  ['#3b82f6', '#2563eb'],
  ['#a855f7', '#9333ea'],
  ['#10b981', '#059669'],
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function firstNameOf(fullName: string): string {
  const clean = (fullName || '').trim();
  if (!clean) return '?';
  return clean.split(/\s+/)[0] ?? clean;
}

export function initialsOfName(name: string): string {
  const clean = (name || '?').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function avatarGradientForName(name: string): {
  from: string;
  to: string;
  angle: number;
  initials: string;
  firstName: string;
} {
  const firstName = firstNameOf(name);
  const hash = hashString(firstName.toLowerCase());
  const [from, to] = PALETTES[hash % PALETTES.length]!;
  return {
    from,
    to,
    angle: hash % 360,
    initials: initialsOfName(name),
    firstName,
  };
}
