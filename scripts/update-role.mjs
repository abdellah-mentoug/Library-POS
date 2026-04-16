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

async function main() {
  // Replace with your actual user ID from the app or auth.users
  const userId = '442758b3-061c-435e-83d3-80a8bc22be73'; // <-- Update this

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (error) {
    console.log('Update error:', error);
  } else {
    console.log('Role updated to admin.');
  }
}

await main();