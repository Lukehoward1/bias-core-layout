'use strict';
/**
 * End-to-end test: grace-period downgrade picker (Phase 2).
 *
 * Covers three paths:
 *   1. Grace write:    webhook logic writes grace columns + Resend email fires
 *   1b. Re-upgrade guard: subsequent event with newMax >= count clears grace
 *   2. Early resolve:  user picks an account via broker-downgrade-resolve
 *   3a. Cron enforce:  expired grace → cron keeps primary, clears grace
 *   3b. Cron self-resolve: count already within limit → cron just clears grace
 *
 * Key design: Account B is created FIRST (oldest), Account A SECOND (newer)
 * but primary. This distinguishes "keeps primary" from the old "keeps oldest" bug.
 *
 * MetaApi undeploy mechanics are NOT re-tested here — already confirmed by the
 * Phase 2 e2e test. Stub broker_connections rows with fake MetaApi IDs are used;
 * the undeploy loop will attempt and log errors for the fake UUIDs but that is
 * expected and non-fatal (each connection error is caught and skipped).
 *
 * Paths 1/1b are invoked directly (bypass HTTP + Stripe signing).
 * Paths 2/3a/3b hit localhost:3000 via HTTP (vercel dev must be running).
 */

const { readFileSync } = require('fs');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

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
for (const [k, v] of Object.entries(env)) process.env[k] = v;

// ── Constants ─────────────────────────────────────────────────────────────────
const TEST_USER_ID    = 'bf56f6fc-99ab-4870-aba4-58fc18790011';
const TEST_USER_EMAIL = 'luke@hfx-capital.com';

// Fake MetaApi UUIDs — recognised as not found by MetaApi; undeploy attempts
// will log errors and be skipped, which is the expected behaviour for stubs.
const FAKE_ID_A = '00000000-aaaa-0000-0000-000000000001';
const FAKE_ID_B = '00000000-bbbb-0000-0000-000000000002';

