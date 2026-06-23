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

