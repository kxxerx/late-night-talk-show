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

-- Upgrade to v0.5
-- Adds shop categories and Supabase Storage avatar uploads.

alter table public.items
add column if not exists category text not null default 'main';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'items_category_check'
  ) then
    alter table public.items
    add constraint items_category_check check (category in ('main', 'cleanse', 'event', 'special'));
  end if;
end $$;

update public.items
set category = 'cleanse'
where category = 'main'
  and (name like '%정화%' or name like '%부적%' or name like '%약병%');

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_public_read'
  ) then
    create policy "avatars_public_read"
    on storage.objects
    for select
    to public
    using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_owner_insert'
  ) then
    create policy "avatars_owner_insert"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_owner_update'
  ) then
    create policy "avatars_owner_update"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_owner_delete'
  ) then
    create policy "avatars_owner_delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;

-- Upgrade to v0.9
-- Golden Mascot gift shop theme + withdrawn profile purge + sample gift shop items.

create or replace function public.admin_purge_withdrawn_profile(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles;
  v_target public.profiles;
begin
  select * into v_admin
  from public.profiles
  where id = auth.uid()
    and role = 'admin'
    and status = 'active';

  if v_admin.id is null then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  if p_target_user_id = auth.uid() then
    raise exception '자기 자신은 삭제할 수 없습니다.';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_user_id;

  if v_target.id is null then
    raise exception '대상 회원을 찾을 수 없습니다.';
  end if;

  if v_target.status <> 'withdrawn' then
    raise exception '탈퇴 처리된 회원만 삭제할 수 있습니다.';
  end if;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), p_target_user_id, 'admin_purge_withdrawn_profile', '탈퇴 회원 사이트 DB 삭제');

  delete from public.profiles
  where id = p_target_user_id
    and status = 'withdrawn';

  return jsonb_build_object('ok', true, 'message', '탈퇴 회원을 사이트 DB에서 삭제했습니다.');
end;
$$;

grant execute on function public.admin_purge_withdrawn_profile(uuid) to authenticated;

-- Existing starter item names are softened into gift-shop style labels.
update public.items
set
  name = '솜사탕 정화수',
  description = '분홍 구름병에 담긴 달콤한 정화수. 마시면 기분 탓인지 오염도가 조금 가라앉습니다.',
  category = 'cleanse',
  price = 30
where name = '정화수';

update public.items
set
  name = '금빛 리본 부적',
  description = '골든 마스코트가 직접 묶었다고 주장하는 리본 부적. 주장일 뿐입니다.',
  category = 'cleanse',
  price = 70
where name = '맑은 부적';

update public.items
set
  name = '별사탕 약병',
  description = '별사탕처럼 보이지만 설명서에는 먹지 말라고 적혀 있습니다. 오염도 감소용.',
  category = 'cleanse',
  price = 120
where name = '검은 약병';

insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order)
select '마스코트 꿀잠 쿠폰', '기프트샵 직원이 추천하는 포근한 수면 쿠폰. 실제 효능은 각자의 양심에 맡깁니다.', 'assets/items/amulet.svg', 45, 'pollution_delta', -8, 'main', true, 40
where not exists (select 1 from public.items where name = '마스코트 꿀잠 쿠폰');

insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order)
select '구름 포장지 세트', '선물을 감싸기 좋고 현실도 살짝 감싸기 좋은 파스텔 포장지 세트.', 'assets/items/bottle.svg', 20, 'pollution_delta', -3, 'main', true, 50
where not exists (select 1 from public.items where name = '구름 포장지 세트');

insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order)
select '야광 별 스티커', '어두운 곳에서 별처럼 빛납니다. 심야 토크쇼 초대장에 붙이면 그럴듯해집니다.', 'assets/items/cleanwater.svg', 15, 'pollution_delta', -2, 'special', true, 60
where not exists (select 1 from public.items where name = '야광 별 스티커');

-- Upgrade to v1.5
-- Public active item read, 유쾌주화 error message, and admin site-profile removal.

grant select on public.items to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'items'
      and policyname = 'items_public_active_read'
  ) then
    create policy "items_public_active_read"
    on public.items
    for select
    to anon, authenticated
    using (is_active = true);
  end if;
end $$;

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
    raise exception '유쾌주화가 부족합니다.';
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

grant execute on function public.purchase_item(uuid) to authenticated;

