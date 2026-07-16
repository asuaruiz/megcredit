-- Additive change to the MEG Credit-owned table only.
alter table public.megcredit_contact_submissions
  add column if not exists email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed')),
  add column if not exists email_error text,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists manager_notification_sent_at timestamptz;

create index if not exists megcredit_contact_submissions_email_status_idx
  on public.megcredit_contact_submissions (email_status, created_at desc);
