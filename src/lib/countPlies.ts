import type { Turn } from '@/components/MoveList';

export function countPliesFromTurns(turns: Turn[]): number {
  let n = 0;
  for (const t of turns) {
    if (t.white?.original?.trim() || t.white?.san) n++;
    if (t.black?.original?.trim() || t.black?.san) n++;
  }
  return n;
}
