-- Upgrade to v0.5
-- Adds shop categories and Supabase Storage avatar uploads.

alter table public.items
add column if not exists category text not null default 'main';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'items_category_check'
  ) then
    alter table public.items
    add constraint items_category_check check (category in ('main', 'cleanse', 'event', 'special'));
  end if;
end $$;

update public.items
set category = 'cleanse'
where category = 'main'
  and (name like '%정화%' or name like '%부적%' or name like '%약병%');

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_public_read'
  ) then
    create policy "avatars_public_read"
    on storage.objects
    for select
    to public
    using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_owner_insert'
  ) then
    create policy "avatars_owner_insert"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_owner_update'
  ) then
    create policy "avatars_owner_update"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_owner_delete'
  ) then
    create policy "avatars_owner_delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;
