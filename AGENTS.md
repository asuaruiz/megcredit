# Project operating notes

- The Supabase project used by this site is **shared with other websites**.
- Database work must be additive and scoped to the `megcredit_` prefix.
- Never delete, truncate, rename, alter, or reuse unrelated Supabase objects or data.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or in variables prefixed with `VITE_`.
- Contact submissions belong only in `public.megcredit_contact_submissions`.
