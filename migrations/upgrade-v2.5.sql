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
