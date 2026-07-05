# Y&ARCHER WORKS-GUEST (apps/guest)

외부 포털 앱. 참가 스타트업(guest_startup)·외부 전문가(guest_expert) 전용.

- 도메인: guest.ynarcher.co.kr (staging: guest.stg.ynarcher.co.kr)
- 로컬 포트: 3001
- 상태: **Phase 2에서 구현** (현재 placeholder — package.json이 없어 pnpm 워크스페이스가 무시)

## 범위 (Phase 2)

- guest_startup: 자기 회사 scope 데이터 조회/제출
- guest_expert: 자기 배정 scope 평가/멘토링

내부 사용자는 이 앱에 접근하지 않는다(내부는 apps/works). 외부 사용자의 데이터 접근은
hub/ac 테이블 직접 접근이 아니라 별도 view/RPC로 허용 필드만 제공한다.
자세한 IA/라우트는 `docs/yna_suite_information_architecture.md` §10-1 참고.
