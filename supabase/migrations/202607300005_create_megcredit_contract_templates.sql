create table if not exists public.megcredit_contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  storage_path text not null,
  original_filename text not null,
  size_bytes bigint,
  created_by_staff_id uuid references public.megcredit_staff_accounts (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.megcredit_contract_templates is
  'Reusable PDF contract templates staff can upload, name, and attach to a client service plan instead of writing text.';

alter table public.megcredit_contract_templates enable row level security;
revoke all on table public.megcredit_contract_templates from anon, authenticated;

create index if not exists megcredit_contract_templates_created_idx
  on public.megcredit_contract_templates (created_at desc);
