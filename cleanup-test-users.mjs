#!/usr/bin/env node
/**
 * cleanup-test-users.mjs
 *
 * Deletes all auth users except the protected demo account.
 * Deletion cascades to profiles, trades, session_plans, strategies, etc.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node cleanup-test-users.mjs [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

const PROTECTED_USER_ID = "bf56f6fc-99ab-4870-aba4-58fc18790011"; // luke@hfx-capital.com
const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  return users;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no deletions will occur)" : "LIVE (users will be deleted)"}\n`);

  const allUsers = await listAllUsers();
  console.log(`Total users in auth.users: ${allUsers.length}`);

  const toDelete = allUsers.filter((u) => u.id !== PROTECTED_USER_ID);
  const protected_ = allUsers.find((u) => u.id === PROTECTED_USER_ID);

  if (protected_) {
    console.log(`Protected account: ${protected_.email} (${protected_.id}) — skipped\n`);
  } else {
    console.warn(`Warning: protected account ${PROTECTED_USER_ID} not found in user list.\n`);
  }

  if (toDelete.length === 0) {
    console.log("No users to delete.");
    return;
  }

  if (DRY_RUN) {
    console.log("Users that WOULD be deleted:");
    for (const u of toDelete) {
      console.log(`  ${u.email ?? "(no email)"} — ${u.id}`);
    }
    console.log(`\nTotal: ${toDelete.length} user(s) would be deleted.`);
    return;
  }

  console.log("Deleting users:");
  let deleted = 0;
  let failed = 0;

  for (const u of toDelete) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) {
      console.error(`  FAILED  ${u.email ?? "(no email)"} (${u.id}): ${error.message}`);
      failed++;
    } else {
      console.log(`  deleted ${u.email ?? "(no email)"} (${u.id})`);
      deleted++;
    }
  }

  console.log(`\nDone. Deleted: ${deleted}, Failed: ${failed}.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
