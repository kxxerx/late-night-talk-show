-- Upgrade to v1.8
-- Item image upload bucket for admin item management.

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_public_read'
  ) then
    create policy "item_images_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'item-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_admin_insert'
  ) then
    create policy "item_images_admin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'item-images' and public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_admin_update'
  ) then
    create policy "item_images_admin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'item-images' and public.is_admin())
    with check (bucket_id = 'item-images' and public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'item_images_admin_delete'
  ) then
    create policy "item_images_admin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'item-images' and public.is_admin());
  end if;
end $$;
