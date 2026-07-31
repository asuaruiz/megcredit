alter table public.megcredit_service_agreements
  add column if not exists pdf_storage_path text,
  add column if not exists pdf_original_filename text,
  add column if not exists pdf_size_bytes bigint;

comment on column public.megcredit_service_agreements.pdf_storage_path is
  'Private megcredit-client-documents Storage path for an optional uploaded PDF contract.';
