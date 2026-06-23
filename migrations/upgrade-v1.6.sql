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
