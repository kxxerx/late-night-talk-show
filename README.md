# 오염도 상점 사이트 스타터

GitHub Pages + Supabase로 만드는 반자동 오염도/재화/상점 시스템입니다.

## 전체 구조

- GitHub Pages: 화면 표시용 HTML/CSS/JavaScript
- Supabase: 회원가입, 로그인, 데이터베이스, 권한관리
- 실제 현금 결제 없음
- 밴드 API 연동 없음
- 사이트 아이디와 밴드 닉네임은 관리자가 수동 연결

## 파일 구성

```txt
pollution-shop-starter/
├─ index.html              # 내 상태 / 메인
├─ login.html              # 회원가입 / 로그인
├─ shop.html               # 상점
├─ inventory.html          # 내 가방 / 아이템 사용
├─ codes.html              # 이벤트 코드 제출 / 내 제출내역
├─ admin.html              # 관리자 페이지
├─ css/
│  └─ style.css
├─ js/
│  ├─ config.example.js    # Supabase 설정 예시
│  ├─ supabaseClient.js
│  ├─ common.js
│  ├─ login.js
│  ├─ dashboard.js
│  ├─ shop.js
│  ├─ inventory.js
│  ├─ codes.js
│  └─ admin.js
└─ supabase/
   └─ setup.sql            # Supabase SQL Editor에 붙여넣을 DB 코드
```

---

# 1. Supabase 만들기

1. Supabase에 가입합니다.
2. 새 Project를 만듭니다.
3. Project가 생성되면 왼쪽 메뉴에서 `SQL Editor`로 들어갑니다.
4. `New query`를 누릅니다.
5. `supabase/setup.sql` 파일 안의 내용을 전부 복사해서 붙여넣습니다.
6. `Run`을 누릅니다.

---

# 2. Supabase URL / anon key 확인

1. Supabase 왼쪽 아래 톱니바퀴 `Project Settings`로 들어갑니다.
2. `Data API` 또는 `API` 메뉴로 들어갑니다.
3. 아래 두 값을 찾습니다.

- Project URL
- anon public key

---

# 3. config.js 만들기

`js/config.example.js` 파일을 복사해서 같은 폴더에 `config.js`라는 이름으로 만듭니다.

그리고 안의 값을 본인 Supabase 값으로 바꿉니다.

```js
export const SUPABASE_URL = "여기에 Project URL";
export const SUPABASE_ANON_KEY = "여기에 anon public key";
```

주의: `service_role key`는 절대 넣지 마세요. 이 키를 넣으면 사이트를 보는 사람이 관리자 열쇠를 훔칠 수 있습니다. 인간 불신은 시스템 설계의 기본입니다.

---

# 4. GitHub에 올리기

1. GitHub에서 새 repository를 만듭니다.
2. 이 폴더 안의 파일을 전부 업로드합니다.
3. 반드시 `js/config.js`도 포함되어 있어야 합니다.
4. Settings → Pages로 들어갑니다.
5. Source를 `Deploy from a branch`로 설정합니다.
6. Branch는 `main`, folder는 `/root`로 설정합니다.
7. 저장하면 잠시 후 사이트 주소가 생깁니다.

---

# 5. 첫 관리자 지정하기

1. 사이트에서 먼저 회원가입을 합니다.
2. Supabase → SQL Editor → New query에 아래 코드를 입력합니다.
3. 이메일 주소를 본인 가입 이메일로 바꿉니다.

```sql
update public.profiles
set role = 'admin'
where email = '본인메일@example.com';
```

4. Run을 누릅니다.
5. 다시 사이트에 로그인하면 관리자 페이지를 쓸 수 있습니다.

---

# 6. 사용 순서

## 사용자

1. 회원가입
2. 로그인
3. 내 상태 확인
4. 상점에서 아이템 구매
5. 내 가방에서 아이템 사용
6. 이벤트 코드 제출

## 관리자

1. 관리자 페이지 접속
2. 회원 검색
3. 밴드 닉네임 확인/수동 연결
4. 재화/오염도 수동 조정
5. 아이템 등록/수정
6. 이벤트 코드 생성
7. 제출된 이벤트 코드 승인/거절
8. 여러 회원 일괄 지급

---

# 7. 지금 버전의 아이템 효과

현재 자동 사용 가능한 효과는 아래 1개입니다.

```txt
effect_type = pollution_delta
effect_value = -10
```

예시: 오염도 -10

나중에 기간제 효과, 자동 방어 효과, 랜덤 효과를 붙일 수 있지만 첫 버전에서 넣으면 코드가 마계로 갑니다.

---

# 8. 오류가 나면 보여줄 것

오류가 나면 아래 중 하나를 캡처하거나 복사해서 보여주세요.

- 브라우저 화면의 오류 문구
- 개발자도구 Console 탭의 빨간 오류
- Supabase SQL Editor 오류
- GitHub Pages 배포 오류

개발자도구 여는 법:

- 크롬에서 `F12`
- 또는 마우스 오른쪽 클릭 → 검사 → Console

---

# 9. 중요한 제한

이 사이트는 학습/커뮤니티용 스타터입니다.

- 실제 현금 거래 금지
- 상품권/기프티콘 교환 기능 없음
- 회원 간 거래 기능 없음
- 밴드 API 자동 연동 없음
- 관리자 권한은 Supabase DB 정책으로 보호

---

# Supabase 새 프로젝트 생성 시 Security 체크

프로젝트 생성 화면에서 Security 관련 항목이 나오면 아래처럼 설정하세요.

```txt
Enable Data API → ON
Automatically expose new tables → OFF
Enable automatic RLS → ON
```

