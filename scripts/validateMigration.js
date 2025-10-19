#!/usr/bin/env node
/*
  Validation script for Supabase migrations.
  Usage:
    node scripts/validateMigration.js --email test@example.com
    node scripts/validateMigration.js --promote test@example.com

  Environment variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
*/

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(chalk.red('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function simulateSignup(email) {
  // We'll insert into auth.users using the service role - this simulates signup
  const id = crypto.randomUUID();
  const raw_meta = JSON.stringify({ full_name: 'Migration Test User' });

  const insertSql = `
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
    VALUES ($1, $2, $3, now())
    RETURNING id, email;
  `;

  const { data, error } = await supabase.rpc('sql', { q: insertSql, params: [id, email, raw_meta] }).catch(e => ({ error: e }));
  // Note: supabase.js doesn't expose raw SQL by default through RPC. We'll use direct table insert instead.
  const { data: u, error: uErr } = await supabase.from('auth.users').insert({ id, email, raw_user_meta_data: { full_name: 'Migration Test User' } }).select('id,email').single().catch(e => ({ error: e }));

  if (uErr) {
    console.error(chalk.red('❌ FAIL: Could not insert into auth.users:'), uErr.message || uErr);
    process.exit(1);
  }

  console.log(chalk.green(`✅ Inserted test auth.user ${email} as ${u.id}`));
  return u.id;
}

async function checkProfileExists(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.error(chalk.red('❌ FAIL: Error selecting profile:'), error.message || error);
    return false;
  }
  if (!data) {
    console.log(chalk.yellow('⚠️ Profile not found yet'));
    return false;
  }
  // Basic checks
  const checks = [];
  checks.push({ name: 'id present', ok: !!data.id });
  checks.push({ name: 'created_at present', ok: !!data.created_at });
  checks.push({ name: 'is_admin default false', ok: data.is_admin === false || data.is_admin === null });

  let allOk = true;
  for (const c of checks) {
    if (c.ok) console.log(chalk.green(`✅ PASS: ${c.name}`));
    else { console.log(chalk.red(`❌ FAIL: ${c.name}`)); allOk = false; }
  }

  return allOk;
}

async function promoteUserByEmail(email) {
  const { data: u, error: uErr } = await supabase.from('auth.users').select('id,email').eq('email', email).maybeSingle();
  if (uErr || !u) {
    console.error(chalk.red(`❌ FAIL: Could not find auth.user with email ${email}`));
    process.exit(1);
  }
  const userId = u.id;
  const { error } = await supabase.from('profiles').update({ is_admin: true }).eq('id', userId);
  if (error) {
    console.error(chalk.red('❌ FAIL: Could not promote user to admin:'), error.message || error);
    process.exit(1);
  }
  console.log(chalk.green(`Promoted ${email} to admin successfully.`));
}

(async function main() {
  try {
    if (argv.promote) {
      await promoteUserByEmail(argv.promote);
      process.exit(0);
    }

    const email = argv.email || `migration-test-${Date.now()}@example.com`;
    const userId = await simulateSignup(email);

    // Wait up to 10 seconds for the trigger to create the profile
    const start = Date.now();
    let ok = false;
    while (Date.now() - start < 10000) {
      ok = await checkProfileExists(userId);
      if (ok) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (!ok) {
      console.error(chalk.red('❌ FAIL: Profile not created within timeout'));
      process.exit(1);
    }

    console.log(chalk.green('All validations passed ✅'));
    process.exit(0);
  } catch (err) {
    console.error(chalk.red('Unexpected error:'), err);
    process.exit(1);
  }
})();
