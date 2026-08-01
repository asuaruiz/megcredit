-- MEG Credit accounting ledger and recurring cadence support.
-- Shared project: additive changes scoped exclusively to megcredit_ objects.

alter table public.megcredit_payment_plans
  add column if not exists recurring_interval_count smallint not null default 1
  check (recurring_interval_count between 1 and 52);

comment on column public.megcredit_payment_plans.recurring_interval_count is
  'Stripe recurring interval multiplier. week + 2 means every two weeks.';

create table if not exists public.megcredit_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid not null references public.megcredit_payment_plans (id) on delete cascade,
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  transaction_type text not null check (transaction_type in ('payment', 'refund', 'payment_failed', 'adjustment', 'opening_balance')),
  status text not null check (status in ('succeeded', 'failed', 'pending')),
  amount_cents integer not null,
  currency text not null default 'usd' check (char_length(currency) = 3),
  stripe_event_id text unique,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  description text not null default '' check (char_length(description) <= 500),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.megcredit_payment_transactions is
  'Immutable MEG Credit accounting ledger. Positive payments, negative refunds, failed attempts and staff adjustments.';

alter table public.megcredit_payment_transactions enable row level security;
revoke all on table public.megcredit_payment_transactions from anon, authenticated;

create index if not exists megcredit_payment_transactions_plan_idx
  on public.megcredit_payment_transactions (payment_plan_id, occurred_at desc);
create index if not exists megcredit_payment_transactions_client_idx
  on public.megcredit_payment_transactions (client_account_id, occurred_at desc);

insert into public.megcredit_payment_transactions
  (payment_plan_id, client_account_id, transaction_type, status, amount_cents, currency, description, occurred_at)
select id, client_account_id, 'opening_balance', 'succeeded', amount_paid_cents, currency,
  'Saldo cobrado antes de activar el libro contable', updated_at
from public.megcredit_payment_plans p
where amount_paid_cents > 0
  and not exists (
    select 1 from public.megcredit_payment_transactions t
    where t.payment_plan_id = p.id and t.transaction_type = 'opening_balance'
  );
