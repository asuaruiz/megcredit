-- MEG Credit only. Shared project: additive, megcredit_ prefix only.
--
-- Bureau data (Equifax/Experian/TransUnion scores + dispute status) shown on the client
-- portal home/disputes tabs. Two sources feed the same report/scores/case-status shape:
--   'api'        -- pulled via the ConsumerDirect Partner API for clients enrolled under
--                   MEG Credit's sponsor code (megcredit_client_bureau_links has their
--                   customerToken).
--   'pdf_upload' -- staff uploads a 3-bureau report PDF for clients who were not enrolled
--                   through MEG Credit's sponsor code, parsed and confirmed by staff before
--                   it's shown to the client.

create table if not exists public.megcredit_client_bureau_links (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null unique references public.megcredit_client_accounts (id) on delete cascade,
  provider text not null default 'consumerdirect' check (provider in ('consumerdirect')),
  customer_token text not null unique check (char_length(customer_token) <= 100),
  pid text check (char_length(pid) <= 50),
  sync_status text not null default 'linked' check (sync_status in ('linked', 'syncing', 'error')),
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.megcredit_client_bureau_links is
  'Maps a MEG Credit portal client to their ConsumerDirect customerToken. Only exists for clients enrolled under MEG Credit''s partner sponsor code -- clients without one use the pdf_upload path on megcredit_client_bureau_reports instead.';

alter table public.megcredit_client_bureau_links enable row level security;
revoke all on table public.megcredit_client_bureau_links from anon, authenticated;

create table if not exists public.megcredit_client_bureau_reports (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.megcredit_client_accounts (id) on delete cascade,
  source text not null check (source in ('api', 'pdf_upload')),
  as_of_date date not null,
  storage_path text check (char_length(storage_path) <= 500),
  uploaded_by_staff_id uuid references public.megcredit_staff_accounts (id),
  parse_status text not null default 'pending' check (parse_status in ('pending', 'parsed', 'needs_review', 'confirmed')),
  confirmed_by_staff_id uuid references public.megcredit_staff_accounts (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint megcredit_client_bureau_reports_pdf_has_storage_path
    check (source <> 'pdf_upload' or storage_path is not null)
);

comment on table public.megcredit_client_bureau_reports is
  'One row per bureau-data snapshot (either an API sync or an uploaded 3-bureau PDF). Only parse_status = confirmed reports are shown on the client portal -- parsed PDF data must be staff-reviewed first.';

alter table public.megcredit_client_bureau_reports enable row level security;
revoke all on table public.megcredit_client_bureau_reports from anon, authenticated;

create index if not exists megcredit_client_bureau_reports_account_idx
  on public.megcredit_client_bureau_reports (client_account_id, created_at desc);

create table if not exists public.megcredit_client_bureau_scores (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.megcredit_client_bureau_reports (id) on delete cascade,
  bureau text not null check (bureau in ('equifax', 'experian', 'transunion')),
  score integer check (score between 300 and 850),
  score_date date,
  created_at timestamptz not null default now(),
  unique (report_id, bureau)
);

alter table public.megcredit_client_bureau_scores enable row level security;
revoke all on table public.megcredit_client_bureau_scores from anon, authenticated;

create index if not exists megcredit_client_bureau_scores_report_idx
  on public.megcredit_client_bureau_scores (report_id);

create table if not exists public.megcredit_client_bureau_case_status (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.megcredit_client_bureau_reports (id) on delete cascade,
  bureau text not null check (bureau in ('equifax', 'experian', 'transunion')),
  status_category text not null check (
    status_category in ('unspecified', 'positive', 'deleted', 'repaired', 'updated', 'in_dispute', 'verified', 'negative')
  ),
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  unique (report_id, bureau, status_category)
);

alter table public.megcredit_client_bureau_case_status enable row level security;
revoke all on table public.megcredit_client_bureau_case_status from anon, authenticated;

create index if not exists megcredit_client_bureau_case_status_report_idx
  on public.megcredit_client_bureau_case_status (report_id);

-- Private Storage bucket for staff-uploaded 3-bureau report PDFs. Additive: only inserts
-- MEG Credit's own bucket row, never touches buckets belonging to other tenants of this
-- shared project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'megcredit-bureau-reports',
  'megcredit-bureau-reports',
  false,
  20971520, -- 20 MB
  array['application/pdf']
)
on conflict (id) do nothing;
