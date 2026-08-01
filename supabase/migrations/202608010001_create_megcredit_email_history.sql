-- Auditable delivery attempts for MEG Credit transactional email.
-- Shared Supabase project: this adds only a MEG Credit-prefixed object.
create table if not exists public.megcredit_email_history (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null check (char_length(recipient_email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 300),
  email_type text not null default 'transactional' check (char_length(email_type) between 1 and 80),
  status text not null check (status in ('sent', 'failed')),
  provider text not null default 'resend' check (char_length(provider) <= 40),
  provider_message_id text check (char_length(provider_message_id) <= 200),
  error_message text check (char_length(error_message) <= 500),
  created_at timestamptz not null default now()
);

comment on table public.megcredit_email_history is
  'MEG Credit transactional email attempts. Stores delivery metadata only, never message HTML, tokens, or credentials.';

alter table public.megcredit_email_history enable row level security;
revoke all on table public.megcredit_email_history from anon, authenticated;

create index if not exists megcredit_email_history_created_at_idx
  on public.megcredit_email_history (created_at desc);

create index if not exists megcredit_email_history_recipient_idx
  on public.megcredit_email_history (recipient_email, created_at desc);