create or replace function public.admin_remove_profile(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles;
  v_target public.profiles;
begin
  select * into v_admin
  from public.profiles
  where id = auth.uid()
    and role = 'admin'
    and status = 'active';

  if v_admin.id is null then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  if p_target_user_id = auth.uid() then
    raise exception '자기 자신은 제거할 수 없습니다.';
  end if;

  select * into v_target
  from public.profiles
  where id = p_target_user_id;

  if v_target.id is null then
    raise exception '대상 방문객 정보를 찾을 수 없습니다.';
  end if;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), p_target_user_id, 'admin_remove_profile', '관리자가 방문객 정보를 사이트 DB에서 제거');

  delete from public.profiles
  where id = p_target_user_id;

  return jsonb_build_object('ok', true, 'message', '방문객 정보를 사이트 DB에서 제거했습니다. Supabase Auth 계정은 별도로 남을 수 있습니다.');
end;
$$;

grant execute on function public.admin_remove_profile(uuid) to authenticated;

-- Upgrade to v1.6
-- Visitor type, revised visitor status labels, and one-time Midnight Talk Show invitation reward.

alter table public.profiles
add column if not exists visitor_type text not null default 'human';

alter table public.profiles
add column if not exists partner_invite_claimed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_visitor_type_check'
  ) then
    alter table public.profiles
    add constraint profiles_visitor_type_check check (visitor_type in ('human', 'entity'));
  end if;
end $$;

create or replace function public.admin_update_member(
  p_target_user_id uuid,
  p_display_name text,
  p_band_nickname text,
  p_role text,
  p_visitor_type text default 'human'
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

  if p_visitor_type not in ('human', 'entity') then
    raise exception '방문객 유형이 올바르지 않습니다.';
  end if;

  update public.profiles
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), '익명'),
    band_nickname = nullif(trim(p_band_nickname), ''),
    role = p_role,
    visitor_type = p_visitor_type
  where id = p_target_user_id;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), p_target_user_id, 'admin_update_member', '방문객 정보 수정');

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_update_member(uuid, text, text, text, text) to authenticated;

create or replace function public.claim_partner_invitation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_pollution_delta integer := 10;
  v_before integer;
  v_after integer;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception '방문객 정보를 찾을 수 없습니다.';
  end if;

  if v_profile.partner_invite_claimed_at is not null then
    return jsonb_build_object(
      'ok', true,
      'already_claimed', true,
      'message', '이미 초대장을 받았습니다.',
      'currency_delta', 0,
      'pollution_delta', 0,
      'pollution_after', v_profile.pollution
    );
  end if;

  if v_profile.visitor_type = 'entity' then
    v_pollution_delta := 0;
  end if;

  v_before := v_profile.pollution;
  v_after := least(100, v_profile.pollution + v_pollution_delta);

  update public.profiles
  set
    currency = currency + 10,
    pollution = v_after,
    partner_invite_claimed_at = now()
  where id = v_user_id;

  insert into public.currency_logs (user_id, change_amount, reason, related_type, related_id)
  values (v_user_id, 10, '심야 토크쇼 초대장 수령', 'partner_invitation', null);

  if v_pollution_delta <> 0 then
    insert into public.pollution_logs (user_id, change_amount, reason, before_value, after_value, related_type, related_id)
    values (v_user_id, v_after - v_before, '심야 토크쇼 초대장 수령', v_before, v_after, 'partner_invitation', null);
  else
    insert into public.pollution_logs (user_id, change_amount, reason, before_value, after_value, related_type, related_id)
    values (v_user_id, 0, '심야 토크쇼 초대장 수령: 측정 불필요 방문객', v_before, v_after, 'partner_invitation', null);
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_claimed', false,
    'message', case when v_pollution_delta = 0 then '초대장을 받았습니다. 유쾌주화 10개가 지급되었습니다.' else '초대장을 받았습니다. 유쾌주화 10개와 방문객 상태 +10이 반영되었습니다.' end,
    'currency_delta', 10,
    'pollution_delta', v_after - v_before,
    'pollution_after', v_after
  );
end;
$$;

grant execute on function public.claim_partner_invitation() to authenticated;

-- Upgrade to v1.7
-- Password reset request inbox for admins.

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  login_id text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

