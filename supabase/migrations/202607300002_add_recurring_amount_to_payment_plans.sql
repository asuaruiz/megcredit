-- The recurring charge amount for a financed plan is independent of the sum of
-- megcredit_client_services.price_cents (those stay as reference/total value in the
-- contract). Staff sets the actual per-period charge here when billing_type = 'recurring'.

alter table public.megcredit_payment_plans
  add column if not exists recurring_amount_cents integer check (recurring_amount_cents >= 0);
