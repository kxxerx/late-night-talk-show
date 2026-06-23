-- Pollution Shop Starter
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Clean old objects only if you are reinstalling.
-- If this is your first install, leave these as comments.
-- drop table if exists public.admin_logs cascade;
-- drop table if exists public.pollution_logs cascade;
-- drop table if exists public.currency_logs cascade;
-- drop table if exists public.item_use_logs cascade;
-- drop table if exists public.purchase_logs cascade;
-- drop table if exists public.event_submissions cascade;
-- drop table if exists public.event_codes cascade;
-- drop table if exists public.inventories cascade;
-- drop table if exists public.items cascade;
-- drop table if exists public.profiles cascade;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  site_id text unique not null,
  display_name text,
  band_nickname text,
  role text not null default 'user' check (role in ('user', 'admin')),
  currency integer not null default 0 check (currency >= 0),
  pollution integer not null default 0 check (pollution >= 0 and pollution <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  price integer not null default 0 check (price >= 0),
  effect_type text not null default 'pollution_delta',
  effect_value integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique(user_id, item_id)
);

create table if not exists public.purchase_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  item_name text not null,
  price integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.item_use_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  item_name text not null,
  effect_type text not null,
  effect_value integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text not null default '',
  reward_currency integer not null default 0,
  pollution_delta integer not null default 0,
  reward_item_id uuid references public.items(id) on delete set null,
  reward_item_quantity integer not null default 0 check (reward_item_quantity >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_code_id uuid not null references public.event_codes(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  proof_text text,
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique(user_id, event_code_id)
);

create table if not exists public.currency_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  change_amount integer not null,
  reason text not null,
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.pollution_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  change_amount integer not null,
  before_value integer,
  after_value integer,
  reason text not null,
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- Updated at trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row execute function public.touch_updated_at();

drop trigger if exists trg_event_codes_updated_at on public.event_codes;
create trigger trg_event_codes_updated_at
before update on public.event_codes
for each row execute function public.touch_updated_at();

-- Auto-create profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, site_id, display_name)
  values (
    new.id,
    new.email,
    'U' || upper(substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Security helper
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.inventories enable row level security;
alter table public.purchase_logs enable row level security;
alter table public.item_use_logs enable row level security;
alter table public.event_codes enable row level security;
alter table public.event_submissions enable row level security;
alter table public.currency_logs enable row level security;
alter table public.pollution_logs enable row level security;
alter table public.admin_logs enable row level security;

-- Drop old policies
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','items','inventories','purchase_logs','item_use_logs',
        'event_codes','event_submissions','currency_logs','pollution_logs','admin_logs'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Policies
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "items_select_active_or_admin"
on public.items for select
to authenticated
using (is_active = true or public.is_admin());

create policy "items_admin_all"
on public.items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "inventories_select_own_or_admin"
on public.inventories for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "purchase_logs_select_own_or_admin"
on public.purchase_logs for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "item_use_logs_select_own_or_admin"
on public.item_use_logs for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "event_codes_select_active_or_admin"
on public.event_codes for select
to authenticated
using (is_active = true or public.is_admin());

create policy "event_codes_admin_all"
on public.event_codes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "event_submissions_select_own_or_admin"
on public.event_submissions for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "currency_logs_select_own_or_admin"
on public.currency_logs for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "pollution_logs_select_own_or_admin"
on public.pollution_logs for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "admin_logs_select_admin"
on public.admin_logs for select
to authenticated
using (public.is_admin());

-- User RPC: profile update
create or replace function public.update_my_profile(
  p_display_name text,
  p_band_nickname text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update public.profiles
  set
    display_name = nullif(trim(p_display_name), ''),
    band_nickname = nullif(trim(p_band_nickname), '')
  where id = auth.uid()
  returning * into v_profile;

  return v_profile;
end;
$$;

-- User RPC: purchase item
create or replace function public.purchase_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.items;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id and is_active = true;

  if not found then
    raise exception '구매할 수 없는 아이템입니다.';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if v_profile.currency < v_item.price then
    raise exception '재화가 부족합니다.';
  end if;

  update public.profiles
  set currency = currency - v_item.price
  where id = v_user_id;

  insert into public.inventories (user_id, item_id, quantity)
  values (v_user_id, p_item_id, 1)
  on conflict (user_id, item_id)
  do update set quantity = public.inventories.quantity + 1, updated_at = now();

  insert into public.purchase_logs (user_id, item_id, item_name, price)
  values (v_user_id, p_item_id, v_item.name, v_item.price);

  insert into public.currency_logs (user_id, change_amount, reason, related_type, related_id)
  values (v_user_id, -v_item.price, '아이템 구매: ' || v_item.name, 'item', p_item_id);

  return jsonb_build_object('ok', true, 'message', '구매 완료', 'item_name', v_item.name);
end;
$$;

-- User RPC: use item
create or replace function public.use_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.items;
  v_inventory public.inventories;
  v_before integer;
  v_after integer;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id;

  if not found then
    raise exception '아이템을 찾을 수 없습니다.';
  end if;

  select * into v_inventory
  from public.inventories
  where user_id = v_user_id and item_id = p_item_id
  for update;

  if not found or v_inventory.quantity <= 0 then
    raise exception '보유하지 않은 아이템입니다.';
  end if;

  select pollution into v_before
  from public.profiles
  where id = v_user_id
  for update;

  if v_item.effect_type = 'pollution_delta' then
    v_after := greatest(0, least(100, v_before + v_item.effect_value));

    update public.profiles
    set pollution = v_after
    where id = v_user_id;

    update public.inventories
    set quantity = quantity - 1, updated_at = now()
    where user_id = v_user_id and item_id = p_item_id;

    insert into public.item_use_logs (user_id, item_id, item_name, effect_type, effect_value)
    values (v_user_id, p_item_id, v_item.name, v_item.effect_type, v_item.effect_value);

    insert into public.pollution_logs (user_id, change_amount, before_value, after_value, reason, related_type, related_id)
    values (v_user_id, v_after - v_before, v_before, v_after, '아이템 사용: ' || v_item.name, 'item', p_item_id);

    return jsonb_build_object('ok', true, 'message', '아이템 사용 완료', 'before', v_before, 'after', v_after);
  else
    raise exception '아직 지원하지 않는 아이템 효과입니다.';
  end if;
end;
$$;

-- User RPC: submit event code
create or replace function public.submit_event_code(
  p_code text,
  p_proof_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code public.event_codes;
  v_submission_id uuid;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_code
  from public.event_codes
  where upper(code) = upper(trim(p_code))
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now());

  if not found then
    raise exception '유효하지 않거나 기간이 지난 코드입니다.';
  end if;

  insert into public.event_submissions (user_id, event_code_id, proof_text)
  values (v_user_id, v_code.id, nullif(trim(p_proof_text), ''))
  returning id into v_submission_id;

  return jsonb_build_object('ok', true, 'message', '제출 완료. 관리자 승인 대기 중입니다.', 'submission_id', v_submission_id);
exception
  when unique_violation then
    raise exception '이미 제출한 코드입니다.';
end;
$$;

-- Admin RPC: update member profile mapping/basic values
create or replace function public.admin_update_member(
  p_target_user_id uuid,
  p_display_name text,
  p_band_nickname text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  if p_role not in ('user', 'admin') then
    raise exception 'role 값이 올바르지 않습니다.';
  end if;

  update public.profiles
  set
    display_name = nullif(trim(p_display_name), ''),
    band_nickname = nullif(trim(p_band_nickname), ''),
    role = p_role
  where id = p_target_user_id;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), p_target_user_id, 'admin_update_member', '회원 정보 수정');

  return jsonb_build_object('ok', true);
end;
$$;

-- Admin RPC: adjust currency/pollution
create or replace function public.admin_adjust_member(
  p_target_user_id uuid,
  p_currency_delta integer,
  p_pollution_delta integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
  v_after integer;
  v_reason text := coalesce(nullif(trim(p_reason), ''), '관리자 수동 조정');
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  if p_currency_delta <> 0 then
    update public.profiles
    set currency = greatest(0, currency + p_currency_delta)
    where id = p_target_user_id;

    insert into public.currency_logs (user_id, change_amount, reason, related_type)
    values (p_target_user_id, p_currency_delta, v_reason, 'admin');
  end if;

  if p_pollution_delta <> 0 then
    select pollution into v_before
    from public.profiles
    where id = p_target_user_id
    for update;

    v_after := greatest(0, least(100, v_before + p_pollution_delta));

    update public.profiles
    set pollution = v_after
    where id = p_target_user_id;

    insert into public.pollution_logs (user_id, change_amount, before_value, after_value, reason, related_type)
    values (p_target_user_id, v_after - v_before, v_before, v_after, v_reason, 'admin');
  end if;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (
    auth.uid(),
    p_target_user_id,
    'admin_adjust_member',
    '재화 ' || p_currency_delta || ', 오염도 ' || p_pollution_delta || ', 사유: ' || v_reason
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- Admin RPC: grant item
create or replace function public.admin_grant_item(
  p_target_user_id uuid,
  p_item_id uuid,
  p_quantity integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items;
  v_qty integer := greatest(0, p_quantity);
  v_reason text := coalesce(nullif(trim(p_reason), ''), '관리자 아이템 지급');
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  if v_qty <= 0 then
    raise exception '수량은 1 이상이어야 합니다.';
  end if;

  select * into v_item from public.items where id = p_item_id;
  if not found then
    raise exception '아이템을 찾을 수 없습니다.';
  end if;

  insert into public.inventories (user_id, item_id, quantity)
  values (p_target_user_id, p_item_id, v_qty)
  on conflict (user_id, item_id)
  do update set quantity = public.inventories.quantity + v_qty, updated_at = now();

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), p_target_user_id, 'admin_grant_item', v_item.name || ' x' || v_qty || ', 사유: ' || v_reason);

  return jsonb_build_object('ok', true);
end;
$$;

-- Admin RPC: bulk grant
create or replace function public.admin_bulk_grant(
  p_target_user_ids uuid[],
  p_currency_delta integer,
  p_pollution_delta integer,
  p_item_id uuid,
  p_item_quantity integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  foreach v_uid in array p_target_user_ids loop
    perform public.admin_adjust_member(v_uid, p_currency_delta, p_pollution_delta, p_reason);

    if p_item_id is not null and p_item_quantity > 0 then
      perform public.admin_grant_item(v_uid, p_item_id, p_item_quantity, p_reason);
    end if;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

-- Admin RPC: review event submission
create or replace function public.admin_review_submission(
  p_submission_id uuid,
  p_approve boolean,
  p_admin_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.event_submissions;
  v_code public.event_codes;
  v_before integer;
  v_after integer;
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  select * into v_sub
  from public.event_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception '제출 내역을 찾을 수 없습니다.';
  end if;

  if v_sub.status <> 'pending' then
    raise exception '이미 처리된 제출입니다.';
  end if;

  select * into v_code
  from public.event_codes
  where id = v_sub.event_code_id;

  if p_approve then
    if v_code.reward_currency <> 0 then
      update public.profiles
      set currency = greatest(0, currency + v_code.reward_currency)
      where id = v_sub.user_id;

      insert into public.currency_logs (user_id, change_amount, reason, related_type, related_id)
      values (v_sub.user_id, v_code.reward_currency, '이벤트 승인: ' || v_code.title, 'event_submission', p_submission_id);
    end if;

    if v_code.pollution_delta <> 0 then
      select pollution into v_before
      from public.profiles
      where id = v_sub.user_id
      for update;

      v_after := greatest(0, least(100, v_before + v_code.pollution_delta));

      update public.profiles
      set pollution = v_after
      where id = v_sub.user_id;

      insert into public.pollution_logs (user_id, change_amount, before_value, after_value, reason, related_type, related_id)
      values (v_sub.user_id, v_after - v_before, v_before, v_after, '이벤트 승인: ' || v_code.title, 'event_submission', p_submission_id);
    end if;

    if v_code.reward_item_id is not null and v_code.reward_item_quantity > 0 then
      insert into public.inventories (user_id, item_id, quantity)
      values (v_sub.user_id, v_code.reward_item_id, v_code.reward_item_quantity)
      on conflict (user_id, item_id)
      do update set quantity = public.inventories.quantity + v_code.reward_item_quantity, updated_at = now();
    end if;

    update public.event_submissions
    set status = 'approved',
        admin_note = nullif(trim(p_admin_note), ''),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_submission_id;

    insert into public.admin_logs (admin_id, target_user_id, action, detail)
    values (auth.uid(), v_sub.user_id, 'approve_event_submission', v_code.title);

    return jsonb_build_object('ok', true, 'status', 'approved');
  else
    update public.event_submissions
    set status = 'rejected',
        admin_note = nullif(trim(p_admin_note), ''),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_submission_id;

    insert into public.admin_logs (admin_id, target_user_id, action, detail)
    values (auth.uid(), v_sub.user_id, 'reject_event_submission', v_code.title);

    return jsonb_build_object('ok', true, 'status', 'rejected');
  end if;
end;
$$;

-- Seed items
insert into public.items (name, description, image_url, price, effect_type, effect_value, sort_order)
values
  ('정화수', '사용하면 오염도가 10 감소합니다.', 'assets/items/cleanwater.svg', 30, 'pollution_delta', -10, 10),
  ('맑은 부적', '사용하면 오염도가 20 감소합니다.', 'assets/items/amulet.svg', 70, 'pollution_delta', -20, 20),
  ('검은 약병', '사용하면 오염도가 30 감소합니다. 부작용은 아직 구현하지 않았습니다. 인간의 욕망이 또 시스템을 앞질렀습니다.', 'assets/items/bottle.svg', 120, 'pollution_delta', -30, 30)
on conflict do nothing;

-- Seed event code example
insert into public.event_codes (code, title, description, reward_currency, pollution_delta, is_active)
values ('TEST2026', '테스트 이벤트', '테스트용 코드입니다. 승인하면 재화 +20, 오염도 +5가 적용됩니다.', 20, 5, true)
on conflict (code) do nothing;

-- ------------------------------------------------------------
-- Manual grants for projects where:
-- Enable Data API = ON
-- Automatically expose new tables = OFF
-- Enable automatic RLS = ON
--
-- These grants allow the client library to reach the tables/functions.
-- Actual row-level access is still controlled by RLS policies above.
-- ------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.items to authenticated;
grant select on public.inventories to authenticated;
grant select on public.purchase_logs to authenticated;
grant select on public.item_use_logs to authenticated;
grant select on public.event_codes to authenticated;
grant select on public.event_submissions to authenticated;
grant select on public.currency_logs to authenticated;
grant select on public.pollution_logs to authenticated;
grant select on public.admin_logs to authenticated;

-- Admin pages insert items and event codes directly.
-- RLS policies still restrict these actions to admin users only.
grant insert, update, delete on public.items to authenticated;
grant insert, update, delete on public.event_codes to authenticated;

-- Users do not directly insert/update sensitive tables.
-- Purchase, item usage, event submissions, and admin adjustments go through RPC functions.
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.purchase_item(uuid) to authenticated;
grant execute on function public.use_item(uuid) to authenticated;
grant execute on function public.submit_event_code(text, text) to authenticated;
grant execute on function public.admin_update_member(uuid, text, text, text) to authenticated;
grant execute on function public.admin_adjust_member(uuid, integer, integer, text) to authenticated;
grant execute on function public.admin_grant_item(uuid, uuid, integer, text) to authenticated;
grant execute on function public.admin_bulk_grant(uuid[], integer, integer, uuid, integer, text) to authenticated;
grant execute on function public.admin_review_submission(uuid, boolean, text) to authenticated;

-- Future objects: safer defaults for later expansion.
alter default privileges in schema public
grant select on tables to authenticated;

alter default privileges in schema public
grant execute on functions to authenticated;

-- Upgrade to v0.4
-- Run this once if you already installed an older version.

alter table public.profiles
add column if not exists avatar_url text;

alter table public.profiles
add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
    add constraint profiles_status_check check (status in ('active', 'withdrawn'));
  end if;
end $$;

create unique index if not exists profiles_site_id_lower_idx
on public.profiles (lower(site_id));

create or replace function public.normalize_site_id(raw_value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(raw_value, ''), '[^a-zA-Z0-9_-]', '', 'g'));
$$;

create or replace function public.is_site_id_available(p_site_id text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_site_id text := public.normalize_site_id(p_site_id);
begin
  if length(v_site_id) < 3 or length(v_site_id) > 20 then
    return false;
  end if;

  return not exists (
    select 1 from public.profiles
    where lower(site_id) = v_site_id
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id text;
  v_display_name text;
begin
  v_site_id := public.normalize_site_id(new.raw_user_meta_data->>'site_id');

  if v_site_id is null or v_site_id = '' then
    v_site_id := 'u' || lower(substr(new.id::text, 1, 8));
  end if;

  if exists (select 1 from public.profiles where lower(site_id) = v_site_id) then
    v_site_id := 'u' || lower(substr(new.id::text, 1, 8));
  end if;

  v_display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if v_display_name is null then
    v_display_name := v_site_id;
  end if;

  insert into public.profiles (id, email, site_id, display_name, avatar_url, status)
  values (
    new.id,
    new.email,
    v_site_id,
    v_display_name,
    nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), ''),
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.update_my_profile(
  p_display_name text,
  p_band_nickname text,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update public.profiles
  set
    display_name = nullif(trim(p_display_name), ''),
    band_nickname = nullif(trim(p_band_nickname), ''),
    avatar_url = nullif(trim(coalesce(p_avatar_url, '')), '')
  where id = auth.uid()
    and status = 'active'
  returning * into v_profile;

  if v_profile.id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  return v_profile;
end;
$$;

create or replace function public.withdraw_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update public.profiles
  set
    status = 'withdrawn',
    display_name = '탈퇴한 사용자',
    band_nickname = null,
    avatar_url = null,
    currency = 0,
    pollution = 0
  where id = v_user_id;

  update public.inventories
  set quantity = 0, updated_at = now()
  where user_id = v_user_id;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (null, v_user_id, 'withdraw_my_account', '사용자 직접 탈퇴/비활성화');

  return jsonb_build_object('ok', true, 'message', '탈퇴 처리되었습니다.');
end;
$$;

grant execute on function public.normalize_site_id(text) to authenticated, anon;
grant execute on function public.is_site_id_available(text) to authenticated, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;
grant execute on function public.withdraw_my_account() to authenticated;