alter table public.password_reset_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'password_reset_requests'
      and policyname = 'password_reset_requests_admin_select'
  ) then
    create policy "password_reset_requests_admin_select"
    on public.password_reset_requests
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'password_reset_requests'
      and policyname = 'password_reset_requests_admin_update'
  ) then
    create policy "password_reset_requests_admin_update"
    on public.password_reset_requests
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

create or replace function public.submit_password_reset_request(
  p_login_id text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_login_id text := public.normalize_site_id(p_login_id);
begin
  if v_login_id is null or length(v_login_id) < 3 then
    raise exception '아이디를 확인해 주세요.';
  end if;

  insert into public.password_reset_requests (login_id, note)
  values (v_login_id, nullif(trim(coalesce(p_note, '')), ''));

  return jsonb_build_object('ok', true, 'message', '비밀번호 분실 요청을 관리실로 보냈습니다.');
end;
$$;

create or replace function public.admin_resolve_password_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  update public.password_reset_requests
  set status = 'done', resolved_at = now(), resolved_by = auth.uid()
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'message', '비밀번호 분실 요청을 처리 완료로 표시했습니다.');
end;
$$;

grant execute on function public.submit_password_reset_request(text, text) to anon, authenticated;
grant execute on function public.admin_resolve_password_request(uuid) to authenticated;
grant select, update on public.password_reset_requests to authenticated;

-- Upgrade to v1.8
-- Item image upload bucket for admin item management.

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_public_read'
  ) then
    create policy "item_images_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'item-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_admin_insert'
  ) then
    create policy "item_images_admin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'item-images' and public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_admin_update'
  ) then
    create policy "item_images_admin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'item-images' and public.is_admin())
    with check (bucket_id = 'item-images' and public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_admin_delete'
  ) then
    create policy "item_images_admin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'item-images' and public.is_admin());
  end if;
end $$;

-- Upgrade to v2.1
-- Entity mask-collapse system, infected visitor type, audience-specific shop items.

alter table public.profiles
add column if not exists mask_collapse_rate integer not null default 0;

alter table public.profiles
add column if not exists current_life_item_id uuid references public.items(id) on delete set null;

alter table public.items
add column if not exists audience text not null default 'human';

alter table public.items
add column if not exists item_kind text not null default 'regular';

