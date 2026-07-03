-- upgrade-v5.4-character-presets.sql
-- 캐릭터별 소속 프리셋 테이블 추가
-- 사용자 계정이 아직 없어도, 미리 '김솔음_재난관리국' 같은 캐릭터 프리셋을 만들어둘 수 있습니다.
-- profiles.character_key는 이 프리셋의 character_key를 참조하는 용도로 사용합니다.

create table if not exists public.character_presets (
  character_key text primary key,
  display_name text not null,
  organization_code text not null default 'unaffiliated',
  department_code text not null default 'none',
  affiliation_label text not null default '무소속',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint character_presets_organization_code_check
  check (
    organization_code in (
      'baekildream',
      'disaster_agency',
      'entity',
      'unaffiliated',
      'other'
    )
  ),

  constraint character_presets_department_code_check
  check (
    department_code in (
      'field_exploration',
      'research',
      'security',
      'agent',
      'entity',
      'none',
      'other'
    )
  )
);

alter table public.character_presets enable row level security;

drop policy if exists "Anyone can read active character presets" on public.character_presets;
create policy "Anyone can read active character presets"
on public.character_presets
for select
using (is_active = true);

drop policy if exists "Admins can manage character presets" on public.character_presets;
create policy "Admins can manage character presets"
on public.character_presets
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create or replace function public.touch_character_presets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_character_presets_updated_at on public.character_presets;
create trigger touch_character_presets_updated_at
before update on public.character_presets
for each row execute function public.touch_character_presets_updated_at();

-- profiles.character_key에 인덱스를 추가합니다.
create index if not exists profiles_character_key_idx on public.profiles(character_key);
create index if not exists character_presets_active_sort_idx on public.character_presets(is_active, sort_order, display_name);

-- 예시 프리셋입니다.
-- 실제 캐릭터 목록에 맞게 character_key/display_name/소속을 수정하거나 추가하면 됩니다.
insert into public.character_presets
  (character_key, display_name, organization_code, department_code, affiliation_label, sort_order, is_active)
values
  ('kim_soleum_disaster_agency', '김솔음', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 10, true),
  ('kim_soleum_baekildream_field', '김솔음', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 20, true),
  ('kim_soleum_baekildream_research', '김솔음', 'baekildream', 'research', '백일몽 주식회사 연구팀', 30, true),
  ('kim_soleum_baekildream_security', '김솔음', 'baekildream', 'security', '백일몽 주식회사 보안팀', 40, true),
  ('kim_soleum_entity', '김솔음', 'entity', 'entity', '괴이', 50, true)
on conflict (character_key) do update
set
  display_name = excluded.display_name,
  organization_code = excluded.organization_code,
  department_code = excluded.department_code,
  affiliation_label = excluded.affiliation_label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- 관리자용: 회원에게 캐릭터 프리셋을 적용합니다.
-- 이 함수를 호출하면 display_name은 프리셋의 display_name, 소속값은 프리셋의 소속값으로 자동 저장됩니다.
create or replace function public.admin_apply_character_preset(
  p_user_id uuid,
  p_character_key text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin public.profiles;
  v_preset public.character_presets;
  v_profile public.profiles;
begin
  select *
  into v_admin
  from public.profiles
  where id = auth.uid();

  if v_admin.id is null or v_admin.role <> 'admin' then
    raise exception '관리자만 캐릭터 프리셋을 적용할 수 있습니다.';
  end if;

  select *
  into v_preset
  from public.character_presets
  where character_key = p_character_key
    and is_active = true;

  if v_preset.character_key is null then
    raise exception '존재하지 않거나 비활성화된 캐릭터 프리셋입니다.';
  end if;

  update public.profiles
  set
    character_key = v_preset.character_key,
    display_name = v_preset.display_name,
    organization_code = v_preset.organization_code,
    department_code = v_preset.department_code,
    affiliation_label = v_preset.affiliation_label,
    updated_at = now()
  where id = p_user_id
  returning *
  into v_profile;

  if v_profile.id is null then
    raise exception '대상 사용자를 찾을 수 없습니다.';
  end if;

  insert into public.admin_logs(admin_id, target_user_id, action, detail)
  values (
    auth.uid(),
    p_user_id,
    'apply_character_preset',
    json_build_object(
      'character_key', v_preset.character_key,
      'display_name', v_preset.display_name,
      'organization_code', v_preset.organization_code,
      'department_code', v_preset.department_code,
      'affiliation_label', v_preset.affiliation_label
    )::text
  );

  return v_profile;
end;
$$;

grant execute on function public.admin_apply_character_preset(uuid, text) to authenticated;
