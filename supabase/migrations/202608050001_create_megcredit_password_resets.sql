-- MEG Credit client portal. Additive: only new megcredit_ objects.

create table if not exists public.megcredit_client_password_resets (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.megcredit_client_password_resets is
  'Single-use "forgot password" reset links for the MEG Credit portal. Only the SHA-256 hash of the raw token is stored.';

alter table public.megcredit_client_password_resets enable row level security;
revoke all on table public.megcredit_client_password_resets from anon, authenticated;

create index if not exists megcredit_client_password_resets_account_idx
  on public.megcredit_client_password_resets (client_account_id, created_at desc);
