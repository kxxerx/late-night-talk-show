-- Upgrade to v0.9
-- Mascot Golden gift shop theme + withdrawn profile purge + sample gift shop items.

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
  description = '마스코트 골든가 직접 묶었다고 주장하는 리본 부적. 주장일 뿐입니다.',
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