이 버전의 `supabase/setup.sql`에는 `Automatically expose new tables`를 꺼둔 상태에서도 작동하도록 수동 권한 부여 SQL이 포함되어 있습니다.

따라서 별도로 grant SQL을 따로 실행하지 않아도 됩니다.  
`setup.sql` 전체를 한 번에 실행하면 됩니다.

---

# 회원가입 이메일 확인 끄기

이 프로젝트는 폐쇄형 커뮤니티/밴드 수동 확인용으로 설계되어 있습니다.  
초기 운영에서는 Supabase 이메일 확인을 꺼두는 편이 사용자가 덜 헷갈립니다.

경로는 보통 아래 중 하나입니다.

```txt
Authentication
→ Sign In / Providers
→ Email
→ Confirm email OFF
→ Save
```

또는

```txt
Authentication
→ Providers
→ Email
→ Confirm email OFF
→ Save
```

이 설정을 끄면 새 회원은 이메일 확인 없이 가입 후 바로 로그인할 수 있습니다.

v0.3부터 `js/login.js`는 회원가입 후 자동 로그인을 시도합니다.  
만약 Supabase에서 Confirm email이 켜져 있으면 자동 로그인되지 않고 이메일 확인 안내가 표시됩니다.

---

# v0.4 변경사항

## 1. 기본 화면 변경

기본 `index.html`은 이제 내 상태 화면이 아니라 상점 화면입니다.  
오른쪽에는 프로필 카드가 표시됩니다.

## 2. 내 상태 화면 분리

내 상태 화면은 `mypage.html`로 분리되었습니다.

## 3. 아이디/비밀번호 가입

사용자는 이메일 대신 아이디와 비밀번호로 가입합니다.  
단, Supabase Auth는 내부적으로 이메일 형식이 필요하므로 코드가 자동으로 아래 형태의 내부 이메일을 만듭니다.

```txt
아이디@pollution.invalid
```

사용자는 이 내부 이메일을 몰라도 됩니다.

## 4. 탈퇴 처리

`mypage.html`에 탈퇴 버튼이 추가되었습니다.  
현재 탈퇴는 Supabase Auth 사용자를 완전히 삭제하는 기능이 아니라, 프로필을 `withdrawn` 상태로 바꾸고 재화/오염도/아이템을 초기화하는 비활성화 방식입니다.

완전 삭제가 필요하면 관리자가 Supabase Dashboard의 Authentication → Users에서 해당 사용자를 직접 삭제해야 합니다.

## 5. 이미 설치한 프로젝트라면

이미 v0.3 이하의 `setup.sql`을 실행했다면, Supabase SQL Editor에서 아래 파일을 추가로 실행하세요.

```txt
migrations/upgrade-v0.4.sql
```

새로 처음 설치하는 경우에는 `supabase/setup.sql`만 실행하면 됩니다.

## 6. 디자인 수정 방법

대부분의 화면 스타일은 아래 파일에서 바꿉니다.

```txt
css/style.css
```

친구가 디자인을 해준다면 보통 이 파일을 수정하면 됩니다.  
화면 구조 자체를 바꾸려면 HTML 파일을 수정해야 합니다.

```txt
index.html       상점 메인
mypage.html      내 상태
inventory.html   내 가방
codes.html       이벤트 코드
login.html       로그인/회원가입
admin.html       관리자
```

---

# v0.5 변경사항

## 1. 상점 첫 화면 헤더 변경

`index.html`과 `shop.html`에서 큰 "상점" 제목을 제거하고, 블로그형 상단 배너 영역을 추가했습니다.

로고/이미지 영역은 아래 파일을 교체하면 됩니다.

```txt
assets/site-logo.svg
```

원하는 이미지가 있다면 같은 파일명으로 교체하거나, `index.html`의 아래 부분을 바꾸면 됩니다.

```html
<img src="assets/site-logo.svg" alt="사이트 로고">
```

## 2. 상점 카테고리

오른쪽 프로필 영역 아래에 상점 카테고리를 추가했습니다.

```txt
전체
메인 상점 아이템
정화 아이템
이벤트 아이템
특수 아이템
```

DB의 `items.category` 값으로 분류합니다.

```txt
main
cleanse
event
special
```

## 3. 프로필 사진 파일 업로드

Supabase Storage의 `avatars` 버킷을 사용합니다.  
이미 설치한 프로젝트라면 Supabase SQL Editor에서 아래 파일을 실행하세요.

```txt
migrations/upgrade-v0.5.sql
```

그 뒤 `mypage.html`에서 이미지 파일을 업로드할 수 있습니다.

## 4. 이미 v0.4를 적용했다면

아래 순서로 진행하세요.

```txt
1. Supabase SQL Editor에서 migrations/upgrade-v0.5.sql 실행
2. GitHub에 v0.5 파일 업로드
3. GitHub Pages 새로고침
```

---

# v0.6 변경사항

## 1. 상점 공개 진입

이제 로그인하지 않아도 `index.html` 상점 화면이 먼저 보입니다.

## 2. 비로그인 상태 구매 제한

비로그인 상태에서 `구입하기` 버튼을 누르면 구매가 진행되지 않고 오른쪽 로그인 영역을 안내합니다.

## 3. 오른쪽 사이드 영역 변경

로그인 전에는 오른쪽 사이드 영역에 로그인 폼과 회원가입 폼이 표시됩니다.

로그인 후에는 기존처럼 프로필 카드, 내 가방, 내 상태, 코드 제출 버튼이 표시됩니다.

## 4. DB 변경 없음

v0.5까지 적용했다면 v0.6은 추가 SQL 실행이 필요 없습니다.  
파일만 GitHub에 업로드하면 됩니다.

