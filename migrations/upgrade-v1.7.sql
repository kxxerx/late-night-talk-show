-- Upgrade to v1.7
-- Password reset request inbox for admins.

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  login_id text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

alter table public.password_reset_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'password_reset_requests'
      and policyname = 'password_reset_requests_admin_select'
  ) then
    create policy "password_reset_requests_admin_select"
    on public.password_reset_requests
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'password_reset_requests'
      and policyname = 'password_reset_requests_admin_update'
  ) then
    create policy "password_reset_requests_admin_update"
    on public.password_reset_requests
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

create or replace function public.submit_password_reset_request(
  p_login_id text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_login_id text := public.normalize_site_id(p_login_id);
begin
  if v_login_id is null or length(v_login_id) < 3 then
    raise exception '아이디를 확인해 주세요.';
  end if;

  insert into public.password_reset_requests (login_id, note)
  values (v_login_id, nullif(trim(coalesce(p_note, '')), ''));

  return jsonb_build_object('ok', true, 'message', '비밀번호 분실 요청을 관리실로 보냈습니다.');
end;
$$;

create or replace function public.admin_resolve_password_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  update public.password_reset_requests
  set status = 'done', resolved_at = now(), resolved_by = auth.uid()
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'message', '비밀번호 분실 요청을 처리 완료로 표시했습니다.');
end;
$$;

grant execute on function public.submit_password_reset_request(text, text) to anon, authenticated;
grant execute on function public.admin_resolve_password_request(uuid) to authenticated;
grant select, update on public.password_reset_requests to authenticated;