do $$
begin
  alter table public.profiles drop constraint if exists profiles_visitor_type_check;
  alter table public.profiles
  add constraint profiles_visitor_type_check check (visitor_type in ('human', 'infected', 'entity'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.items drop constraint if exists items_audience_check;
  alter table public.items
  add constraint items_audience_check check (audience in ('human', 'infected', 'entity', 'all'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.items drop constraint if exists items_item_kind_check;
  alter table public.items
  add constraint items_item_kind_check check (item_kind in ('regular', 'life', 'mask_care'));
exception
  when duplicate_object then null;
end $$;

-- Existing items are ordinary visitor souvenirs unless already configured otherwise.
update public.items
set audience = coalesce(nullif(audience, ''), 'human'),
    item_kind = coalesce(nullif(item_kind, ''), 'regular')
where audience is null or item_kind is null;

-- Sample infected-only items.
insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
select '규칙서 책갈피', '읽으면 안 되는 곳을 다시 펼치지 않도록 끼워두는 책갈피. 이미 읽은 사람에게만 권장됩니다.', null, 25, 'pollution_delta', -5, 'main', true, 210, 'infected', 'regular'
where not exists (select 1 from public.items where name = '규칙서 책갈피');

insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
select '자아 고정핀', '돌아온 이름이 다시 흘러내리지 않도록 임시로 고정합니다.', null, 75, 'pollution_delta', -12, 'cleanse', true, 220, 'infected', 'regular'
where not exists (select 1 from public.items where name = '자아 고정핀');

-- Sample entity life products.
insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
select 'A의 인생', '평범한 출근길, 익숙한 이름, 아무도 의심하지 않는 얼굴. 착용 즉시 가면 붕괴율이 0으로 초기화됩니다.', null, 100, 'mask_reset', 0, 'main', true, 310, 'entity', 'life'
where not exists (select 1 from public.items where name = 'A의 인생');

insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
select 'B의 인생', '누군가의 가족사진 속 빈자리를 대신 채웁니다. 착용 즉시 가면 붕괴율이 0으로 초기화됩니다.', null, 120, 'mask_reset', 0, 'main', true, 320, 'entity', 'life'
where not exists (select 1 from public.items where name = 'B의 인생');

insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
select 'C의 인생', '이름표는 새것입니다. 기억은 조금 삐걱거립니다. 착용 즉시 가면 붕괴율이 0으로 초기화됩니다.', null, 140, 'mask_reset', 0, 'main', true, 330, 'entity', 'life'
where not exists (select 1 from public.items where name = 'C의 인생');

-- Sample entity mask-care items.
insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
select '가면 수선권', '흘러내리는 표정을 다시 붙입니다. 가면 붕괴율을 조금 낮춥니다.', null, 30, 'mask_delta', -10, 'cleanse', true, 410, 'entity', 'mask_care'
where not exists (select 1 from public.items where name = '가면 수선권');

insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
select '목격자 착각 쿠폰', '방금 본 것을 본 적 없는 일로 만듭니다. 가면 붕괴율을 낮춥니다.', null, 65, 'mask_delta', -20, 'cleanse', true, 420, 'entity', 'mask_care'
where not exists (select 1 from public.items where name = '목격자 착각 쿠폰');

create or replace function public.admin_update_member(
  p_target_user_id uuid,
  p_display_name text,
  p_band_nickname text,
  p_role text,
  p_visitor_type text default 'human'
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

  if p_visitor_type not in ('human', 'infected', 'entity') then
    raise exception '방문객 유형이 올바르지 않습니다.';
  end if;

  update public.profiles
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), '익명'),
    band_nickname = nullif(trim(p_band_nickname), ''),
    role = p_role,
    visitor_type = p_visitor_type
  where id = p_target_user_id;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), p_target_user_id, 'admin_update_member', '방문객 정보 수정');

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_update_member(uuid, text, text, text, text) to authenticated;

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
  v_before integer;
  v_after integer;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id and is_active = true;

  if not found then
    raise exception '구매할 수 없는 물품입니다.';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception '방문객 정보를 찾을 수 없습니다.';
  end if;

  if v_profile.currency < v_item.price then
    raise exception '유쾌주화가 부족합니다.';
  end if;

  -- 괴이 전용 구매 규칙
  if v_profile.visitor_type = 'entity' then
    if v_item.audience <> 'entity' then
      raise exception '이 선반의 물품은 현재 방문객에게 판매할 수 없습니다.';
    end if;

    if v_item.item_kind = 'life' then
      if v_profile.current_life_item_id = p_item_id and v_profile.mask_collapse_rate < 100 then
        raise exception '이미 착용 중인 인생입니다.';
      end if;

      update public.profiles
      set
        currency = currency - v_item.price,
        current_life_item_id = p_item_id,
        mask_collapse_rate = 0
      where id = v_user_id;

      insert into public.purchase_logs (user_id, item_id, item_name, price)
      values (v_user_id, p_item_id, v_item.name, v_item.price);

      insert into public.currency_logs (user_id, change_amount, reason, related_type, related_id)
      values (v_user_id, -v_item.price, '인생 구매: ' || v_item.name, 'item', p_item_id);

      insert into public.pollution_logs (user_id, change_amount, reason, before_value, after_value, related_type, related_id)
      values (v_user_id, 0, '가면 교체: ' || v_item.name, v_profile.mask_collapse_rate, 0, 'entity_life', p_item_id);

      return jsonb_build_object('ok', true, 'message', v_item.name || '을 착용했습니다. 가면 붕괴율이 0으로 초기화됩니다.', 'item_name', v_item.name);
    end if;

    if v_item.item_kind = 'mask_care' then
      if v_profile.current_life_item_id is null then
        raise exception '먼저 착용할 인생을 구입해야 합니다.';
      end if;

      v_before := v_profile.mask_collapse_rate;
      v_after := greatest(0, least(100, v_profile.mask_collapse_rate + v_item.effect_value));

      update public.profiles
      set
        currency = currency - v_item.price,
        mask_collapse_rate = v_after
      where id = v_user_id;

      insert into public.purchase_logs (user_id, item_id, item_name, price)
      values (v_user_id, p_item_id, v_item.name, v_item.price);

      insert into public.currency_logs (user_id, change_amount, reason, related_type, related_id)
      values (v_user_id, -v_item.price, '가면 관리 물품 구매: ' || v_item.name, 'item', p_item_id);

      insert into public.pollution_logs (user_id, change_amount, reason, before_value, after_value, related_type, related_id)
      values (v_user_id, v_after - v_before, '가면 붕괴율 조정: ' || v_item.name, v_before, v_after, 'mask_care', p_item_id);

      return jsonb_build_object('ok', true, 'message', '가면 붕괴율이 ' || v_before || ' → ' || v_after || '로 조정되었습니다.', 'item_name', v_item.name);
    end if;

    raise exception '괴이 방문객에게 판매할 수 없는 물품입니다.';
  end if;

  -- 오염자 전용 구매 규칙
  if v_profile.visitor_type = 'infected' then
    if v_item.audience not in ('infected', 'all') then
      raise exception '이 선반의 물품은 현재 방문객에게 판매할 수 없습니다.';
    end if;
  else
    if v_item.audience not in ('human', 'all') then
      raise exception '이 선반의 물품은 현재 방문객에게 판매할 수 없습니다.';
    end if;
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
  values (v_user_id, -v_item.price, '물품 구매: ' || v_item.name, 'item', p_item_id);

  return jsonb_build_object('ok', true, 'message', '구매 완료', 'item_name', v_item.name);
end;
$$;

grant execute on function public.purchase_item(uuid) to authenticated;

-- Upgrade to v2.2
-- Security contract conversion for fully contaminated human visitors.

create or replace function public.accept_security_contract()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.id is null then
    raise exception '방문객 정보를 찾을 수 없습니다.';
  end if;

  if v_profile.visitor_type <> 'human' then
    raise exception '일반 방문객만 근로계약을 체결할 수 있습니다.';
  end if;

  if v_profile.pollution < 100 then
    raise exception '아직 계약 대상이 아닙니다.';
  end if;

  update public.profiles
  set visitor_type = 'infected'
  where id = auth.uid();

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), auth.uid(), 'accept_security_contract', '오염도 100 도달 후 보안팀 근로계약 체결');

  return jsonb_build_object('ok', true, 'message', '보안팀 근로계약이 체결되었습니다.');
