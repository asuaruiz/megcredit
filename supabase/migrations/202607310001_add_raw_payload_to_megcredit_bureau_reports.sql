-- MEG Credit only. Shared project: additive, megcredit_ prefix only.
--
-- Stores the raw ConsumerDirect/SmartCredit API response for source='api' reports so staff
-- can read it while filling in scores/case status in the same review flow already used for
-- PDF uploads -- the exact JSON field names for /v1/credit/3bs/current haven't been observed
-- against a real response yet (blocked on ConsumerDirect whitelisting our proxy IP), so this
-- intentionally does not attempt to auto-map fields we haven't verified.

alter table public.megcredit_client_bureau_reports
  add column if not exists raw_payload jsonb;
