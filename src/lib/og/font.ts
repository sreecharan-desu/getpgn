import { readFile } from "node:fs/promises";
import path from "node:path";

let interBoldCache: ArrayBuffer | null = null;

export async function loadInterBold(): Promise<ArrayBuffer> {
  if (interBoldCache) return interBoldCache;

  const fontPath = path.join(process.cwd(), "src/lib/og/Inter-Bold.ttf");
  const data = await readFile(fontPath);
  interBoldCache = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  );
  return interBoldCache;
}
