# Y&ARCHER WORKS 유지보수 및 코드 작성 규칙 가이드

본 문서는 Y&ARCHER WORKS의 코드 유지보수성을 지키기 위한 개발 규칙을 정의한다. 목표는 코드가 단순히 지금 동작하는 데서 끝나지 않고, 다음 사람이 안전하게 읽고 수정할 수 있는 구조를 유지하는 것이다.

핵심 원칙:

```txt
코드는 "지금 동작하는 것"보다 "다음 사람이 안전하게 바꿀 수 있는 것"을 우선한다.
```

## 1. 파일 크기 제한

수동 작성 파일은 작고 명확하게 유지한다.

권장 기준:

```txt
단일 수동 작성 파일: 500줄 이하
단일 React 컴포넌트: 250줄 이하
단일 함수: 50줄 이하
단일 hook: 150줄 이하
단일 Zod schema 파일: 300줄 이하
```

운영 규칙:

```txt
500줄을 넘는 파일은 코드 리뷰에서 분리하지 않은 이유를 설명해야 한다.
컴포넌트가 250줄을 넘으면 UI, 상태, 데이터 조회, 폼 로직 분리를 검토한다.
함수가 50줄을 넘으면 helper, service, parser, validator로 분리한다.
```

예외:

```txt
자동 생성 파일
Supabase generated DB types
마이그레이션 SQL
fixture/mock 데이터
상수/매핑 전용 파일
문서 파일
```

## 2. 앱 간 의존성 규칙

앱끼리는 직접 import하지 않는다.

금지:

```txt
apps/works -> apps/guest (앱 간 직접 import 금지)
apps/guest -> apps/works
packages/ui -> apps/works (공통 UI가 앱을 참조 금지)
packages/master-data -> apps/works (도메인 로직이 앱을 참조 금지)
```

허용:

```txt
apps/* -> packages/*
apps/* -> app 내부 features/components/hooks
packages/* -> packages/core 또는 외부 라이브러리
```

공유가 필요한 코드는 `packages/`로 이동한다.

```txt
권한 판단: packages/permissions
마스터 데이터 로직: packages/master-data
DB client/query helper: packages/database
공통 UI: packages/ui
공통 타입/상수: packages/core
환경 설정: packages/config
```

## 3. 페이지/컴포넌트 분리 규칙

페이지 컴포넌트는 조립을 담당하고, 복잡한 로직을 직접 품지 않는다.

나쁜 구조:

```txt
apps/works/src/app/(app)/startups/page.tsx
  조회
  필터
  테이블
  모달
  저장 로직
  권한 체크
  validation
  컬럼 정의
```

권장 구조:

```txt
page.tsx
StartupTable.tsx
StartupFilterBar.tsx
StartupFormDialog.tsx
useStartups.ts
startup.schema.ts
startup.columns.ts
startup.actions.ts
```

분리 기준:

```txt
데이터 조회 -> hook 또는 service
폼 검증 -> Zod schema
테이블 컬럼 -> columns 파일
서버 변경 작업 -> actions 또는 service
복잡한 modal/sheet -> 독립 컴포넌트
권한 판단 -> packages/permissions
```

## 4. 비즈니스 로직 위치 규칙

UI 컴포넌트 안에 핵심 비즈니스 로직을 넣지 않는다.

금지:

```txt
컴포넌트 내부에서 마스터 병합 점수 계산
컴포넌트 내부에서 권한 matrix 직접 계산
컴포넌트 내부에서 전화번호/사업자번호 정규화
컴포넌트 내부에서 Supabase query를 여러 군데 중복 작성
packages/ui 공통 패키지 내부에서 fetch, axios, Supabase query 등 API 호출을 직접 호출
packages/ui 공통 패키지 내부에서 useQuery, useMutation 등 데이터 페칭 hook 직접 사용
```

권장 위치:

```txt
마스터 식별/정규화/병합 후보: packages/master-data
권한 판단: packages/permissions
DB 접근 공통: packages/database
날짜/문자열 포맷: packages/utils
공통 타입: packages/core
API 연동이 필요한 셀렉터/체커 컴포넌트: packages/master-data (또는 개별 apps/*)
```

## 5. UI 작성 규칙

UI는 디자인 시스템을 따른다.

원칙:

```txt
새 색상은 임의로 추가하지 않는다.
색상은 design token을 사용한다.
공통 컴포넌트는 packages/ui를 우선 사용한다.
테이블/폼/필터/모달은 앱별로 새로 만들지 않는다.
카드 안에 카드를 중첩하지 않는다.
업무 화면은 과한 여백보다 적절한 밀도를 우선한다.
```

새 UI가 필요할 때:

```txt
1. packages/ui에 이미 있는지 확인
2. shadcn/ui 기반으로 확장 가능한지 확인
3. 2개 앱 이상에서 필요하면 packages/ui로 이동
4. 디자인 토큰이 필요하면 design_system 문서 갱신
```

## 6. 네이밍 규칙

파일명과 함수명은 역할이 드러나야 한다.

권장:

```txt
React 컴포넌트: PascalCase.tsx
hook: use*.ts
Zod schema: *.schema.ts
테이블 컬럼: *.columns.ts
서버 액션: *.actions.ts
query hook: use*.ts
타입: *.types.ts
상수: *.constants.ts
```

예시:

```txt
StartupTable.tsx
StartupFormDialog.tsx
useStartupSearch.ts
startup.schema.ts
startup.columns.ts
startup.actions.ts
startup.types.ts
```

