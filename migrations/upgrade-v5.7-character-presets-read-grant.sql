-- upgrade-v5.7-character-presets-read-grant.sql
-- 관리실 드롭다운에서 character_presets 목록이 비어 보이는 경우를 막기 위한 권한 보정입니다.

grant select on table public.character_presets to anon;
grant select on table public.character_presets to authenticated;

drop policy if exists "Anyone can read active character presets" on public.character_presets;
create policy "Anyone can read active character presets"
on public.character_presets
for select
to anon, authenticated
using (is_active = true);

-- 확인용:
-- select character_key, preset_label, display_name, affiliation_label, is_active
-- from public.character_presets
-- where is_active = true
-- order by sort_order, preset_label;
