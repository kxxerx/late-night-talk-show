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
