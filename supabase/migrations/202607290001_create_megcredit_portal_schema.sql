-- MEG Credit client portal. Shared project: additive objects with megcredit_ prefix only.
-- No Supabase Auth is used here on purpose (auth.users is shared infrastructure across
-- unrelated tenants on this project) -- the portal has its own account/session tables.

create table if not exists public.megcredit_client_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  full_name text not null check (char_length(full_name) between 2 and 160),
  phone text not null default '' check (char_length(phone) <= 40),
  password_hash text,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table public.megcredit_client_accounts is
  'MEG Credit portal client accounts. Not Supabase Auth users -- app-level auth, service-role access only.';

alter table public.megcredit_client_accounts enable row level security;
revoke all on table public.megcredit_client_accounts from anon, authenticated;

create table if not exists public.megcredit_client_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  full_name text not null check (char_length(full_name) between 2 and 160),
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.megcredit_client_invites is
  'Single-use account-creation invites for the MEG Credit portal. Only the SHA-256 hash of the raw token is stored.';

alter table public.megcredit_client_invites enable row level security;
revoke all on table public.megcredit_client_invites from anon, authenticated;

create index if not exists megcredit_client_invites_email_idx
  on public.megcredit_client_invites (email, created_at desc);

create table if not exists public.megcredit_client_sessions (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  user_agent text not null default '' check (char_length(user_agent) <= 500),
  ip_hash text not null check (char_length(ip_hash) = 64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.megcredit_client_sessions is
  'MEG Credit portal sessions. Only the SHA-256 hash of the raw session token is stored.';

alter table public.megcredit_client_sessions enable row level security;
revoke all on table public.megcredit_client_sessions from anon, authenticated;

create index if not exists megcredit_client_sessions_account_idx
  on public.megcredit_client_sessions (client_account_id, expires_at desc);

create table if not exists public.megcredit_client_documents (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  document_type text not null check (document_type in ('id_front', 'id_back', 'selfie_with_id', 'ssn_card', 'proof_of_residency')),
  storage_path text not null unique check (char_length(storage_path) <= 500),
  original_filename text not null default '' check (char_length(original_filename) <= 255),
  mime_type text not null check (char_length(mime_type) <= 100),
  size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.megcredit_client_documents is
  'Metadata for verification documents uploaded to the private megcredit-client-documents Storage bucket. No SSN is ever stored as text -- only as an uploaded document (document_type = ssn_card).';

alter table public.megcredit_client_documents enable row level security;
revoke all on table public.megcredit_client_documents from anon, authenticated;

create index if not exists megcredit_client_documents_account_idx
  on public.megcredit_client_documents (client_account_id, document_type, created_at desc);

create table if not exists public.megcredit_portal_login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  ip_hash text not null check (char_length(ip_hash) = 64),
  success boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.megcredit_portal_login_attempts is
  'Login/activation attempt log for MEG Credit portal rate limiting only.';

alter table public.megcredit_portal_login_attempts enable row level security;
revoke all on table public.megcredit_portal_login_attempts from anon, authenticated;

create index if not exists megcredit_portal_login_attempts_rate_limit_idx
  on public.megcredit_portal_login_attempts (ip_hash, created_at desc);

create index if not exists megcredit_portal_login_attempts_email_idx
  on public.megcredit_portal_login_attempts (email, created_at desc);

-- Private Storage bucket for verification documents. Additive: only inserts MEG Credit's own
-- bucket row, never touches buckets belonging to other tenants of this shared project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'megcredit-client-documents',
  'megcredit-client-documents',
  false,
  15728640, -- 15 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;