## 7. 주석 규칙

주석은 코드의 의도를 설명할 때 사용한다.

권장:

```txt
권한 판단의 이유
RLS와 맞물리는 조건
마스터 병합 정책
데이터 정규화 예외
마이그레이션 의도
운영상 위험한 예외 처리
```

피해야 할 주석:

```txt
코드를 그대로 읽어주는 주석
오래된 TODO
담당/조건 없는 TODO
실제 동작과 맞지 않는 설명
```

TODO 형식:

```txt
// TODO(owner/date): 왜 필요한지, 완료 조건
```

## 8. 테스트 기준

다음 로직은 테스트를 우선한다.

필수:

```txt
권한 판단 로직
마스터 데이터 정규화
식별자 생성/정규화
중복 후보 점수 계산
병합 정책
RLS 관련 helper
```

권장:

```txt
폼 validation schema
테이블 필터 로직
import row parser
환경변수 parser
```

E2E 대상:

```txt
로그인
권한 없는 접근 차단
Hub 마스터 생성
Dev 권한 변경
마스터 병합
Work Program First 연결 mock/test flow
```

## 9. 문서 갱신 규칙

구조나 정책을 바꾸면 관련 문서를 함께 갱신한다.

```txt
새 테이블/컬럼 추가 -> yna_suite_data_model.md
DB 운영 규칙 변경 -> yna_suite_database_operations.md
권한/RLS 변경 -> yna_suite_auth_permissions.md
마스터 병합 정책 변경 -> yna_suite_master_data_policy.md
환경변수 추가 -> yna_suite_environment_deployment.md
UI 토큰/컴포넌트 변경 -> yna_suite_design_system.md
IA/메뉴/라우트 변경 -> yna_suite_information_architecture.md
폴더 구조 변경 -> yna_suite_foldering.md
Phase 범위 변경 -> yna_suite_phase1_scope.md
기존 구현체 반영 기준 변경 -> yna_suite_existing_source_alignment.md
```

문서 갱신이 필요한 변경을 코드만 바꾸고 끝내지 않는다.

## 10. 의존성 추가 규칙

새 라이브러리는 신중하게 추가한다.

추가 전 확인:

```txt
기존 스택으로 해결 가능한가?
이미 같은 목적의 라이브러리가 있는가?
bundle size 영향은 괜찮은가?
서버/클라이언트 환경에서 모두 안전한가?
유지보수가 활발한가?
```

금지:

```txt
동일 목적 UI 라이브러리 중복 도입
날짜 라이브러리 중복 도입
차트 라이브러리 중복 도입
폼 라이브러리 중복 도입
테이블 라이브러리 중복 도입
```

## 11. DB 접근 규칙

DB 접근은 흩어지지 않게 관리한다.

권장:

```txt
Supabase client 생성은 packages/database에서 관리
공통 query helper는 packages/database에 둔다.
도메인별 query는 app 내부 service 또는 feature에 둔다.
마스터 데이터 query는 packages/master-data를 우선한다.
```

주의:

```txt
같은 Supabase query를 여러 화면에 복붙하지 않는다.
권한이 필요한 query는 RLS와 UI 권한을 함께 고려한다.
service role query는 서버 전용으로 격리한다.
```

## 12. 변경 영향도 체크

PR 또는 주요 변경 전 다음을 확인한다.

```txt
어떤 앱에 영향을 주는가?
packages 변경으로 여러 앱이 영향받는가?
DB migration이 필요한가?
RLS 변경이 필요한가?
문서 갱신이 필요한가?
테스트 추가가 필요한가?
권한 없는 사용자에게 노출될 위험이 있는가?
모바일 레이아웃이 깨지지 않는가?
```

## 13. 코드 리뷰 체크리스트

리뷰어는 다음을 확인한다.

```txt
파일이 과도하게 커지지 않았는가?
단일 컴포넌트가 너무 많은 책임을 갖지 않는가?
앱 간 import가 없는가?
공통 로직이 앱 내부에 갇혀 있지 않은가?
권한 체크가 누락되지 않았는가?
RLS 영향을 고려했는가?
테스트가 필요한 로직에 테스트가 있는가?
디자인 시스템 토큰을 사용했는가?
문서 갱신이 필요한 변경인가?
```

## 14. 예외 처리

규칙을 지키기 어려운 경우 예외를 허용할 수 있다. 단, 이유가 남아야 한다.

예외 예시:

```txt
마이그레이션 SQL이 500줄을 초과
자동 생성 DB 타입 파일이 매우 큼
한 화면 전용 임시 코드가 Phase 1 일정상 필요
```

예외 조건:

```txt
코드 리뷰에서 사유 설명
후속 정리 TODO 기록
위험 범위 명시
```

## 15. 최종 요약

Y&ARCHER WORKS의 유지보수 규칙은 다음을 핵심으로 한다.

```txt
수동 작성 파일은 500줄 이하를 원칙으로 한다.
앱끼리는 직접 import하지 않는다.
공통 로직은 packages로 이동한다.
페이지는 조립만 담당한다.
비즈니스 로직은 UI에서 분리한다.
권한/마스터/DB 로직은 정해진 패키지를 사용한다.
새 구조를 만들면 관련 문서를 갱신한다.
테스트가 필요한 핵심 로직은 테스트를 남긴다.
```

유지보수성은 나중에 정리하는 것이 아니라, 처음부터 깨지지 않게 설계하는 운영 규칙이다.