end;
$$;

grant execute on function public.accept_security_contract() to authenticated;

-- Upgrade to v2.4
-- Reset visitor status after security-team contract.

create or replace function public.accept_security_contract()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.id is null then
    raise exception '방문객 정보를 찾을 수 없습니다.';
  end if;

  if v_profile.visitor_type <> 'human' then
    raise exception '일반 방문객만 근로계약을 체결할 수 있습니다.';
  end if;

  if v_profile.pollution < 100 then
    raise exception '아직 계약 대상이 아닙니다.';
  end if;

  update public.profiles
  set visitor_type = 'infected', pollution = 0
  where id = auth.uid();

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), auth.uid(), 'accept_security_contract', '오염도 100 도달 후 보안팀 근로계약 체결 및 방문객 상태 초기화');

  return jsonb_build_object('ok', true, 'message', '축하합니다! 당신은 이제 (주) 백일몽 주식회사의 보안팀에서 근무하게 됩니다!');
end;
$$;

grant execute on function public.accept_security_contract() to authenticated;

-- Upgrade to v2.5
-- Delete event submissions for testing and keep v2.4 contract reset behavior.

create or replace function public.admin_delete_submission(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  delete from public.event_submissions
  where id = p_submission_id;

  insert into public.admin_logs (admin_id, action, detail)
  values (auth.uid(), 'admin_delete_submission', '초대권 제출 내역 삭제: ' || p_submission_id::text);

  return jsonb_build_object('ok', true, 'message', '초대권 제출 내역을 삭제했습니다.');
end;
$$;

grant execute on function public.admin_delete_submission(uuid) to authenticated;

create or replace function public.accept_security_contract()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.id is null then
    raise exception '방문객 정보를 찾을 수 없습니다.';
  end if;

  if v_profile.visitor_type <> 'human' then
    raise exception '일반 방문객만 근로계약을 체결할 수 있습니다.';
  end if;

  if v_profile.pollution < 100 then
    raise exception '아직 계약 대상이 아닙니다.';
  end if;

  update public.profiles
  set visitor_type = 'infected', pollution = 0
  where id = auth.uid();

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (auth.uid(), auth.uid(), 'accept_security_contract', '오염도 100 도달 후 보안팀 근로계약 체결 및 방문객 상태 초기화');

  return jsonb_build_object('ok', true, 'message', '축하합니다! 당신은 이제 (주) 백일몽 주식회사의 보안팀에서 근무하게 됩니다!');
end;
$$;

grant execute on function public.accept_security_contract() to authenticated;
