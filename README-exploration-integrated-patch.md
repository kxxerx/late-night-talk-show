# 마스코트 골든의 기념품샵 ↔ 탐사 홈페이지 연동 통합 패치

이 ZIP은 v0.1과 v0.2 내용을 합친 통합본입니다.  
아직 v0.1을 적용하지 않은 상태라면 이 통합본만 사용하면 됩니다.

## 포함 내용

### v0.1 내용

- `profiles` 테이블에 탐사 홈페이지 연동용 소속 컬럼 추가
- 관리실 회원 목록에서 소속 정보 수정 가능
- 탐사 홈페이지 기본 화면 추가
- 기존 계정 로그인 방식 유지
- 기존 `profiles`, `currency`, `pollution`, `mask_collapse_rate`, `visitor_type` 값 조회

### v0.2 내용

- `character_presets` 테이블 추가
- 사용자 계정이 없어도 캐릭터별 소속 프리셋을 미리 등록 가능
- 관리실에서 회원에게 캐릭터 프리셋 적용 가능
- 예시 프리셋 추가:
  - 김솔음 · 초자연 재난관리국 요원
  - 김솔음 · 백일몽 주식회사 현장탐사팀
  - 김솔음 · 백일몽 주식회사 연구팀
  - 김솔음 · 백일몽 주식회사 보안팀
  - 김솔음 · 괴이

## Supabase SQL 실행 순서

Supabase SQL Editor에서 아래 순서대로 실행하세요.

```txt
1. migrations/upgrade-v5.3-exploration-affiliation.sql
2. migrations/upgrade-v5.4-character-presets.sql
```

반드시 1번을 먼저 실행해야 합니다.  
v5.4 SQL은 v5.3에서 추가한 `profiles.character_key`, `organization_code`, `department_code`, `affiliation_label` 컬럼을 전제로 합니다.

## GitHub 업로드 파일

아래 파일들을 기존 저장소의 같은 위치에 업로드하세요.

```txt
admin.html
exploration.html
README-exploration-patch.md
README-exploration-integrated-patch.md
js/admin.js
js/exploration.js
migrations/upgrade-v5.3-exploration-affiliation.sql
migrations/upgrade-v5.4-character-presets.sql
```

주의: ZIP 폴더 자체를 업로드하지 말고, 압축을 푼 뒤 안의 파일/폴더를 기존 저장소 위치에 맞게 업로드하세요.

## 파일 위치

```txt
admin.html → 저장소 루트의 admin.html 덮어쓰기
exploration.html → 저장소 루트에 새로 추가
README-exploration-patch.md → 저장소 루트에 새로 추가
README-exploration-integrated-patch.md → 저장소 루트에 새로 추가
js/admin.js → js 폴더 안 admin.js 덮어쓰기
js/exploration.js → js 폴더 안 새로 추가
migrations/upgrade-v5.3-exploration-affiliation.sql → migrations 폴더 안 새로 추가
migrations/upgrade-v5.4-character-presets.sql → migrations 폴더 안 새로 추가
```

## 핵심 DB 구조

### profiles에 추가되는 컬럼

```txt
character_key
organization_code
department_code
affiliation_label
```

### character_presets 테이블

```txt
character_key
display_name
organization_code
department_code
affiliation_label
sort_order
is_active
created_at
updated_at
```

## 화면 표시 원칙

사용자에게는 `display_name`만 보여줍니다.

예시:

```txt
내부 character_key: kim_soleum_disaster_agency
화면 display_name: 김솔음
소속 affiliation_label: 초자연 재난관리국 요원
```

즉, 실제 사용자 화면에는 `김솔음_재난관리국` 같은 내부 구분명이 보이면 안 됩니다.  
탐사 홈페이지는 `display_name`으로 소속을 추론하지 말고, `character_key`, `organization_code`, `department_code`, `affiliation_label`을 읽어서 처리해야 합니다.

## 로그인 방식

기존 기념품샵과 동일합니다.

```txt
사용자 입력 아이디 → site_id
내부 이메일 → `${site_id}@pollution.invalid`
Supabase Auth email/password 로그인
auth.uid() = public.profiles.id
```

## 보안 주의

프론트엔드에는 Supabase URL과 anon key만 사용합니다.

절대 넣으면 안 되는 것:

