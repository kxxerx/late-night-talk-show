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
