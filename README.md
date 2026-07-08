# 마스코트 골든의 기념품샵

## 적용 방법

1. ZIP 압축을 푼다.
2. 압축 푼 폴더 안의 내용물을 GitHub 저장소 `main` 브랜치의 root에 업로드한다.
3. ZIP 파일 자체를 GitHub에 올리지 않는다.
4. GitHub Pages 반영 후 브라우저에서 `Ctrl + F5` 또는 시크릿 창으로 확인한다.

## v6.9.4 변경 내용

- 괴이 방문객용 `1회 한정 VIP 무료 인생권 이벤트` 추가.
- 괴이가 아직 무료 인생권을 사용하지 않았다면 아래 인생 상품 중 하나를 1회 무료로 구매할 수 있다.
  - 초자연 재난관리국 요원 인생권: `life_organization_code = disaster_agency`, `life_department_code = agent`
  - 백일몽 주식회사 현장탐사팀 인생권: `life_organization_code = baekildream`, `life_department_code = field_exploration`
- 무료 대상 상품은 상점에서 `VIP 무료 1회`로 표시된다.
- 하나를 무료로 구매하면 `profiles.free_life_claimed_at`, `profiles.free_life_item_id`가 기록되어 다시 무료 구매할 수 없다.
- 무료 구매여도 기존 인생권 적용 로직은 그대로 작동한다.
  - 괴이 이름은 유지된다.
  - 소속, 팀, 표시 소속명, 직책/직급 정보가 인생권 상세값으로 반영된다.

## Supabase SQL 실행

이번 버전은 SQL 실행이 필요하다.

Supabase SQL Editor에서 아래 파일 내용을 실행한다.

```txt
migrations/upgrade-v6.9.4-entity-free-life-event.sql
```

## 주의

- 무료 이벤트는 `가격을 0으로 깎는 처리`이지, 별도의 쿠폰 아이템을 지급하는 방식이 아니다.
- 무료 대상 판단은 아이템의 인생 상품 상세값 기준이다.
- 이미 무료 인생권을 사용한 괴이는 이후 같은 종류의 인생권도 정상 가격으로 구매한다.
- `purchase_item` 함수가 교체되므로 SQL 실행을 빼먹으면 화면 표시는 바뀌어도 실제 무료 구매가 작동하지 않는다.
