-- Upgrade to v3.7
-- Add infected contract release item and purchase behavior.

alter table public.items drop constraint if exists items_item_kind_check;
alter table public.items
add constraint items_item_kind_check
check (item_kind in ('regular', 'life', 'mask_care', 'life_cancel', 'contract_release'));

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

      return jsonb_build_object('ok', true, 'message', v_item.name || '을 착용했습니다. 동기화 수치가 0으로 초기화됩니다.', 'item_name', v_item.name);
    end if;

    if v_item.item_kind = 'life_cancel' then
      if v_profile.current_life_item_id is null then
        raise exception '해제할 인생이 없습니다.';
      end if;

      v_before := v_profile.mask_collapse_rate;

      update public.profiles
      set
        currency = currency - v_item.price,
        current_life_item_id = null,
        mask_collapse_rate = 0
      where id = v_user_id;

      insert into public.purchase_logs (user_id, item_id, item_name, price)
      values (v_user_id, p_item_id, v_item.name, v_item.price);

      insert into public.currency_logs (user_id, change_amount, reason, related_type, related_id)
      values (v_user_id, -v_item.price, '인생 동기화 해제: ' || v_item.name, 'item', p_item_id);

      insert into public.pollution_logs (user_id, change_amount, reason, before_value, after_value, related_type, related_id)
      values (v_user_id, -v_before, '인생 동기화 해제: ' || v_item.name, v_before, 0, 'entity_life_cancel', p_item_id);

      return jsonb_build_object('ok', true, 'message', '인생 동기화가 해제되었습니다. 측정 불필요 상태로 돌아갑니다.', 'item_name', v_item.name, 'life_released', true);
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
      values (v_user_id, v_after - v_before, '동기화 조정: ' || v_item.name, v_before, v_after, 'mask_care', p_item_id);

      return jsonb_build_object('ok', true, 'message', '동기화 수치가 ' || v_before || ' → ' || v_after || '로 조정되었습니다.', 'item_name', v_item.name, 'mask_value', v_after);
    end if;

    raise exception '괴이 방문객에게 판매할 수 없는 물품입니다.';
  end if;

  -- 오염자 계약 해제 물품
  if v_item.item_kind = 'contract_release' then
    if v_profile.visitor_type <> 'infected' then
      raise exception '보안팀 근로계약이 체결된 방문객만 사용할 수 있습니다.';
    end if;

    v_before := v_profile.pollution;

    update public.profiles
    set
      currency = currency - v_item.price,
      visitor_type = 'human',
      pollution = 0
    where id = v_user_id;

    insert into public.purchase_logs (user_id, item_id, item_name, price)
    values (v_user_id, p_item_id, v_item.name, v_item.price);

    insert into public.currency_logs (user_id, change_amount, reason, related_type, related_id)
    values (v_user_id, -v_item.price, '근로계약 파기: ' || v_item.name, 'item', p_item_id);

    insert into public.pollution_logs (user_id, change_amount, reason, before_value, after_value, related_type, related_id)
    values (v_user_id, -v_before, '근로계약 파기: ' || v_item.name, v_before, 0, 'contract_release', p_item_id);

    return jsonb_build_object(
      'ok', true,
      'message', '당신을 구속하고 있던 근로계약서의 힘이 사라집니다.',
      'item_name', v_item.name,
      'contract_released', true
    );
  end if;

  -- 오염자/일반 구매 규칙
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


insert into public.items (name, description, image_url, price, effect_type, effect_value, category, is_active, sort_order, audience, item_kind)
values (
  '황금 해약서',
  '빛나는 백지 위에 보안팀 근로계약서의 조항이 한 줄씩 찢겨 나갑니다. 청달래의 도장도, 을의 서명도, 당신을 붙잡던 문장도 더 이상 효력을 갖지 못합니다.',
  null,
  0,
  'contract_release',
  0,
  'special',
  true,
  55,
  'infected',
  'contract_release'
)
on conflict do nothing;
