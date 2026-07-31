alter table public.megcredit_service_agreements
  add column if not exists archived boolean not null default false;

comment on column public.megcredit_service_agreements.archived is
  'Staff-controlled: hides a signed agreement from the active list, typically after its service plan is canceled.';
