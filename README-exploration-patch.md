# 통합본 안내

이 패치 ZIP은 v0.1 + v0.2 통합본입니다. 아직 v0.1을 적용하지 않은 경우에도 이 ZIP만 적용하면 됩니다.

---

# 탐사 홈페이지 연동 패치 v0.1

이 패치는 `pollution-shop-starter v5.2` 기준으로 작성되었습니다.

## 포함 파일

- `migrations/upgrade-v5.3-exploration-affiliation.sql`
  - `profiles`에 탐사용 소속 컬럼 추가
  - organization/department 허용값 제약 추가
  - `admin_update_member` RPC 확장
- `admin.html`
  - 관리실 회원 목록에 캐릭터 키/기관/팀/표시 소속명 컬럼 추가
- `js/admin.js`
  - 관리실에서 위 소속 값을 저장하도록 수정
- `exploration.html`
  - 기념품샵 계정으로 로그인하는 탐사 홈페이지 초기 화면
- `js/exploration.js`
  - 기존 로그인 방식 유지, profiles에서 탐사자 정보 조회

## 적용 순서

1. Supabase SQL Editor에서 `migrations/upgrade-v5.3-exploration-affiliation.sql` 실행
2. 기존 GitHub Pages 파일에 이 패치의 `admin.html`, `js/admin.js`, `exploration.html`, `js/exploration.js`를 반영
3. `js/config.js`는 기존 파일을 그대로 사용
4. service_role key, DB password, JWT secret은 절대 GitHub에 올리지 않기
5. `/exploration.html` 접속 후 기존 아이디/비밀번호로 로그인 테스트

## 설계 기준

- 로그인 아이디는 기존과 동일하게 `site_id@pollution.invalid`로 변환됩니다.
- 현재 사용자는 `auth.uid()`와 같은 `profiles.id`로 조회합니다.
- 소속 판정은 `display_name`이 아니라 `organization_code`, `department_code`, `character_key`로 합니다.
- `display_name`은 표시명일 뿐입니다.
- 탐사방/채팅/시나리오 진행 DB는 다음 단계에서 별도 migration으로 추가하는 편이 안전합니다.


---

# v0.2 추가 안내: 캐릭터 프리셋 방식

사용자 계정이 아직 없는 상태에서는 `profiles`에 캐릭터별 소속을 미리 넣을 수 없습니다.  
그래서 v0.2에서는 `character_presets` 테이블을 추가합니다.

## 핵심 개념

```txt
character_key = 내부 구분값
display_name = 실제 화면에 보이는 캐릭터명
organization_code = 기관 코드
department_code = 팀/부서 코드
affiliation_label = 화면에 보이는 소속명
```

예시:

```txt
character_key: kim_soleum_disaster_agency
display_name: 김솔음
affiliation_label: 초자연 재난관리국 요원
```

실제 사용자 화면에는 `김솔음`만 표시하고, 탐사 홈페이지는 `character_key`, `organization_code`, `department_code`로 소속을 판단합니다.

## 추가 SQL

Supabase SQL Editor에서 아래 순서로 실행하세요.

```txt
1. migrations/upgrade-v5.3-exploration-affiliation.sql
2. migrations/upgrade-v5.4-character-presets.sql
```

## 관리실 사용법

v5.4 SQL까지 실행하면 관리실 회원 목록에서 캐릭터 프리셋을 선택할 수 있습니다.

```txt
김솔음 · 초자연 재난관리국 요원
김솔음 · 백일몽 주식회사 현장탐사팀
김솔음 · 백일몽 주식회사 연구팀
김솔음 · 백일몽 주식회사 보안팀
김솔음 · 괴이
```

프리셋을 선택하고 저장하면, 해당 회원의 `display_name`은 `김솔음`으로 저장되고 소속 정보는 프리셋 값으로 자동 저장됩니다.

## GitHub 업로드 파일

```txt
admin.html
js/admin.js
exploration.html
js/exploration.js
migrations/upgrade-v5.3-exploration-affiliation.sql
migrations/upgrade-v5.4-character-presets.sql
README-exploration-patch.md
```


v0.3 실제 캐릭터 프리셋 목록은 `migrations/upgrade-v5.5-character-presets-seed.sql`에 들어 있습니다. SQL 실행 순서는 v5.3 → v5.4 → v5.5입니다.


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


---

# v0.6 추가 안내: 캐릭터 선택/사용자 이름 구조 재수정

v0.6에서는 관리실 회원 목록 구조를 다시 정리했습니다.

```txt
캐릭터 선택: character_presets 프리셋 드롭다운
사용자 이름: display_name, 직접 수정 가능
캐릭터 키: 화면에 보이지 않는 hidden 값으로 자동 저장
기관/팀/표시 소속명: 프리셋 선택 시 자동 반영, 필요 시 직접 수정 가능
방문객 상태: 일반/오염자/괴이 상태값으로 별도 관리
```

프리셋 목록이 DB에서 비어 있거나 RLS 문제로 조회되지 않아도, JS에 내장된 프리셋 목록을 임시로 표시합니다. 다만 DB 저장을 위해 SQL은 아래 순서로 실행해야 합니다.

```txt
1. migrations/upgrade-v5.3-exploration-affiliation.sql
2. migrations/upgrade-v5.4-character-presets.sql
3. migrations/upgrade-v5.5-character-presets-seed.sql
4. migrations/upgrade-v5.6-affiliation-admin-cleanup.sql
5. migrations/upgrade-v5.7-character-presets-read-grant.sql
```
