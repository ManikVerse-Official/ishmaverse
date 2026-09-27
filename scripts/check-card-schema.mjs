// Guards the greeting_cards schema contract.
//
// The manage/delete flow broke once because the client selected columns that no
// migration ever created. This script fails fast when the code and the SQL drift
// apart: every column the app selects must exist in the migrations AND be
// granted to clients in the privacy migration.
//
// Run: node scripts/check-card-schema.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationsDir = join(root, 'supabase', 'migrations');

const read = (p) => readFileSync(join(root, p), 'utf8');

// ---------------------------------------------------------------------------
// 1. Columns created by the migrations
// ---------------------------------------------------------------------------
const sqlColumns = new Set();
const grantList = new Set();
let grantFileFound = false;

for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');

  // CREATE TABLE public.greeting_cards ( ... );
  const create = sql.match(
    /create table if not exists public\.greeting_cards\s*\(([\s\S]*?)\n\);/i,
  );
  if (create) {
    for (const line of create[1].split('\n')) {
      const col = line.trim().match(/^([a-z_][a-z0-9_]*)\s+\w/i);
      if (col) sqlColumns.add(col[1].toLowerCase());
    }
  }

  // ALTER TABLE public.greeting_cards ... ADD COLUMN IF NOT EXISTS <col> ...;
  // Scoped to greeting_cards so other tables' columns never leak in.
  const alterRe = /alter table public\.greeting_cards([\s\S]*?);/gi;
  let alter;
  while ((alter = alterRe.exec(sql))) {
    const addRe = /add column if not exists\s+([a-z_][a-z0-9_]*)/gi;
    let add;
    while ((add = addRe.exec(alter[1]))) sqlColumns.add(add[1].toLowerCase());
  }

  // GRANT SELECT (cols) ON public.greeting_cards TO anon, authenticated;
  const grant = sql.match(
    /grant select\s*\(([\s\S]*?)\)\s*on public\.greeting_cards/gi,
  );
  if (grant) {
    grantFileFound = true;
    for (const statement of grant) {
      const cols = statement.match(/\(([\s\S]*?)\)/)[1];
      for (const part of cols.split(',')) {
        const col = part.trim();
        if (/^[a-z_][a-z0-9_]*$/.test(col)) grantList.add(col);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Columns selected / written by the code
// ---------------------------------------------------------------------------
const parseList = (file, re) => {
  const m = read(file).match(re);
  if (!m) throw new Error(`Could not find a column list in ${file}`);
  return m[1]
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
};

const clientColumns = parseList(
  'src/services/greetingService.ts',
  /CARD_PUBLIC_COLUMNS\s*=\s*\n?\s*'([^']+)'/,
);
const manageColumns = parseList(
  'supabase/functions/manage-greeting/index.ts',
  /SAFE_COLUMNS\s*=\s*\n?\s*"([^"]+)"/,
);

// Keys written by create-greeting's insert block.
const createSrc = read('supabase/functions/create-greeting/index.ts');
const insertBlock = createSrc.match(/\.insert\(\[\s*\{([\s\S]*?)\}\s*,?\s*\]\)/);
const insertColumns = new Set();
if (insertBlock) {
  const body = insertBlock[1];
  const patterns = [
    /([a-z_][a-z0-9_]*)\s*:/g, // key: value
    /\{\s*([a-z_][a-z0-9_]*)\s*\}/g, // { shorthand } inside a ternary spread
    /^\s*([a-z_][a-z0-9_]*),\s*$/gm, // plain shorthand property (e.g. `message,`)
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(body))) insertColumns.add(m[1]);
  }
}

// ---------------------------------------------------------------------------
// 3. Assertions
// ---------------------------------------------------------------------------
const problems = [];

if (!grantFileFound) {
  problems.push('No column-level GRANT for greeting_cards found in any migration.');
}

const missingSql = (cols, label) => {
  for (const col of cols) {
    if (!sqlColumns.has(col)) problems.push(`${label} selects "${col}", but no migration creates it.`);
  }
  if (label.includes('client') && grantList.size) {
    for (const col of cols) {
      if (!grantList.has(col)) problems.push(`${label} selects "${col}", but it is not GRANTed to clients.`);
    }
  }
};

missingSql(clientColumns, 'getGreetingCard/client');
missingSql(manageColumns, 'manage-greeting');
missingSql([...insertColumns], 'create-greeting');

// The management token must never be granted to clients.
if (grantList.has('management_token')) {
  problems.push('management_token is granted to clients — the delete secret would leak.');
}

console.log(`greeting_cards columns in migrations : ${[...sqlColumns].sort().join(', ')}`);
console.log(`client-safe GRANT columns           : ${[...grantList].sort().join(', ')}`);
console.log(`create-greeting insert keys         : ${[...insertColumns].sort().join(', ')}`);

if (problems.length) {
  console.error('\n✗ Schema contract FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('\n✓ Schema contract OK — every referenced column exists and is granted.');
