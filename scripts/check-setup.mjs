#!/usr/bin/env node
/**
 * Preflight checks for local development.
 * Usage: node --env-file=.env scripts/check-setup.mjs
 */
import { PrismaClient } from '@prisma/client';
import {
  REQUIRED_COLUMNS,
  REQUIRED_ENUM_VALUES,
  REQUIRED_TABLES,
} from './schema-manifest.mjs';

function sanitize(value) {
  if (!value) return '';
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const required = [
  { key: 'DATABASE_URL', hint: 'PostgreSQL connection string (postgresql://...)' },
  { key: 'JWT_SECRET', hint: 'At least 32 random characters', minLen: 32 },
];

let failed = false;

console.log('GetPGN — local setup check\n');

for (const { key, hint, minLen } of required) {
  const raw = process.env[key];
  const value = sanitize(raw);
  if (!value) {
    console.error(`✗ ${key} is missing. ${hint}`);
    failed = true;
    continue;
  }
  if (minLen && value.length < minLen) {
    console.error(`✗ ${key} is too short (${value.length} chars, need ${minLen}+). ${hint}`);
    failed = true;
    continue;
  }
  console.log(`✓ ${key}`);
}

const optional = ['AI_API_KEY', 'RESEND_API_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
for (const key of optional) {
  console.log(process.env[key] ? `✓ ${key} (optional)` : `· ${key} not set (optional)`);
}

if (failed) {
  console.error('\nCopy .env.example to .env and fill in the required values.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  await prisma.$queryRaw`SELECT 1`;

  const missingColumns = [];

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const rows = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
    `;
    const found = new Set(rows.map((r) => r.column_name));
    for (const col of columns) {
      if (!found.has(col)) {
        missingColumns.push(`${table}.${col}`);
      }
    }
  }

  const missingTables = [];
  for (const table of REQUIRED_TABLES) {
    const rows = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
    `;
    if (rows.length === 0) {
      missingTables.push(table);
    }
  }

  const missingEnums = [];
  for (const [enumName, values] of Object.entries(REQUIRED_ENUM_VALUES)) {
    const rows = await prisma.$queryRaw`
      SELECT e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = ${enumName}
    `;
    const found = new Set(rows.map((r) => r.value));
    for (const value of values) {
      if (!found.has(value)) {
        missingEnums.push(`${enumName}.${value}`);
      }
    }
  }

  if (missingColumns.length > 0 || missingTables.length > 0 || missingEnums.length > 0) {
    console.error('\n✗ Database schema is behind the app code.');
    if (missingColumns.length > 0) {
      console.error(`  Missing columns: ${missingColumns.join(', ')}`);
    }
    if (missingTables.length > 0) {
      console.error(`  Missing tables: ${missingTables.join(', ')}`);
    }
    if (missingEnums.length > 0) {
      console.error(`  Missing enum values: ${missingEnums.join(', ')}`);
    }
    console.error('\n  Run: npm run db:sync');
    console.error('  This only ADDS columns/tables/enum values — existing rows are NOT deleted.');
    console.error('  Manual alternative: prisma/safe-additive-migration.sql (idempotent)');
    console.error('  See: docs/DATABASE_SCHEMA.md');
    process.exit(1);
  }

  const userCount = await prisma.user.count();
  console.log(`\n✓ Database connected (${userCount} user${userCount === 1 ? '' : 's'} preserved)`);
  console.log('✓ Schema is in sync (additive manifest)\n');
} catch (err) {
  console.error('\n✗ Database check failed:', err instanceof Error ? err.message : err);
  console.error('  Verify DATABASE_URL in .env points to a reachable PostgreSQL database.');
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
