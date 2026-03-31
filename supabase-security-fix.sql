-- ============================================================
-- DocPull Security Fix
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- REMOVE the overly permissive "Service role full access" policy
-- (Service role key bypasses RLS automatically, so this policy
-- was just opening a hole for anon/authenticated users)
drop policy if exists "Service role full access" on public.profiles;

-- Add policy so the trigger function can insert profiles on signup
-- (runs as security definer, so it bypasses RLS, but this is cleaner)
create policy "System can insert profiles"
  on public.profiles for insert
  with check (true);

-- ============================================================
-- DONE! The security hole is patched.
-- ============================================================
