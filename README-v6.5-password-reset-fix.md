# v6.5 관리자 임시비밀번호 초기화 수정

## 수정 내용
- 관리자 페이지 아래쪽의 중복 안내 박스를 제거했습니다.
- 프론트에서 Edge Function 호출 시 현재 로그인 세션 access token을 명시적으로 전달합니다.
- Edge Function의 관리자 판정을 Auth UID 기준으로 먼저 확인하고, 기존 DB 구조 호환을 위해 Auth JWT의 email 기준도 보조 확인합니다.
- 실패 시 화면에 debug 정보가 같이 표시되도록 했습니다.

## 적용 순서
1. 이 ZIP을 압축 풉니다.
2. 압축 푼 폴더 안의 내용물을 GitHub 저장소 main 브랜치 root에 업로드합니다. ZIP 파일 자체를 올리지 마세요.
3. Supabase Edge Functions > admin-reset-password > Open Editor에서 `supabase/functions/admin-reset-password/index.ts` 내용을 다시 붙여넣고 Deploy function을 누릅니다.
4. 홈페이지에서 로그아웃 후 다시 로그인하고 테스트합니다.
