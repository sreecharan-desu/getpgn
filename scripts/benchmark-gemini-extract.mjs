#!/usr/bin/env node
/**
 * Live Gemini extraction benchmark vs shared image_pgn / optimized ground truth.
 * Usage: npx tsx scripts/benchmark-gemini-extract.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import {
  SCORESHEET_BENCHMARKS,
  flattenValidatedSans,
  moveListSimilarity,
} from "../src/lib/scoresheetBenchmark.ts";
import { validateChessMoves } from "../src/lib/chess-validator.ts";
import { normalizeExtractedMoves } from "../src/lib/extractedNotation.ts";
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_MESSAGE,
} from "../src/lib/extractionPrompt.ts";

function loadEnvFile() {
  try {
    const text = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

loadEnvFile();

const apiKey = process.env.AI_API_KEY;
if (!apiKey) {
  console.error("AI_API_KEY not set — cannot run live Gemini benchmark.");
  process.exit(1);
}

const modelName =
  process.env.AI_MODEL_NAME || ["ge", "mi", "ni", "-2.5-flash-lite"].join("");
const ai = new GoogleGenAI({ apiKey });
const publicDir = join(process.cwd(), "public");

function flattenRawMoves(moves) {
  const out = [];
  for (const t of moves) {
    const w = t.white?.notation?.trim();
    const b = t.black?.notation?.trim();
    if (w) out.push(w);
    if (b) out.push(b);
  }
  return out;
}

async function extractFromImage(imagePath) {
  const buffer = readFileSync(imagePath);
  const base64Data = buffer.toString("base64");
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: EXTRACTION_USER_MESSAGE },
        ],
      },
    ],
    config: {
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          moves: {
            type: "array",
            items: {
              type: "object",
              properties: {
                moveNumber: { type: "integer" },
                white: {
                  type: "object",
                  properties: {
                    notation: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["notation"],
                },
                black: {
                  type: "object",
                  properties: {
                    notation: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["notation"],
                },
              },
              required: ["moveNumber", "white", "black"],
            },
          },
        },
        required: ["moves"],
      },
      temperature: 0.0,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty Gemini response");
  return JSON.parse(text).moves;
}

function printMismatches(label, actual, expected, limit = 8) {
  const n = Math.max(actual.length, expected.length);
  const mismatches = [];
  for (let i = 0; i < n; i++) {
    if (actual[i] !== expected[i]) {
      mismatches.push({ i: i + 1, got: actual[i] ?? "—", want: expected[i] ?? "—" });
    }
  }
  if (mismatches.length === 0) return;
  console.log(`  ${label} mismatches (${mismatches.length}):`);
  for (const m of mismatches.slice(0, limit)) {
    console.log(`    ply ${m.i}: "${m.got}" (want "${m.want}")`);
  }
  if (mismatches.length > limit) {
    console.log(`    … and ${mismatches.length - limit} more`);
  }
}

console.log(`Live Gemini benchmark — model: ${modelName}\n`);

let rawVsOptimized = 0;
let rawVsShared = 0;
let validatedVsOptimized = 0;
let n = 0;

for (const bench of SCORESHEET_BENCHMARKS) {
  const imageFile = join(publicDir, `${bench.id}.jpg`);
  process.stdout.write(`${bench.id}: calling Gemini… `);

  try {
    const rawMoves = await extractFromImage(imageFile);
    const flatRaw = flattenRawMoves(rawMoves);
    const normalizedMoves = normalizeExtractedMoves(rawMoves);
    const validation = validateChessMoves(normalizedMoves, {
      strictRecovery: true,
    });
    const flatValidated = flattenValidatedSans(validation.moves);

    const simShared = moveListSimilarity(flatRaw, bench.imagePgn);
    const simOptimizedRaw = moveListSimilarity(flatRaw, bench.optimizedPgn);
    const simOptimizedVal = moveListSimilarity(flatValidated, bench.optimizedPgn);

    rawVsShared += simShared;
    rawVsOptimized += simOptimizedRaw;
    validatedVsOptimized += simOptimizedVal;
    n++;

    console.log("done");
    console.log(
      `  raw vs your image_pgn: ${(simShared * 100).toFixed(1)}% | raw vs optimized: ${(simOptimizedRaw * 100).toFixed(1)}% | validated vs optimized: ${(simOptimizedVal * 100).toFixed(1)}%`,
    );
    printMismatches("raw vs optimized", flatRaw, bench.optimizedPgn);
    console.log("");
  } catch (err) {
    console.log("FAILED");
    console.error(`  ${err.message}\n`);
  }
}

if (n > 0) {
  console.log("Averages:");
  console.log(`  Gemini raw vs your image_pgn:     ${((rawVsShared / n) * 100).toFixed(1)}%`);
  console.log(`  Gemini raw vs optimized:          ${((rawVsOptimized / n) * 100).toFixed(1)}%`);
  console.log(`  Gemini + validator vs optimized:  ${((validatedVsOptimized / n) * 100).toFixed(1)}%`);
}
