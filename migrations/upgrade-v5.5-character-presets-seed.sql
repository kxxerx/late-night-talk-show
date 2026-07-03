-- upgrade-v5.5-character-presets-seed.sql
-- 실제 캐릭터 프리셋 목록 추가
-- preset_label은 관리자 드롭다운에서만 보이는 구분명입니다.
-- display_name은 실제 사용자 화면에 보이는 캐릭터명입니다.

alter table public.character_presets
add column if not exists preset_label text;

update public.character_presets
set preset_label = coalesce(nullif(preset_label, ''), display_name)
where preset_label is null or preset_label = '';

insert into public.character_presets
  (character_key, preset_label, display_name, organization_code, department_code, affiliation_label, sort_order, is_active)
values
  ('choi_agent_disaster_agency', '최 요원', '최 요원', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 10, true),
  ('kim_soleum_baekildream_field', '김솔음', '김솔음', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 20, true),
  ('kim_soleum_podo_disaster_agency', '김솔음(포도)', '김솔음', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 30, true),
  ('kim_soleum_130666_baekildream_security', '김솔음(130666)', '김솔음', 'baekildream', 'security', '백일몽 주식회사 보안팀', 40, true),
  ('kim_soleum_mascot_golden_entity', '김솔음(마스코트 골든)', '김솔음', 'entity', 'entity', '괴이', 50, true),
  ('kim_soleum_host_friend_entity', '김솔음(사회자의 친구)', '김솔음', 'entity', 'entity', '괴이', 60, true),
  ('kim_soleum_segwang_student_entity', '김솔음(세광고 학생)', '김솔음', 'entity', 'entity', '괴이', 70, true),
  ('ryu_jaegwan_disaster_agency', '류재관', '류재관', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 80, true),
  ('eun_haje_baekildream_field', '은하제', '은하제', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 90, true),
  ('park_minseong_baekildream_field', '박민성', '박민성', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 100, true),
  ('park_minseong_sprout_baekildream_security', '박민성(새싹반)', '박민성', 'baekildream', 'security', '백일몽 주식회사 보안팀', 110, true),
  ('lee_jahun_baekildream_field', '이자헌', '이자헌', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 120, true),
  ('jang_heoun_baekildream_field', '장허운', '장허운', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 130, true),
  ('jang_heoun_hwagal_disaster_agency', '장허운(화각)', '장허운', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 140, true),
  ('jin_nasol_baekildream_field', '진나솔', '진나솔', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 150, true),
  ('lee_seonghae_baekildream_field', '이성해', '이성해', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 160, true),
  ('lee_gangheon_baekildream_field', '이강헌', '이강헌', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 170, true),
  ('team_b_leader_baekildream_field', 'B조 조장', 'B조 조장', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 180, true),
  ('j3_baekildream_security', 'J3', 'J3', 'baekildream', 'security', '백일몽 주식회사 보안팀', 190, true),
  ('haegeum_disaster_agency', '해금', '해금', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 200, true),
  ('baek_sahyun_baekildream_field', '백사헌', '백사헌', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 210, true),
  ('go_yeongeun_baekildream_field', '고영은', '고영은', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 220, true),
  ('go_yeongeun_bakha_disaster_agency', '고영은(박하)', '고영은', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 230, true),
  ('park_hongrim_disaster_agency', '박홍림', '박홍림', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 240, true),
  ('chogae_disaster_agency', '초개', '초개', 'disaster_agency', 'agent', '초자연 재난관리국 요원', 250, true),
  ('gwak_jegang_baekildream_research', '곽제강', '곽제강', 'baekildream', 'research', '백일몽 주식회사 연구팀', 260, true),
  ('lee_yeonhwa_baekildream_research', '이연화', '이연화', 'baekildream', 'research', '백일몽 주식회사 연구팀', 270, true),
  ('baek_seokju_baekildream_field', '백석주', '백석주', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 280, true),
  ('gang_ihak_baekildream_field', '강이학', '강이학', 'baekildream', 'field_exploration', '백일몽 주식회사 현장탐사팀', 290, true),
  ('ryu_jaegwan_lodge_keeper_entity', '류재관(산장지기)', '류재관', 'entity', 'entity', '괴이', 300, true),
  ('choi_agent_lucky_mart_entity', '최 요원(룩키마트)', '최 요원', 'entity', 'entity', '괴이', 310, true),
  ('ho_yuwon_entity', '호유원', '호유원', 'entity', 'entity', '괴이', 320, true),
  ('cheong_dallae_entity', '청달래', '청달래', 'entity', 'entity', '괴이', 330, true),
  ('brown_entity', '브라운', '브라운', 'entity', 'entity', '괴이', 340, true),
  ('blue_dragon_mascot_entity', '파란 용 마스코트', '파란 용 마스코트', 'entity', 'entity', '괴이', 350, true)
on conflict (character_key) do update
set
  preset_label = excluded.preset_label,
  display_name = excluded.display_name,
  organization_code = excluded.organization_code,
  department_code = excluded.department_code,
  affiliation_label = excluded.affiliation_label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- v5.4 예시 중 이번 실제 목록에서 쓰지 않는 값은 삭제 대신 비활성화합니다.
update public.character_presets
set is_active = false, updated_at = now()
where character_key in (
  'kim_soleum_disaster_agency',
  'kim_soleum_baekildream_research',
  'kim_soleum_baekildream_security',
  'kim_soleum_entity'
)
and character_key not in (
  select x.character_key
  from (values
    ('choi_agent_disaster_agency'),
    ('kim_soleum_baekildream_field'),
    ('kim_soleum_podo_disaster_agency'),
    ('kim_soleum_130666_baekildream_security'),
    ('kim_soleum_mascot_golden_entity'),
    ('kim_soleum_host_friend_entity'),
    ('kim_soleum_segwang_student_entity'),
    ('ryu_jaegwan_disaster_agency'),
    ('eun_haje_baekildream_field'),
    ('park_minseong_baekildream_field'),
    ('park_minseong_sprout_baekildream_security'),
    ('lee_jahun_baekildream_field'),
    ('jang_heoun_baekildream_field'),
    ('jang_heoun_hwagal_disaster_agency'),
    ('jin_nasol_baekildream_field'),
    ('lee_seonghae_baekildream_field'),
    ('lee_gangheon_baekildream_field'),
    ('team_b_leader_baekildream_field'),
    ('j3_baekildream_security'),
    ('haegeum_disaster_agency'),
    ('baek_sahyun_baekildream_field'),
    ('go_yeongeun_baekildream_field'),
    ('go_yeongeun_bakha_disaster_agency'),
    ('park_hongrim_disaster_agency'),
    ('chogae_disaster_agency'),
    ('gwak_jegang_baekildream_research'),
    ('lee_yeonhwa_baekildream_research'),
    ('baek_seokju_baekildream_field'),
    ('gang_ihak_baekildream_field'),
    ('ryu_jaegwan_lodge_keeper_entity'),
    ('choi_agent_lucky_mart_entity'),
    ('ho_yuwon_entity'),
    ('cheong_dallae_entity'),
    ('brown_entity'),
    ('blue_dragon_mascot_entity')
  ) as x(character_key)
);

-- 확인용:
-- select character_key, preset_label, display_name, organization_code, department_code, affiliation_label, is_active
-- from public.character_presets
-- order by sort_order, preset_label;
