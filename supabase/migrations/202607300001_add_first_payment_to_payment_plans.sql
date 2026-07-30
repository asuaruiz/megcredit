-- Recurring (financed) plans can require a first payment amount separate from
-- the per-period recurring amount (sum of megcredit_client_services.price_cents).
-- Null/0 for one_time plans, or recurring plans with no separate first payment.

alter table public.megcredit_payment_plans
  add column if not exists first_payment_cents integer check (first_payment_cents >= 0);
