-- ============================================================
-- DocPull Supabase Setup
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES TABLE (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  plan text default 'demo',
  demo_remaining integer default 3,
  stripe_customer_id text,
  docs_used_this_month integer default 0,
  billing_cycle_start timestamptz default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role can do everything (for API routes)
create policy "Service role full access"
  on public.profiles for all
  using (true)
  with check (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. DOCUMENTS TABLE
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_type text,
  file_size integer,
  status text default 'processing',
  extracted_data jsonb,
  confidence numeric,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.documents enable row level security;

-- Users can CRUD their own documents
create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- 3. STORAGE BUCKET for uploads
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false);

-- Users can upload to their own folder
create policy "Users can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own files
create policy "Users can read own files"
  on storage.objects for select
  using (
    bucket_id = 'uploads' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- DONE! All tables, policies, and triggers are set up.
-- ============================================================
