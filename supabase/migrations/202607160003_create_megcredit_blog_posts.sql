-- MEG Credit only. Shared Supabase project: additive objects with megcredit_ prefix.
create table if not exists public.megcredit_blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 10 and 180),
  excerpt text not null check (char_length(excerpt) between 30 and 320),
  category text not null check (char_length(category) between 2 and 80),
  read_time text not null default '5 min' check (char_length(read_time) <= 20),
  content jsonb not null default '[]'::jsonb check (jsonb_typeof(content) = 'array'),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  author_name text not null default 'Equipo educativo de Magic Enterprise Group',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.megcredit_blog_posts is
  'Published and draft blog content for megcredit.com only. Shared project; do not reuse for other tenants.';

alter table public.megcredit_blog_posts enable row level security;
revoke all on table public.megcredit_blog_posts from anon, authenticated;

create index if not exists megcredit_blog_posts_published_idx
  on public.megcredit_blog_posts (is_published, published_at desc);
