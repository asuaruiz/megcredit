-- MEG Credit only. Shared project: additive, megcredit_ prefix only.
--
-- NOTE on megcredit_client_credit_monitoring: this is a deliberate, informed exception to the
-- "never store third-party credentials as text" guidance elsewhere in this project. MEG Credit's
-- staff need the client's actual credit-monitoring login (IdentityIQ/SmartCredit/etc.) to pull
-- reports on their behalf -- this is standard practice in credit-repair software (e.g.
-- CreditRepairCloud). password_encrypted/security_word_encrypted are encrypted at the
-- application layer (AES-256-GCM, api/_lib/crypto.js) before being written here, so a raw
-- database read does not expose plaintext credentials.
create table if not exists public.megcredit_client_credit_monitoring (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null unique references public.megcredit_client_accounts (id) on delete cascade,
  provider text not null check (provider in ('identityiq', 'smartcredit', 'myscoreiq', 'other')),
  username text not null check (char_length(username) between 1 and 254),
  password_encrypted text not null,
  phone text not null default '' check (char_length(phone) <= 40),
  security_word_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.megcredit_client_credit_monitoring enable row level security;
revoke all on table public.megcredit_client_credit_monitoring from anon, authenticated;

alter table public.megcredit_service_agreements
  add column if not exists signature_image_path text;
