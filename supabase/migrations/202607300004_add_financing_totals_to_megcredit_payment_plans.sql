alter table public.megcredit_payment_plans
  add column if not exists total_amount_cents integer check (total_amount_cents >= 0),
  add column if not exists amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0);

comment on column public.megcredit_payment_plans.total_amount_cents is
  'Maximum financed amount. Recurring Stripe billing is stopped when successful payments reach this amount.';

update public.megcredit_payment_plans as plan
set total_amount_cents = totals.total_cents
from (
  select payment_plan_id, sum(price_cents)::integer as total_cents
  from public.megcredit_client_services
  group by payment_plan_id
) as totals
where plan.id = totals.payment_plan_id
  and plan.total_amount_cents is null;
