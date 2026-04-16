import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, '../.env.local');
const sqlPath = path.join(root, '../supabase/seed.sql');

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => line.trim())
      .filter(line => !line.startsWith('#'))
      .map(line => {
        const idx = line.indexOf('=');
        if (idx < 0) return null;
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        return [key, value];
      })
      .filter(Boolean)
  );
}

const env = {
  ...loadEnv(envPath),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required in .env.local or environment');
}
if (!anon) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required in .env.local or environment');
}

const dbKey = serviceRole || anon;
const client = createClient(url, dbKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const seedSql = fs.readFileSync(sqlPath, 'utf8');
const insertRegex = /INSERT INTO public\.([a-z_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\);/gms;

function parseValues(valuesText) {
  const values = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < valuesText.length; i++) {
    const char = valuesText[i];
    if (char === "'") {
      current += char;
      if (inString && valuesText[i + 1] === "'") {
        current += "'";
        i++;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (!inString && char === ',') {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim().length) values.push(current.trim());
  return values.map(v => {
    if (v.toUpperCase() === 'NULL') return null;
    const singleQuoted = /^'(.*)'$/s;
    const match = v.match(singleQuoted);
    if (match) {
      return match[1].replace(/''/g, "'");
    }
    if (/^[-+]?[0-9]+(\.[0-9]+)?$/.test(v)) return Number(v);
    return v;
  });
}

function parseCols(colsText) {
  return colsText.split(',').map(c => c.trim().replace(/"/g, ''));
}

function buildRow(cols, values) {
  return Object.fromEntries(cols.map((col, idx) => [col, values[idx]]));
}

function collectInserts(tables) {
  const rows = {};
  let match;
  while ((match = insertRegex.exec(seedSql)) !== null) {
    const [, table, colsText, valuesText] = match;
    if (!tables.has(table)) continue;
    const cols = parseCols(colsText);
    const values = parseValues(valuesText);
    if (cols.length !== values.length) {
      throw new Error(`column/value length mismatch for ${table}: ${cols.length} cols, ${values.length} values`);
    }
    rows[table] = rows[table] ?? [];
    rows[table].push(buildRow(cols, values));
  }
  return rows;
}

async function upsertTable(table, rows) {
  console.log(`Upserting ${rows.length} rows into ${table}`);
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await client.from(table).upsert(chunk, { onConflict: ['id'] });
    if (error) {
      console.error(`Error upserting ${table} chunk ${i}-${i + chunk.length}:`, error);
      process.exit(1);
    }
  }
}

async function ensureProfileUsers(profiles) {
  if (!serviceRole) {
    console.log('SUPABASE_SERVICE_ROLE_KEY not provided; skipping auth user/profile creation.');
    return;
  }

  for (const profileId of profiles) {
    const { data: existingProfile, error: profileError } = await client
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .limit(1)
      .single();
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking existing profile', profileError);
      process.exit(1);
    }
    if (existingProfile) {
      continue;
    }

    const userEmail = `seed-user-${profileId.slice(0, 8)}@example.com`;
    console.log(`Creating auth user and profile for ${profileId}`);
    const { error: userError } = await client.from('auth.users').insert([
      {
        id: profileId,
        email: userEmail,
        email_confirmed_at: new Date().toISOString(),
        raw_user_meta_data: { full_name: 'Seed User', role: 'admin' },
      },
    ]);
    if (userError) {
      console.error('Error creating auth user', userError);
      process.exit(1);
    }
  }
}

async function run() {
  const seedTables = new Set(['suppliers', 'categories', 'products']);
  if (serviceRole) {
    seedTables.add('purchase_orders');
    seedTables.add('purchase_items');
  }

  const rows = collectInserts(seedTables);
  console.log('Parsed tables:', Object.keys(rows).join(', '));

  if (serviceRole && rows.purchase_orders) {
    const createdByIds = new Set(rows.purchase_orders.map(order => order.created_by));
    await ensureProfileUsers(createdByIds);
  }

  for (const table of ['suppliers', 'categories', 'products', 'purchase_orders', 'purchase_items']) {
    if (!rows[table]) continue;
    await upsertTable(table, rows[table]);
  }

  console.log('Seeding complete.');
  if (!serviceRole) {
    console.log('Note: purchase_orders and purchase_items are skipped unless SUPABASE_SERVICE_ROLE_KEY is set.');
  }
}

await run();
