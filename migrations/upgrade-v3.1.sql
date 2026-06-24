-- Upgrade to v3.1
-- Make admin visitor-status adjustment target mask_collapse_rate for entity users.

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
  v_visitor_type text;
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
    select visitor_type into v_visitor_type
    from public.profiles
    where id = p_target_user_id
    for update;

    if v_visitor_type = 'entity' then
      select mask_collapse_rate into v_before
      from public.profiles
      where id = p_target_user_id
      for update;

      v_after := greatest(0, least(100, v_before + p_pollution_delta));

      update public.profiles
      set mask_collapse_rate = v_after
      where id = p_target_user_id;

      insert into public.pollution_logs (user_id, change_amount, before_value, after_value, reason, related_type)
      values (p_target_user_id, v_after - v_before, v_before, v_after, v_reason || ' / 가면 붕괴율', 'admin_mask');
    else
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
  end if;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (
    auth.uid(),
    p_target_user_id,
    'admin_adjust_member',
    '재화 ' || p_currency_delta || ', 상태 ' || p_pollution_delta || ', 사유: ' || v_reason
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_adjust_member(uuid, integer, integer, text) to authenticated;


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
  v_visitor_type text;
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
      select visitor_type into v_visitor_type
      from public.profiles
      where id = v_sub.user_id
      for update;

      if v_visitor_type = 'entity' then
        select mask_collapse_rate into v_before
        from public.profiles
        where id = v_sub.user_id
        for update;

        v_after := greatest(0, least(100, v_before + v_code.pollution_delta));

        update public.profiles
        set mask_collapse_rate = v_after
        where id = v_sub.user_id;

        insert into public.pollution_logs (user_id, change_amount, before_value, after_value, reason, related_type, related_id)
        values (v_sub.user_id, v_after - v_before, v_before, v_after, '이벤트 승인: ' || v_code.title || ' / 가면 붕괴율', 'event_submission_mask', p_submission_id);
      else
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
    end if;

    if v_code.reward_item_id is not null and v_code.reward_item_quantity > 0 then
      insert into public.inventories (user_id, item_id, quantity)
      values (v_sub.user_id, v_code.reward_item_id, v_code.reward_item_quantity)
      on conflict (user_id, item_id)
      do update set quantity = public.inventories.quantity + v_code.reward_item_quantity, updated_at = now();
    end if;
  end if;

  update public.event_submissions
  set
    status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    admin_note = p_admin_note
  where id = p_submission_id;

  insert into public.admin_logs (admin_id, target_user_id, action, detail)
  values (
    auth.uid(),
    v_sub.user_id,
    case when p_approve then 'approve_submission' else 'reject_submission' end,
    '초대권 제출 ' || case when p_approve then '승인' else '거절' end || ': ' || coalesce(v_code.title, '')
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_review_submission(uuid, boolean, text) to authenticated;
