# Supabase Migrations - Run & Validate

This directory contains SQL migrations and helper scripts for the Supabase backend.

How to run migrations

# Run migrations (recommended using the Supabase CLI)
supabase db push

Validate migration results

# Validate migration results and simulate a signup
node scripts/validateMigration.js --email test@example.com

Promote a user to admin

node scripts/validateMigration.js --promote test@example.com

Notes & troubleshooting

- The `validateMigration.js` script requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables.
- Run the backfill migration (`20251017090000_backfill_users_and_profiles.sql`) before validating if you have existing accounts.
- The `create_profile_trigger` migration must be applied with the service role. If the trigger isn't present, the script will attempt to insert a `profiles` row manually.
- If validation fails due to RLS, ensure RLS policies are applied and the `is_admin` helper exists.
- To revert migrations, use your normal DB migration workflow or restore a DB backup. Always backup before applying to production.
