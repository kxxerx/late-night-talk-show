-- upgrade-v5.6-affiliation-admin-cleanup.sql
-- 관리실 소속 선택지에서 '무소속/없음'을 사용하지 않고 '기타'로 정리하기 위한 보정 SQL입니다.
-- 기존 미배정 회원의 기본값도 기타로 정리합니다.

update public.profiles
set
  organization_code = 'other',
  department_code = 'other',
  affiliation_label = case
    when affiliation_label is null or affiliation_label = '' or affiliation_label = '무소속'
    then '기타'
    else affiliation_label
  end,
  updated_at = now()
where organization_code = 'unaffiliated'
   or department_code = 'none'
   or affiliation_label = '무소속';

update public.character_presets
set
  organization_code = case when organization_code = 'unaffiliated' then 'other' else organization_code end,
  department_code = case when department_code = 'none' then 'other' else department_code end,
  affiliation_label = case
    when affiliation_label is null or affiliation_label = '' or affiliation_label = '무소속'
    then '기타'
    else affiliation_label
  end,
  updated_at = now()
where organization_code = 'unaffiliated'
   or department_code = 'none'
   or affiliation_label = '무소속';
