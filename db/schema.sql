-- ═══════════════════════════════════════════════════════════════
-- Cybernet AI · Конструктор скриптов — схема и политики доступа
--
-- Выполнять в Supabase → SQL Editor. Скрипт идемпотентный: можно
-- прогонять повторно, существующие таблицы и политики не ломаются.
--
-- ЗАЧЕМ ЭТО В РЕПОЗИТОРИИ: анонимный ключ в supabase-client.js публичен
-- по своей природе (роль "anon" зашита в сам токен). Единственная
-- граница безопасности — RLS. Пока политики жили только в дашборде, их
-- нельзя было ни проверить на код-ревью, ни восстановить после аварии.
-- ═══════════════════════════════════════════════════════════════

-- ─── Таблицы ───────────────────────────────────────────────────

create table if not exists cs_profiles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  data        jsonb not null default '{}'::jsonb,
  is_shared   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists cs_references (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  script_type   text default '',
  niche         text default '',
  goal          text default '',
  tone          text default '',
  tags          text[] default '{}',
  notes         text default '',
  profile_data  jsonb not null default '{}'::jsonb,
  is_shared     boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists cs_edits (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  block_title  text default '',
  intent       text default '',
  ai_ru        text default '',
  ai_uz        text default '',
  final_ru     text default '',
  final_uz     text default '',
  ai_title     text default '',   -- обучение на переименованиях блоков
  final_title  text default '',
  niche        text default '',
  goal         text default ''
);

create table if not exists cs_user_settings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  llm_settings jsonb not null default '{}'::jsonb,  -- БЕЗ ключей провайдеров
  prompts      jsonb not null default '{}'::jsonb,
  theme        text default 'dark',
  updated_at   timestamptz not null default now()
);

-- Колонки для обучения на заголовках могли отсутствовать в старой базе
alter table cs_edits add column if not exists ai_title text;
alter table cs_edits add column if not exists final_title text;

-- ─── Индексы под реальные запросы клиента ──────────────────────
create index if not exists cs_profiles_owner_updated   on cs_profiles   (owner_id, updated_at desc);
create index if not exists cs_references_owner_updated on cs_references (owner_id, updated_at desc);
create index if not exists cs_edits_owner_created      on cs_edits      (owner_id, created_at desc);
create index if not exists cs_profiles_shared          on cs_profiles   (is_shared) where is_shared;
create index if not exists cs_references_shared        on cs_references (is_shared) where is_shared;

-- ─── RLS ───────────────────────────────────────────────────────
alter table cs_profiles      enable row level security;
alter table cs_references    enable row level security;
alter table cs_edits         enable row level security;
alter table cs_user_settings enable row level security;

-- Профили: свои — полный доступ; чужие — только чтение и только общие.
-- Приложение опирается ровно на это: cloudPushProfiles пропускает чужие
-- (_readOnly), а править их можно лишь через «Скопировать себе».
drop policy if exists cs_profiles_own    on cs_profiles;
drop policy if exists cs_profiles_shared on cs_profiles;
create policy cs_profiles_own on cs_profiles
  for all  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy cs_profiles_shared on cs_profiles
  for select using (is_shared and auth.uid() is not null);

-- Эталоны: та же модель. Без второй политики кнопка «поделиться»
-- бессмысленна, с одной лишь первой — чужие эталоны не видны вовсе.
drop policy if exists cs_references_own    on cs_references;
drop policy if exists cs_references_shared on cs_references;
create policy cs_references_own on cs_references
  for all  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy cs_references_shared on cs_references
  for select using (is_shared and auth.uid() is not null);

-- Правки для обучения — строго личные, ничем не делятся.
drop policy if exists cs_edits_own on cs_edits;
create policy cs_edits_own on cs_edits
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Настройки — строго свои.
drop policy if exists cs_user_settings_own on cs_user_settings;
create policy cs_user_settings_own on cs_user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Разовая уборка: вычистить ключи, попавшие в базу раньше ───
-- До версии v64 объект настроек писался целиком, вместе с ключами
-- провайдеров. Строки останутся с ключами, пока их не перезапишут,
-- поэтому убираем их явно.
update cs_user_settings
   set llm_settings = llm_settings - 'apiKey' - 'geminiApiKey' - 'openaiApiKey'
 where llm_settings ?| array['apiKey','geminiApiKey','openaiApiKey'];

-- ─── Ретенция правок (по желанию) ──────────────────────────────
-- cs_edits растёт бесконечно, а в промпт идут только последние 30.
-- delete from cs_edits where created_at < now() - interval '12 months';

-- ─── Проверка изоляции ─────────────────────────────────────────
-- Под своим логином должно вернуть только свои строки и общие чужие:
--   select owner_id, name, is_shared from cs_references order by updated_at desc;
-- Анонимом (без входа) — ноль строк во всех четырёх таблицах.
