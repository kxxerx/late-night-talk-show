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
