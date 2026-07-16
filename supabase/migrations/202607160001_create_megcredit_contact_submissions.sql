-- MEG Credit only. This project is shared; this migration is intentionally additive.
create table if not exists public.megcredit_contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 40),
  email text not null check (char_length(email) between 3 and 254),
  goal text not null default '' check (char_length(goal) <= 120),
  message text not null default '' check (char_length(message) <= 2000),
  consent boolean not null check (consent = true),
  source text not null default 'megcredit.com' check (source = 'megcredit.com'),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  ip_hash text not null check (char_length(ip_hash) = 64),
  user_agent text not null default '' check (char_length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.megcredit_contact_submissions is
  'Private contact submissions from megcredit.com. Supabase project is shared; do not mix with other tenants.';

alter table public.megcredit_contact_submissions enable row level security;
revoke all on table public.megcredit_contact_submissions from anon, authenticated;

create index if not exists megcredit_contact_submissions_created_at_idx
  on public.megcredit_contact_submissions (created_at desc);

create index if not exists megcredit_contact_submissions_status_idx
  on public.megcredit_contact_submissions (status, created_at desc);

create index if not exists megcredit_contact_submissions_rate_limit_idx
  on public.megcredit_contact_submissions (ip_hash, created_at desc);
