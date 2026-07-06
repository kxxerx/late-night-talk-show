# 비밀번호 변경 / 임시 비밀번호 초기화 패치

## 포함 기능

### 1. 마이페이지 비밀번호 변경

로그인한 사용자는 마이페이지에서 자기 비밀번호를 직접 바꿀 수 있습니다.

수정 파일:

```txt
mypage.html
js/dashboard.js
```

이 기능은 Supabase Edge Function 없이 작동합니다.

### 2. 운영자 임시 비밀번호 설정

관리자는 관리실 회원 목록에서 임시 비밀번호를 입력하고 초기화할 수 있습니다.

수정 파일:

```txt
admin.html
js/admin.js
supabase/functions/admin-reset-password/index.ts
```

이 기능은 Supabase Edge Function 배포가 필요합니다.

## Edge Function 배포 전 주의

절대 아래 값을 GitHub나 프론트 파일에 넣지 마세요.

```txt
service_role key
SUPABASE_SERVICE_ROLE_KEY
sb_secret_...
DB password
JWT secret
```

`SUPABASE_SERVICE_ROLE_KEY`는 Supabase Dashboard 또는 CLI로 Functions Secret에만 저장해야 합니다.

## Supabase Edge Function 설정

### 1. Secret 설정

Supabase CLI를 쓰는 경우:

```bash
supabase secrets set SUPABASE_URL="https://프로젝트REF.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="service_role 키"
```

Dashboard에서 설정하는 경우:

```txt
Supabase Dashboard
→ Edge Functions
→ Secrets
→ SUPABASE_URL 추가
→ SUPABASE_SERVICE_ROLE_KEY 추가
```

### 2. Function 배포

CLI 예시:

```bash
supabase functions deploy admin-reset-password
```

## 적용 파일

GitHub에는 아래 파일을 업로드합니다.

```txt
mypage.html
js/dashboard.js
admin.html
js/admin.js
supabase/functions/admin-reset-password/index.ts
README-password-reset.md
```

기존 탐사 홈페이지 패치까지 함께 유지하려면 이 ZIP 안의 파일을 그대로 같은 위치에 업로드하세요.

## 작동 방식

### 사용자 본인 비밀번호 변경

```txt
mypage.html
→ 새 비밀번호 입력
→ supabase.auth.updateUser({ password })
```

로그인한 사용자만 자기 비밀번호를 바꿀 수 있습니다.

### 운영자 임시 비밀번호 설정

```txt
admin.html
→ 임시 비밀번호 입력
→ supabase.functions.invoke("admin-reset-password")
→ Edge Function에서 관리자 role 확인
→ service_role로 auth.admin.updateUserById 실행
```

프론트에는 service_role key가 전혀 들어가지 않습니다.
