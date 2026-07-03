-- Exploration affiliation patch for pollution-shop-starter v5.2
-- 목적: 기존 profiles에 탐사 홈페이지에서 사용할 캐릭터/소속 컬럼을 추가한다.
-- 실행 위치: Supabase SQL Editor
-- 주의: service_role key, DB password, JWT secret은 프론트엔드에 넣지 않는다.

alter table public.profiles
add column if not exists character_key text;

alter table public.profiles
add column if not exists organization_code text not null default 'unaffiliated';

alter table public.profiles
add column if not exists department_code text not null default 'none';

alter table public.profiles
add column if not exists affiliation_label text not null default '무소속';

-- 기존 데이터 중 null 또는 빈 문자열을 안전한 기본값으로 보정한다.
update public.profiles
set
  organization_code = coalesce(nullif(trim(organization_code), ''), 'unaffiliated'),
  department_code = coalesce(nullif(trim(department_code), ''), 'none'),
  affiliation_label = coalesce(nullif(trim(affiliation_label), ''), '무소속')
where organization_code is null
   or department_code is null
   or affiliation_label is null
   or trim(organization_code) = ''
   or trim(department_code) = ''
   or trim(affiliation_label) = '';

-- 허용값 제약. 기존 이름이 있으면 제거 후 재생성한다.
do $$
begin
  alter table public.profiles drop constraint if exists profiles_organization_code_check;
  alter table public.profiles
  add constraint profiles_organization_code_check
  check (organization_code in ('baekildream', 'disaster_agency', 'entity', 'unaffiliated', 'other'));

  alter table public.profiles drop constraint if exists profiles_department_code_check;
  alter table public.profiles
  add constraint profiles_department_code_check
  check (department_code in ('field_exploration', 'research', 'security', 'agent', 'entity', 'none', 'other'));
end $$;

-- character_key는 캐릭터 버전 식별자다. null은 허용하되, 값이 있는 경우 중복을 막는다.
create unique index if not exists profiles_character_key_unique_idx
on public.profiles (lower(character_key))
where character_key is not null;

-- 기존 admin_update_member RPC를 소속 컬럼까지 수정할 수 있게 확장한다.
-- 기존 5개 인자 호출도 깨지지 않도록 새 인자는 기본값을 둔다.
drop function if exists public.admin_update_member(uuid, text, text, text, text);

create or replace function public.admin_update_member(
  p_target_user_id uuid,
  p_display_name text,
  p_band_nickname text,
  p_role text,
  p_visitor_type text default 'human',
  p_character_key text default null,
  p_organization_code text default 'unaffiliated',
  p_department_code text default 'none',
  p_affiliation_label text default '무소속'
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

  if coalesce(nullif(trim(p_organization_code), ''), 'unaffiliated') not in ('baekildream', 'disaster_agency', 'entity', 'unaffiliated', 'other') then
    raise exception 'organization_code 값이 올바르지 않습니다.';
  end if;

  if coalesce(nullif(trim(p_department_code), ''), 'none') not in ('field_exploration', 'research', 'security', 'agent', 'entity', 'none', 'other') then
    raise exception 'department_code 값이 올바르지 않습니다.';
  end if;

  update public.profiles
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), '익명'),
    band_nickname = nullif(trim(p_band_nickname), ''),
    role = p_role,
    visitor_type = p_visitor_type,
    character_key = nullif(trim(p_character_key), ''),
    organization_code = coalesce(nullif(trim(p_organization_code), ''), 'unaffiliated'),
    department_code = coalesce(nullif(trim(p_department_code), ''), 'none'),
    affiliation_label = coalesce(nullif(trim(p_affiliation_label), ''), '무소속')
  where id = p_target_user_id;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (
    auth.uid(),
    p_target_user_id,
    'admin_update_member',
    '방문객 정보/탐사 소속 수정'
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_update_member(uuid, text, text, text, text, text, text, text, text) to authenticated;
