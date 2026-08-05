// Prints a fresh Supabase access_token for the account given by
// STREAMBIAS_EMAIL + STREAMBIAS_PASSWORD (set in your terminal before running).
//
// Usage:
//   export STREAMBIAS_EMAIL=you@example.com STREAMBIAS_PASSWORD=yourpassword
//   node scripts/get-test-token.mjs
//
// The printed token can then be used directly:
//   export ACCESS_TOKEN=$(node scripts/get-test-token.mjs)

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load app .env so VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are available
// without needing them re-exported in the shell.
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '..', '.env');

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
} else {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const ANON_KEY      = process.env.VITE_SUPABASE_ANON_KEY;
const EMAIL         = process.env.STREAMBIAS_EMAIL;
const PASSWORD      = process.env.STREAMBIAS_PASSWORD;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env');
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error('Set STREAMBIAS_EMAIL and STREAMBIAS_PASSWORD in your environment first');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);
const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

if (error) {
  console.error('Sign-in failed:', error.message);
  process.exit(1);
}

// Print only the token so `export ACCESS_TOKEN=$(node scripts/get-test-token.mjs)` works cleanly.
console.log(data.session.access_token);
