/**
 * End-to-end test: connect a broker account (MetaApi create + deploy + DB write)
 * then disconnect it via the broker-disconnect endpoint and verify cleanup.
 *
 * Runs the broker-connect handler logic DIRECTLY (no HTTP proxy) to avoid
 * vercel dev's proxy timeout during MetaApi deploy validation (5-10 min).
 * The disconnect step goes through the live vercel dev endpoint.
 */
'use strict';
const { readFileSync } = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// ── Load env ──────────────────────────────────────────────────────────────────
const envLines = readFileSync(`${__dirname}/../.env`, 'utf8').split('\n');
const env = {};
for (const line of envLines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}
// Load MT_PASSWORD from metaapi-test/.env
const testEnvLines = readFileSync('/Users/lukehoward/metaapi-test/.env', 'utf8').split('\n');
for (const line of testEnvLines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const key = t.slice(0, eq).trim();
  if (!env[key]) env[key] = t.slice(eq + 1).trim();
}
// Set all env vars for modules that read from process.env
for (const [k, v] of Object.entries(env)) process.env[k] = v;

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
  throw lastErr;
}

function encrypt(plaintext) {
  const keyHex = env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) throw new Error('ENCRYPTION_KEY missing');
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const TEST_USER = 'bf56f6fc-99ab-4870-aba4-58fc18790011';
  const MT_LOGIN = '62135011';
  const MT_SERVER = 'PepperstoneUK-Demo';
  const MT_PLATFORM = 'mt5';

  // 1. Load MetaApi CJS SDK (same bundle as broker-connect.ts uses).
  console.log('[e2e] loading MetaApi SDK (CJS)...');
  const MetaApi = require('metaapi.cloud-sdk/node').default;
  const api = new MetaApi(env.METAAPI_TOKEN);

  // 2. Create MetaApi account
  console.log('[e2e] createAccount...');
  let metaAccount;
  try {
    metaAccount = await withRetry(() =>
      api.metatraderAccountApi.createAccount({
        login: MT_LOGIN,
        password: env.MT_PASSWORD,
        server: MT_SERVER,
        platform: MT_PLATFORM,
        name: `MT5 ${MT_LOGIN} (e2e-test)`,
        type: 'cloud',
        region: 'london',
        reliability: 'high',
        magic: 0,
      })
    );
  } catch (err) {
    console.error('[e2e] createAccount FAILED:', err.message);
    process.exit(1);
  }
  console.log(`[e2e] account created: ${metaAccount.id} state=${metaAccount.state}`);

  // 3. Deploy MetaApi account (this is the slow step — may take 5-10 min)
  console.log('[e2e] deploying (waiting for broker validation — may take several minutes)...');
  try {
    await withRetry(async () => {
      await metaAccount.deploy();
      await metaAccount.reload();
    });
  } catch (err) {
    console.error('[e2e] deploy FAILED:', err.message);
    // Cleanup orphaned MetaApi account
    try {
      if (metaAccount.state !== 'UNDEPLOYED') await metaAccount.undeploy();
      await metaAccount.remove();
      console.log('[e2e] orphaned MetaApi account cleaned up');
    } catch (cleanupErr) {
      console.error('[e2e] cleanup also failed:', cleanupErr.message);
    }
    process.exit(1);
  }
  console.log(`[e2e] deployed: state=${metaAccount.state}`);

  // 4. Insert linked_accounts row
  const { data: la, error: laErr } = await supabase.from('linked_accounts').insert({
    user_id: TEST_USER, name: `MT5 ${MT_LOGIN}`, broker: MT_SERVER,
    balance: 0, currency: 'USD', is_connected: true, is_primary: true,
    last_updated: new Date().toISOString(),
  }).select('id').single();
  if (laErr || !la) {
    console.error('[e2e] linked_accounts insert failed:', laErr?.message);
    await metaAccount.undeploy(); await metaAccount.remove();
    process.exit(1);
  }
  console.log(`[e2e] linked_accounts row: ${la.id}`);

  // 5. Insert broker_connections row
  const { error: bcErr } = await supabase.from('broker_connections').insert({
    user_id: TEST_USER, account_id: la.id, broker_type: 'mt4_mt5',
    metaapi_account_id: metaAccount.id, login: MT_LOGIN, server: MT_SERVER,
    investor_password_encrypted: encrypt(env.MT_PASSWORD),
    connection_status: 'connected', deploy_state: 'DEPLOYED',
    platform: MT_PLATFORM, region: 'london', reliability: 'regular',
    metastats_enabled: false, last_deployed_at: new Date().toISOString(),
  });
  if (bcErr) {
    console.error('[e2e] broker_connections insert failed:', bcErr.message);
    await supabase.from('linked_accounts').delete().eq('id', la.id);
    await metaAccount.undeploy(); await metaAccount.remove();
    process.exit(1);
  }
  console.log('[e2e] DB rows written');
  console.log(`[e2e] SEEDED: linkedAccountId=${la.id} metaApiId=${metaAccount.id}`);

  // 6. Get access token for disconnect call
  const { data: linkRes } = await supabase.auth.admin.generateLink({
    type: 'magiclink', email: 'luke@hfx-capital.com',
  });
  const url = new URL(linkRes.properties.action_link);
  const tokenHash = url.searchParams.get('token');
  const { data: sessData } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  const accessToken = sessData.session.access_token;
  console.log('[e2e] access token obtained');

  // 7. Call broker-disconnect endpoint via vercel dev
  console.log('[e2e] calling /api/broker-disconnect...');
  const body = JSON.stringify({ linkedAccountId: la.id });
  const disconnectRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/broker-disconnect', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(120000, () => reject(new Error('disconnect request timed out')));
    req.write(body);
    req.end();
  });
  console.log(`[e2e] disconnect response: ${disconnectRes.status} ${disconnectRes.body}`);

  if (disconnectRes.status !== 200) {
    console.error('[e2e] FAIL: disconnect returned non-200');
    process.exit(1);
  }

  // 8. Verify MetaApi account is gone
  console.log('[e2e] verifying MetaApi account deleted...');
  try {
    await api.metatraderAccountApi.getAccount(metaAccount.id);
    console.error('[e2e] FAIL: MetaApi account still exists after disconnect');
    process.exit(1);
  } catch (err) {
    if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
      console.log('[e2e] MetaApi account confirmed deleted');
    } else {
      console.error('[e2e] unexpected MetaApi error:', err.message);
      process.exit(1);
    }
  }

  // 9. Verify DB rows are gone
  console.log('[e2e] verifying DB rows deleted...');
  const { count: laCount } = await supabase.from('linked_accounts').select('id', { count: 'exact', head: true }).eq('user_id', TEST_USER);
  const { count: bcCount } = await supabase.from('broker_connections').select('id', { count: 'exact', head: true }).eq('user_id', TEST_USER);
  console.log(`[e2e] linked_accounts remaining: ${laCount}`);
  console.log(`[e2e] broker_connections remaining: ${bcCount}`);

  if (laCount !== 0 || bcCount !== 0) {
    console.error('[e2e] FAIL: DB rows still present');
    process.exit(1);
  }

  console.log('[e2e] PASS: all checks green');
})();