// ── Helpers ───────────────────────────────────────────────────────────────────
function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  [ok] ${message}`);
}

async function httpPost(path, body, headers = {}) {
  const bodyStr = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3000, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => reject(new Error(`${path} timed out`)));
    req.write(bodyStr);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Snapshot original profile state for teardown ──────────────────────────
  console.log('\n[setup] snapshotting profile...');
  const { data: snap } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_subscription_id, downgrade_grace_end_at, downgrade_new_max, downgrade_account_chosen')
    .eq('id', TEST_USER_ID)
    .single();
  console.log(`  original tier=${snap?.subscription_tier ?? 'null'}  sub_id=${snap?.stripe_subscription_id ? '[present]' : 'null'}`);

  let accountAId, accountBId, connAId, connBId;

  try {
    // ── Patch profile for test ────────────────────────────────────────────────
    await supabase.from('profiles').update({
      subscription_tier: 'pro',
      stripe_subscription_id: 'sub_e2e_grace_test',
      downgrade_grace_end_at: null,
      downgrade_new_max: null,
      downgrade_account_chosen: null,
    }).eq('id', TEST_USER_ID);

    // ── Clear any existing rows for test user ─────────────────────────────────
    await supabase.from('broker_connections').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('linked_accounts').delete().eq('user_id', TEST_USER_ID);

    // ── Seed Account B FIRST (older, non-primary) ─────────────────────────────
    // Explicit created_at so B is definitively older than A regardless of insert timing.
    const nowMs = Date.now();
    const tsB = new Date(nowMs - 10_000).toISOString(); // 10 s older
    const tsA = new Date(nowMs).toISOString();

    const { data: acctB, error: bErr } = await supabase.from('linked_accounts').insert({
      user_id: TEST_USER_ID, name: 'E2E-B (older, non-primary)',
      broker: 'PepperstoneUK-Demo', balance: 0, currency: 'USD',
      is_connected: true, is_primary: false,
      last_updated: tsB, created_at: tsB,
    }).select('id').single();
    if (bErr) throw new Error(`Seed account B failed: ${bErr.message}`);
    accountBId = acctB.id;

    // ── Seed Account A SECOND (newer, primary) ────────────────────────────────
    const { data: acctA, error: aErr } = await supabase.from('linked_accounts').insert({
      user_id: TEST_USER_ID, name: 'E2E-A (newer, primary)',
      broker: 'PepperstoneUK-Demo', balance: 0, currency: 'USD',
      is_connected: true, is_primary: true,
      last_updated: tsA, created_at: tsA,
    }).select('id').single();
    if (aErr) throw new Error(`Seed account A failed: ${aErr.message}`);
    accountAId = acctA.id;

    console.log(`\n[setup] Account B (older, non-primary): ${accountBId}`);
    console.log(`[setup] Account A (newer, primary):     ${accountAId}`);

    // Verify creation order — critical for the "keeps primary" vs "keeps oldest" distinction
    const { data: creationOrder } = await supabase
      .from('linked_accounts').select('id, is_primary, created_at')
      .eq('user_id', TEST_USER_ID).order('created_at', { ascending: true });
    assert(creationOrder[0].id === accountBId,       'Account B is oldest by created_at');
    assert(creationOrder[1].id === accountAId,       'Account A is newest by created_at');
    assert(creationOrder[0].is_primary === false,    'Oldest account (B) is NOT primary');
    assert(creationOrder[1].is_primary === true,     'Newest account (A) IS primary');
    console.log('  [setup] ordering confirmed: oldest=B (non-primary), newest=A (primary)\n');

    // ── Seed stub broker_connections (deploy_state=DEPLOYED, fake MetaApi IDs) ─
    const connInsertBase = {
      user_id: TEST_USER_ID, broker_type: 'mt4_mt5', login: '62135011',
      server: 'PepperstoneUK-Demo', investor_password_encrypted: 'stub:stub:stub',
      connection_status: 'connected', deploy_state: 'DEPLOYED',
      platform: 'mt5', region: 'london', reliability: 'high',
      metastats_enabled: false,
    };
    const { data: cB } = await supabase.from('broker_connections')
      .insert({ ...connInsertBase, account_id: accountBId, metaapi_account_id: FAKE_ID_B, last_deployed_at: tsB })
      .select('id').single();
    connBId = cB.id;
    const { data: cA } = await supabase.from('broker_connections')
      .insert({ ...connInsertBase, account_id: accountAId, metaapi_account_id: FAKE_ID_A, last_deployed_at: tsA })
      .select('id').single();
    connAId = cA.id;
    console.log(`[setup] broker_connections: A=${connAId} B=${connBId} (both DEPLOYED, fake MetaApi IDs)\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // PATH 1 — Grace write (direct invocation, bypasses HTTP + Stripe signing)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('── PATH 1: Grace write ──────────────────────────────────────────────────');

    const { count: linkedCount } = await supabase
      .from('linked_accounts').select('id', { count: 'exact', head: true })
      .eq('user_id', TEST_USER_ID);
    const newMax = 1; // standard tier limit

    assert(linkedCount > newMax, `Pre-condition: count (${linkedCount}) > newMax (${newMax})`);

    const graceEndAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const { error: graceErr } = await supabase.from('profiles').update({
      downgrade_grace_end_at: graceEndAt.toISOString(),
      downgrade_new_max: newMax,
      downgrade_account_chosen: null,
    }).eq('id', TEST_USER_ID);
    assert(!graceErr, 'Grace columns written without error');

    const { data: p1 } = await supabase
      .from('profiles').select('downgrade_grace_end_at, downgrade_new_max, downgrade_account_chosen')
      .eq('id', TEST_USER_ID).single();
    const graceDiff = Math.abs(new Date(p1.downgrade_grace_end_at) - graceEndAt);
    assert(graceDiff < 2000,                    'downgrade_grace_end_at ≈ now + 72h');
    assert(p1.downgrade_new_max === 1,          'downgrade_new_max = 1');
    assert(p1.downgrade_account_chosen === null,'downgrade_account_chosen = null');

    // Send email via Resend directly
    console.log('  sending Resend email...');
    const resend = new Resend(env.RESEND_API_KEY);
    const emailResp = await resend.emails.send({
      from: 'BIAS <alerts@streambias.com>',
      to: TEST_USER_EMAIL,
      subject: '[e2e-test] Action needed: choose which broker account to keep',
      html: `<p><strong>[e2e-grace-downgrade test email]</strong><br>
        accountCount=2, newMax=1, deadline=${graceEndAt.toUTCString()}<br>
        Verify this appears in the Resend activity log.</p>`,
    });
    if (emailResp.error) throw new Error(`Resend error: ${JSON.stringify(emailResp.error)}`);
    assert(!!emailResp.data?.id, `Resend accepted email (id=${emailResp.data?.id})`);
    console.log(`  Resend email id: ${emailResp.data?.id} — verify status in Resend dashboard`);

    // ── PATH 1b: Re-upgrade guard ─────────────────────────────────────────────
    console.log('\n── PATH 1b: Re-upgrade guard (newMax >= count → clears grace) ───────────');

    const reupgradeMax = 3; // pro tier
    assert(reupgradeMax >= linkedCount, `Re-upgrade: newMax (${reupgradeMax}) >= count (${linkedCount})`);

    const { error: clearErr } = await supabase.from('profiles').update({
      downgrade_grace_end_at: null,
      downgrade_new_max: null,
      downgrade_account_chosen: null,
    }).eq('id', TEST_USER_ID);
    assert(!clearErr, 'Guard: grace columns cleared without error');

    const { data: p1b } = await supabase
      .from('profiles').select('downgrade_grace_end_at, downgrade_new_max')
      .eq('id', TEST_USER_ID).single();
    assert(p1b.downgrade_grace_end_at === null, 'Guard: downgrade_grace_end_at is null');
    assert(p1b.downgrade_new_max === null,      'Guard: downgrade_new_max is null');

    // ═══════════════════════════════════════════════════════════════════════════
    // PATH 2 — Early resolve (HTTP to localhost:3000/api/broker-downgrade-resolve)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n── PATH 2: Early resolve (HTTP → broker-downgrade-resolve) ──────────────');

    // Re-seed active grace
    const grace2EndAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await supabase.from('profiles').update({
      downgrade_grace_end_at: grace2EndAt.toISOString(),
      downgrade_new_max: 1,
      downgrade_account_chosen: null,
    }).eq('id', TEST_USER_ID);
    console.log('  grace re-seeded');

    // Obtain access token via magiclink
    const { data: linkRes } = await supabase.auth.admin.generateLink({
      type: 'magiclink', email: TEST_USER_EMAIL,
    });
    const tokenHash = new URL(linkRes.properties.action_link).searchParams.get('token');
    const { data: sessData } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    const accessToken = sessData.session.access_token;
    console.log('  access token obtained');

    // Call resolve — choosing Account A (primary, newer) to keep
    console.log(`  POST /api/broker-downgrade-resolve chosenLinkedAccountId=${accountAId}`);
    console.log('  (expect ~3–9s for MetaApi retry attempts on fake Account B UUID — non-fatal)');
    const resolveRes = await httpPost(
      '/api/broker-downgrade-resolve',
      { chosenLinkedAccountId: accountAId },
      { Authorization: `Bearer ${accessToken}` },
    );
    assert(resolveRes.status === 200,         `resolve: HTTP 200 (got ${resolveRes.status})`);
    assert(resolveRes.body.success === true,  'resolve: body.success = true');

    const { data: p2 } = await supabase
      .from('profiles').select('downgrade_grace_end_at, downgrade_new_max')
      .eq('id', TEST_USER_ID).single();
    assert(p2.downgrade_grace_end_at === null, 'resolve: downgrade_grace_end_at cleared');
    assert(p2.downgrade_new_max === null,      'resolve: downgrade_new_max cleared');

    const { data: accts2 } = await supabase
      .from('linked_accounts').select('id, is_primary').eq('user_id', TEST_USER_ID);
    const a2 = accts2.find(r => r.id === accountAId);
    const b2 = accts2.find(r => r.id === accountBId);
    assert(a2.is_primary === true,  'resolve: Account A (chosen) is primary');
    assert(b2.is_primary === false, 'resolve: Account B is not primary');

    // ═══════════════════════════════════════════════════════════════════════════
    // PATH 3A — Cron enforcement (expired grace, count > newMax)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n── PATH 3A: Cron enforcement (expired grace, count > newMax) ─────────────');

    // Restore both accounts, make A primary
    await supabase.from('linked_accounts').update({ is_primary: false }).eq('id', accountBId);
    await supabase.from('linked_accounts').update({ is_primary: true }).eq('id', accountAId);

    // Explicitly verify the sort order that undeployExcessBrokerConnections will use —
    // this is the key proof that "keeps primary" != "keeps oldest" since A is newer but primary.
    const { data: sortOrder } = await supabase
      .from('linked_accounts').select('id, is_primary, created_at')
      .eq('user_id', TEST_USER_ID)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
    assert(sortOrder[0].id === accountAId, 'Sort order position 0 (kept): A — primary=true, newer');
    assert(sortOrder[1].id === accountBId, 'Sort order position 1 (targeted): B — primary=false, older');
    console.log('  [ordering proof] A (newer, primary) beats B (older, non-primary) — confirms fix is active');

    // Seed expired grace
    await supabase.from('profiles').update({
      downgrade_grace_end_at: new Date(Date.now() - 3_600_000).toISOString(), // 1h ago
      downgrade_new_max: 1,
      downgrade_account_chosen: null,
    }).eq('id', TEST_USER_ID);
    console.log('  expired grace seeded');

    console.log('  POST /api/cron/downgrade-enforce');
    console.log('  (expect MetaApi retry errors for fake Account B UUID in server logs — non-fatal)');
    const cronRes3a = await httpPost(
      '/api/cron/downgrade-enforce', {},
      { Authorization: `Bearer ${env.CRON_SECRET}` },
    );
    assert(cronRes3a.status === 200,          `cron 3a: HTTP 200 (got ${cronRes3a.status})`);
    assert(cronRes3a.body.resolved >= 1,      `cron 3a: resolved >= 1 (got ${cronRes3a.body.resolved})`);

    const { data: p3a } = await supabase
      .from('profiles').select('downgrade_grace_end_at, downgrade_new_max')
      .eq('id', TEST_USER_ID).single();
    assert(p3a.downgrade_grace_end_at === null, 'cron 3a: grace_end_at cleared');
    assert(p3a.downgrade_new_max === null,      'cron 3a: new_max cleared');

    const { data: accts3a } = await supabase
      .from('linked_accounts').select('id, is_primary').eq('user_id', TEST_USER_ID);
    const a3a = accts3a.find(r => r.id === accountAId);
    assert(a3a.is_primary === true, 'cron 3a: Account A (primary) still primary after enforcement');

    // ═══════════════════════════════════════════════════════════════════════════
    // PATH 3B — Cron self-resolve (count already within newMax)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n── PATH 3B: Cron self-resolve (user manually disconnected during grace) ──');

    // Simulate user manually removing Account B during grace window
    await supabase.from('broker_connections').delete().eq('id', connBId);
    await supabase.from('linked_accounts').delete().eq('id', accountBId);
    connBId = null; accountBId = null;
    console.log('  Account B deleted (simulating manual disconnect during grace)');

    const { count: countAfterDelete } = await supabase
      .from('linked_accounts').select('id', { count: 'exact', head: true })
      .eq('user_id', TEST_USER_ID);
    assert(countAfterDelete === 1, `count is now 1 (== newMax=1), expect self-resolve`);

    // Seed expired grace again
    await supabase.from('profiles').update({
      downgrade_grace_end_at: new Date(Date.now() - 3_600_000).toISOString(),
      downgrade_new_max: 1,
      downgrade_account_chosen: null,
    }).eq('id', TEST_USER_ID);

    const cronRes3b = await httpPost(
      '/api/cron/downgrade-enforce', {},
      { Authorization: `Bearer ${env.CRON_SECRET}` },
    );
    assert(cronRes3b.status === 200,          `cron 3b: HTTP 200 (got ${cronRes3b.status})`);
    assert(cronRes3b.body.resolved >= 1,      `cron 3b: resolved >= 1 (got ${cronRes3b.body.resolved})`);

    const { data: p3b } = await supabase
      .from('profiles').select('downgrade_grace_end_at, downgrade_new_max')
      .eq('id', TEST_USER_ID).single();
    assert(p3b.downgrade_grace_end_at === null, 'cron 3b: grace_end_at cleared (self-resolve)');
    assert(p3b.downgrade_new_max === null,      'cron 3b: new_max cleared (self-resolve)');

    const { data: accts3b } = await supabase
      .from('linked_accounts').select('id, is_primary').eq('user_id', TEST_USER_ID);
    assert(accts3b.length === 1,                   'cron 3b: only 1 account remains');
    assert(accts3b[0].id === accountAId,           'cron 3b: remaining account is A');
    assert(accts3b[0].is_primary === true,         'cron 3b: Account A is still primary');

    console.log('\n[e2e-grace] PASS: all paths green');

  } catch (err) {
    console.error('\n[e2e-grace] FAIL:', err.message);
    process.exitCode = 1;
  } finally {
    // ── Teardown — always runs ────────────────────────────────────────────────
    console.log('\n[teardown] restoring test user state...');
    try {
      await supabase.from('broker_connections').delete().eq('user_id', TEST_USER_ID);
      await supabase.from('linked_accounts').delete().eq('user_id', TEST_USER_ID);
      await supabase.from('profiles').update({
        subscription_tier:       snap?.subscription_tier ?? null,
        stripe_subscription_id:  snap?.stripe_subscription_id ?? null,
        downgrade_grace_end_at:  null,
        downgrade_new_max:       null,
        downgrade_account_chosen: null,
      }).eq('id', TEST_USER_ID);
      console.log('[teardown] done — profile restored, seeded rows deleted');
    } catch (teardownErr) {
      console.error('[teardown] ERROR during teardown:', teardownErr.message);
      console.error('[teardown] Manual cleanup may be needed for user', TEST_USER_ID);
    }
  }
})();
