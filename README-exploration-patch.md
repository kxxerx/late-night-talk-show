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
