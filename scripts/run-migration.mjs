import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, '../.env.local');

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
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.log('Add SUPABASE_SERVICE_ROLE_KEY to .env.local');
  console.log('Get it from Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  const migrationPath = path.join(root, '../supabase/migrations/019_new_features_extensions.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration...');

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.log('Migration error:', error);
    // Try alternative: run statements one by one
    const statements = sql.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
        if (stmtError) {
          console.log('Statement error:', stmtError);
        }
      }
    }
  } else {
    console.log('Migration completed successfully.');
  }
}

await runMigration();