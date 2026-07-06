# 관리자 임시 비밀번호 초기화 적용 순서

이 패치는 관리실에서 회원의 임시 비밀번호를 새로 설정하는 기능을 고친 버전입니다.

핵심은 이겁니다.

- `admin.html`, `js/admin.js`는 GitHub Pages에 올립니다.
- `supabase/functions/admin-reset-password/index.ts`는 GitHub Pages가 아니라 Supabase Edge Function으로 배포합니다.
- `service_role key`는 절대 GitHub에 올리지 않습니다. 절대 `config.js`에 넣지 않습니다. 브라우저에 넣는 순간 보안이 종이문짝 됩니다.

## 1. GitHub Pages에 올릴 것

ZIP을 압축 해제한 뒤, 압축 푼 폴더 안의 내용물을 GitHub 저장소의 `main` 브랜치 root에 업로드하세요.

중요합니다.

- ZIP 파일 자체를 올리는 게 아닙니다.
- 압축 푼 폴더 안의 파일과 폴더를 올립니다.
- `main` 브랜치에 올립니다.
- 현재 GitHub Pages 설정이 `Deploy from a branch / main / root`라면 이 구조가 맞습니다.

## 2. Supabase Edge Function 배포가 필요한 이유

관리자가 다른 회원의 비밀번호를 바꾸려면 Supabase Auth Admin API가 필요합니다.
이 API는 `service_role key`가 있어야 작동합니다.

그런데 `service_role key`를 `js/config.js` 같은 프론트 파일에 넣으면 사용자가 개발자도구로 볼 수 있습니다.
그래서 이 기능은 반드시 Supabase Edge Function에서 실행해야 합니다.

## 3. Supabase Dashboard에서 배포하는 방법

CLI가 어렵다면 Dashboard 방식이 낫습니다.

1. Supabase Dashboard에 들어갑니다.
2. 해당 프로젝트를 엽니다.
3. 왼쪽 메뉴에서 Edge Functions로 갑니다.
4. 새 Function을 만듭니다.
5. Function 이름은 반드시 아래처럼 합니다.

```txt
admin-reset-password
```

6. 코드 편집기에 아래 파일 내용을 붙여넣습니다.

```txt
supabase/functions/admin-reset-password/index.ts
```

7. 저장/배포합니다.

Supabase 공식 문서 기준으로 Edge Function은 Dashboard에서도 만들고 배포할 수 있고, TypeScript/Deno 런타임으로 동작합니다.

## 4. Edge Function Secret 설정

Edge Function에는 아래 Secret이 필요합니다.

필수:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

권장:

```txt
SUPABASE_ANON_KEY
```

값을 넣는 위치:

```txt
Supabase Dashboard
→ Edge Functions
→ Secrets
```

각 값은 여기서 확인합니다.

```txt
Supabase Dashboard
→ Project Settings
→ API
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 GitHub에 올리지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 `js/config.js`에 넣지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 Supabase Edge Function Secret에만 넣습니다.

## 5. CLI로 배포하는 방법

터미널을 쓸 수 있으면 아래 방식도 됩니다.

```bash
supabase login
supabase link --project-ref 프로젝트REF
supabase secrets set SUPABASE_URL="https://프로젝트REF.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="service_role 키"
supabase secrets set SUPABASE_ANON_KEY="anon 또는 publishable key"
supabase functions deploy admin-reset-password
```

Supabase 공식 문서 기준으로 CLI 배포는 `supabase functions deploy 함수명` 형식입니다.

## 6. 작동 확인

1. 홈페이지에서 관리자 계정으로 로그인합니다.
2. `admin.html` 관리실에 들어갑니다.
3. 회원 목록의 `임시 비밀번호` 칸에 8자 이상 비밀번호를 입력합니다.
4. `초기화` 버튼을 누릅니다.
5. 성공 메시지가 뜨면 해당 회원은 그 임시 비밀번호로 로그인할 수 있습니다.

## 7. 실패할 때 원인 구분

### `FunctionsFetchError`, `Function not found`, `Failed to send` 비슷한 오류

대개 Edge Function이 배포되지 않았거나 이름이 다릅니다.

확인할 것:

```txt
Function 이름 = admin-reset-password
```

### `Edge Function secret이 설정되지 않았습니다`

Secret이 빠졌습니다.

확인할 것:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### `관리자만 비밀번호를 초기화할 수 있습니다`

현재 로그인한 계정의 `profiles.role`이 `admin`이 아닙니다.

확인할 것:

```sql
select id, site_id, email, role
from public.profiles;
```

관리자 계정의 role이 `admin`이어야 합니다.

### `대상 사용자를 찾을 수 없습니다`

회원 목록의 profile id와 Supabase Auth user id가 맞지 않는 상태일 수 있습니다.
`profiles.id`는 `auth.users.id`와 같아야 합니다.

### 8자 미만 오류

Supabase Auth 비밀번호 정책과 별개로 이 패치에서는 임시 비밀번호를 8자 이상으로 제한했습니다.

## 8. 이번 버전에서 바뀐 점

- Edge Function에서 로그인 세션 누락 오류를 더 명확히 표시합니다.
- `SUPABASE_ANON_KEY` 또는 `SUPABASE_PUBLISHABLE_KEY` Secret을 보조로 읽을 수 있게 했습니다.
- `admin_logs` 기록 실패가 비밀번호 초기화 성공을 막지 않게 했습니다.
- 관리실 JS 오류 메시지를 조금 더 알아볼 수 있게 했습니다.

