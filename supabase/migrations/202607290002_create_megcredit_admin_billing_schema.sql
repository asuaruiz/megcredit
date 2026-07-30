-- MEG Credit staff/admin + services/billing schema. Shared project: additive, megcredit_ prefix only.

create table if not exists public.megcredit_staff_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  full_name text not null check (char_length(full_name) between 2 and 160),
  password_hash text not null,
  role text not null default 'admin' check (role in ('admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table public.megcredit_staff_accounts is
  'MEG Credit staff/admin accounts for the internal portal. Separate from client accounts on purpose.';

alter table public.megcredit_staff_accounts enable row level security;
revoke all on table public.megcredit_staff_accounts from anon, authenticated;

create table if not exists public.megcredit_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_account_id uuid not null references public.megcredit_staff_accounts (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  user_agent text not null default '' check (char_length(user_agent) <= 500),
  ip_hash text not null check (char_length(ip_hash) = 64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.megcredit_staff_sessions enable row level security;
revoke all on table public.megcredit_staff_sessions from anon, authenticated;

create index if not exists megcredit_staff_sessions_account_idx
  on public.megcredit_staff_sessions (staff_account_id, expires_at desc);

create table if not exists public.megcredit_service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  default_price_cents integer not null check (default_price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.megcredit_service_catalog enable row level security;
revoke all on table public.megcredit_service_catalog from anon, authenticated;

create table if not exists public.megcredit_payment_plans (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  created_by_staff_id uuid references public.megcredit_staff_accounts (id),
  billing_type text not null check (billing_type in ('one_time', 'recurring')),
  recurring_interval text check (recurring_interval in ('week', 'month', 'year')),
  currency text not null default 'usd' check (char_length(currency) = 3),
  status text not null default 'draft' check (status in ('draft', 'awaiting_payment', 'active', 'paid', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint megcredit_payment_plans_interval_check
    check ((billing_type = 'recurring' and recurring_interval is not null) or (billing_type = 'one_time' and recurring_interval is null))
);

comment on table public.megcredit_payment_plans is
  'One billing arrangement (one-time or recurring) covering a set of megcredit_client_services for a client.';

alter table public.megcredit_payment_plans enable row level security;
revoke all on table public.megcredit_payment_plans from anon, authenticated;

create index if not exists megcredit_payment_plans_client_idx
  on public.megcredit_payment_plans (client_account_id, created_at desc);

create index if not exists megcredit_payment_plans_stripe_session_idx
  on public.megcredit_payment_plans (stripe_checkout_session_id);

create index if not exists megcredit_payment_plans_stripe_subscription_idx
  on public.megcredit_payment_plans (stripe_subscription_id);

create table if not exists public.megcredit_client_services (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid not null references public.megcredit_payment_plans (id) on delete cascade,
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  service_catalog_id uuid references public.megcredit_service_catalog (id),
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now()
);

alter table public.megcredit_client_services enable row level security;
revoke all on table public.megcredit_client_services from anon, authenticated;

create index if not exists megcredit_client_services_plan_idx
  on public.megcredit_client_services (payment_plan_id);

create index if not exists megcredit_client_services_client_idx
  on public.megcredit_client_services (client_account_id, created_at desc);

create table if not exists public.megcredit_service_agreements (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  payment_plan_id uuid not null references public.megcredit_payment_plans (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  body_text text not null check (char_length(body_text) between 10 and 20000),
  status text not null default 'pending' check (status in ('pending', 'signed', 'void')),
  signed_full_name text,
  signed_at timestamptz,
  signature_ip_hash text,
  signature_user_agent text,
  created_by_staff_id uuid references public.megcredit_staff_accounts (id),
  created_at timestamptz not null default now()
);

alter table public.megcredit_service_agreements enable row level security;
revoke all on table public.megcredit_service_agreements from anon, authenticated;

create index if not exists megcredit_service_agreements_client_idx
  on public.megcredit_service_agreements (client_account_id, created_at desc);

create index if not exists megcredit_service_agreements_plan_idx
  on public.megcredit_service_agreements (payment_plan_id);

create table if not exists public.megcredit_stripe_webhook_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

comment on table public.megcredit_stripe_webhook_events is
  'Processed Stripe event IDs for MEG Credit, so retried webhook deliveries are only applied once.';

alter table public.megcredit_stripe_webhook_events enable row level security;
revoke all on table public.megcredit_stripe_webhook_events from anon, authenticated;

alter table public.megcredit_client_accounts
  add column if not exists stripe_customer_id text;
