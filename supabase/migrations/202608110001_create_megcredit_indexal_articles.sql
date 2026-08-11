-- MEG Credit only. Shared Supabase project: additive objects with megcredit_ prefix.
-- Stores articles delivered by the Indexal (getindexal.com) publishing webhook.
-- Separate from megcredit_blog_posts (hand-authored, block-based content) because
-- Indexal delivers full HTML/Markdown plus its own editorial metadata (author, CTA,
-- hero/infographic images) and can deliver the same article in multiple languages.
create table if not exists public.megcredit_indexal_articles (
  id uuid primary key default gen_random_uuid(),
  indexal_article_id text not null unique,
  language_code text not null check (language_code ~ '^[a-z]{2}$'),
  translation_group_id text not null,
  parent_article_id text,
  is_translation boolean not null default false,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  meta_description text,
  content_html text not null,
  content_markdown text,
  hero_image_url text,
  infographic_image_url text,
  infographic_html text,
  keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(keywords) = 'array'),
  faq_schema jsonb not null default '[]'::jsonb check (jsonb_typeof(faq_schema) = 'array'),
  word_count integer,
  reading_time_minutes integer,
  author_name text,
  author_bio text,
  author_logo_url text,
  cta_url text,
  cta_label text,
  cta_as_button boolean,
  status text not null default 'published',
  indexal_published_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One published slug per language: es and en get independent URLs, per Indexal's
  -- multi-language delivery model (translations are separate webhook deliveries).
  unique (language_code, slug)
);

comment on table public.megcredit_indexal_articles is
  'Articles delivered by the Indexal (getindexal.com) publishing webhook for megcredit.com only. Shared project; do not reuse for other tenants.';

alter table public.megcredit_indexal_articles enable row level security;
revoke all on table public.megcredit_indexal_articles from anon, authenticated;

create index if not exists megcredit_indexal_articles_published_idx
  on public.megcredit_indexal_articles (is_published, language_code, indexal_published_at desc);

create index if not exists megcredit_indexal_articles_translation_group_idx
  on public.megcredit_indexal_articles (translation_group_id);