```txt
service_role key
sb_secret_...
JWT secret
DB password
database connection string
```

## 적용 후 확인

1. Supabase에서 SQL 두 개가 오류 없이 실행되었는지 확인
2. GitHub Actions 배포 완료 확인
3. `/admin.html`에서 회원 목록에 캐릭터 프리셋/소속 칸이 보이는지 확인
4. `/exploration.html` 접속 확인
5. 새 사용자 가입 후 관리실에서 캐릭터 프리셋 적용 테스트
6. 탐사 홈페이지에서 display_name과 affiliation_label이 정상 표시되는지 확인

---

# v0.3 추가 안내: 실제 캐릭터 프리셋 목록 반영

v0.3에서는 실제 캐릭터 프리셋 목록을 추가했습니다.

## SQL 실행 순서

아직 아무 SQL도 적용하지 않은 상태라면 아래 순서대로 실행하세요.

```txt
1. migrations/upgrade-v5.3-exploration-affiliation.sql
2. migrations/upgrade-v5.4-character-presets.sql
3. migrations/upgrade-v5.5-character-presets-seed.sql
```

## v5.5에서 추가되는 점

`character_presets`에 `preset_label` 컬럼을 추가합니다.

```txt
preset_label = 관리자 드롭다운에서 보이는 구분명
display_name = 실제 사용자에게 보이는 캐릭터명
```

예시:

```txt
preset_label: 김솔음(마스코트 골든)
display_name: 김솔음
affiliation_label: 괴이
```

즉, 관리자는 `김솔음(마스코트 골든) · 괴이`로 구분해서 선택할 수 있고, 실제 사용자 화면에는 `김솔음`만 표시됩니다.

## 반영된 프리셋 수

```txt
35개
```


---

# v0.4 추가 안내: 관리실 캐릭터 선택 드롭다운 개선

v0.4에서는 관리실 회원 목록의 `사용자 이름` 입력칸을 `캐릭터 선택` 드롭다운으로 바꿨습니다.

## 바뀐 점

```txt
기존: 사용자 이름 / 캐릭터 키 / 기관 / 팀 / 표시 소속명을 따로 입력
변경: 캐릭터 선택 드롭다운에서 프리셋 선택
```

프리셋을 선택하면 아래 값이 자동으로 채워집니다.

```txt
display_name
character_key
organization_code
department_code
affiliation_label
```

관리실 드롭다운에는 괄호가 있는 구분명이 보일 수 있지만, 실제 사용자 화면에는 괄호 없는 display_name만 저장됩니다.

예시:

```txt
관리실 선택: 김솔음(포도) · 초자연 재난관리국 요원
사용자 표시: 김솔음
```

## SQL 실행 순서

아직 아무 SQL도 적용하지 않은 상태라면 아래 순서대로 실행하세요.

```txt
1. migrations/upgrade-v5.3-exploration-affiliation.sql
2. migrations/upgrade-v5.4-character-presets.sql
3. migrations/upgrade-v5.5-character-presets-seed.sql
4. migrations/upgrade-v5.6-affiliation-admin-cleanup.sql
```

v5.6은 기존 무소속/없음 기본값을 기타로 정리하는 보정 SQL입니다.


---

# v0.5 추가 안내: 캐릭터 드롭다운 빈 목록/겹침 수정

v0.5에서는 관리실의 캐릭터 선택 드롭다운이 비어 보이거나, 기존 display_name 입력칸과 겹쳐 보이는 문제를 수정했습니다.

## 바뀐 점

```txt
display_name 입력칸을 화면에서 숨김
캐릭터 선택 드롭다운만 표시
드롭다운 선택 시 캐릭터 키/기관/팀/표시 소속명 자동 반영
character_presets 읽기 권한 보정 SQL 추가
```

## SQL 실행 순서

아직 아무 SQL도 적용하지 않은 상태라면 아래 순서대로 실행하세요.

```txt
1. migrations/upgrade-v5.3-exploration-affiliation.sql
2. migrations/upgrade-v5.4-character-presets.sql
3. migrations/upgrade-v5.5-character-presets-seed.sql
4. migrations/upgrade-v5.6-affiliation-admin-cleanup.sql
5. migrations/upgrade-v5.7-character-presets-read-grant.sql
```

이미 v5.3~v5.6을 실행했다면 v5.7만 추가로 실행해도 됩니다.
