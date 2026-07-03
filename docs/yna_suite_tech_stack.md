# Y&A Suite 개발 스택 가이드

본 문서는 Y&A Suite의 1차 개발 스택을 정의하고, 각 기술을 선택하는 이유와 적용 범위를 정리한다. Y&A Suite는 서비스별 독립 도메인으로 배포되지만, 인증/권한/마스터 데이터는 하나의 체계로 공유하는 반응형 웹 기반 업무 시스템이다.

## 1. 기본 전제

Y&A Suite는 다음 특성을 가진다.

1. `apps/*` 단위로 여러 서비스를 독립 배포한다.
2. 각 서비스는 반응형 웹으로 개발한다.
3. 모바일 앱은 1차 범위에서 제외하되, 추후 패키징 가능성을 열어둔다.
4. Supabase 기반의 단일 물리 DB와 논리 스키마 분리를 사용한다.
5. 인증, 권한, 마스터 데이터, UI는 공통 패키지로 관리한다.

## 2. 1차 추천 스택

```txt
Monorepo     : pnpm workspace + Turborepo
Frontend     : Next.js + React
Language     : TypeScript
Backend/DB   : Supabase
UI           : Tailwind CSS + shadcn/ui
Forms        : React Hook Form + Zod
Data Fetch   : TanStack Query
Tables       : TanStack Table
Charts       : Recharts
Testing      : Vitest + Playwright
Deploy       : Vercel
```

## 3. Monorepo: pnpm workspace + Turborepo

Y&A Suite는 `apps/hub`, `apps/work`, `apps/fund`처럼 여러 앱이 존재하고, 각 앱이 `packages/auth`, `packages/permissions`, `packages/master-data`, `packages/ui` 같은 공통 패키지를 공유한다.

`pnpm workspace`는 하나의 저장소 안에서 앱과 패키지 간 의존성을 명확하게 연결하기 좋다. 패키지 설치 속도와 디스크 사용량도 효율적이다.

`Turborepo`는 앱별 빌드, 테스트, 린트 작업을 빠르게 실행하고 캐싱할 수 있게 해준다. 서비스별 독립 배포 구조에서는 특정 앱만 빌드하거나 테스트하는 일이 많기 때문에 유용하다.

예시:

```txt
pnpm --filter @yna/work build
pnpm --filter @yna/fund test
turbo build --filter=@yna/hub
```

## 4. Frontend: Next.js + React

React는 컴포넌트 재사용, 반응형 웹 개발, 추후 모바일 패키징 가능성 측면에서 적합하다.

Next.js는 서비스별 도메인, 로그인 콜백, 보호 라우트, 서버 측 처리, middleware를 관리하기 좋다. Y&A Suite는 SSO, 권한, RLS, 도메인별 접근 제어가 중요하므로 단순 SPA보다 Next.js 기반이 안정적이다.

적용 기준:

```txt
apps/hub          -> Next.js app
apps/dev          -> Next.js app
apps/work         -> Next.js app
apps/mna          -> Next.js app
apps/project      -> Next.js app
apps/fund         -> Next.js app
apps/management   -> Next.js app
```

## 5. Language: TypeScript

Y&A Suite는 스타트업, 전문가, 협력사, 심사역, 펀드, 프로젝트, 권한 등 도메인 타입이 많다. TypeScript를 사용하면 도메인 모델과 DB 타입을 공통 패키지로 공유할 수 있고, 앱 간 데이터 계약을 명확하게 유지할 수 있다.

주요 사용 위치:

```txt
packages/core       -> 공통 타입, 도메인 상수
packages/database   -> Supabase generated types
packages/auth       -> 세션/사용자 타입
packages/permissions -> 권한 타입
packages/master-data -> 마스터 데이터 타입
```

## 6. Backend/DB: Supabase

Supabase는 Y&A Suite의 데이터 아키텍처와 잘 맞는다.

| Supabase 기능 | 사용 목적 |
| :--- | :--- |
| Auth | SSO 기반 계정, 로그인, 세션 |
| Postgres | 단일 물리 DB, 서비스별 논리 스키마 분리 |
| RLS | 사용자별/도메인별 데이터 접근 제어 |
| Storage | 실사자료, 계약서, 첨부파일 |
| Edge Functions | 병합 처리, 알림, 배치성 작업 |

스키마는 서비스 도메인과 동일한 기준으로 나눈다.

```txt
hub
dev
work
mna
project
fund
management
```

## 7. UI: Tailwind CSS + shadcn/ui

Y&A Suite는 업무형 SaaS에 가깝다. 폼, 테이블, 모달, 탭, 필터, 상세 패널 같은 화면 요소가 반복적으로 등장한다.

Tailwind CSS는 앱별 화면을 빠르게 만들면서도 디자인 규칙을 공통화하기 좋다. `packages/ui`에서 디자인 토큰과 공통 컴포넌트를 관리하면 서비스별 UI 일관성을 유지할 수 있다.

shadcn/ui는 Radix UI 기반의 접근성 좋은 컴포넌트를 프로젝트 내부 코드로 소유하는 방식이다. 외부 UI 라이브러리에 과하게 묶이지 않고, Y&A Suite에 맞게 수정하기 쉽다.

주요 위치:

```txt
packages/ui/
  components/
  layout/
  tokens/
  styles/
```

## 8. Forms: React Hook Form + Zod

Y&A Suite는 입력 화면이 많다.

예시:

```txt
프로그램 신청
스타트업 등록
전문가 등록
딜 등록
펀드 납입 입력
권한 매핑
HR 정보 입력
```

React Hook Form은 복잡한 폼에서도 성능이 좋고, 필드 상태 관리가 가볍다. Zod는 입력값 검증과 TypeScript 타입 추론을 함께 제공하므로, 프론트엔드 검증 규칙과 데이터 타입을 일관되게 유지할 수 있다.

## 9. Data Fetch: TanStack Query

Supabase 데이터를 여러 화면에서 조회, 수정, 갱신해야 하므로 클라이언트 데이터 상태 관리가 중요하다.

TanStack Query는 다음 기능을 안정적으로 제공한다.

```txt
캐싱
로딩 상태
에러 상태
재요청
mutation 이후 목록 갱신
optimistic update
```

Y&A Suite에서는 다음 흐름이 자주 발생한다.

```txt
목록 조회 -> 상세 조회 -> 수정 -> 목록 갱신
검색 -> 선택 -> 관계 생성
임시 등록 -> 승인 대기 풀 반영
```

이런 패턴에 TanStack Query가 잘 맞는다.

## 10. Tables: TanStack Table

Y&A Suite의 주요 화면은 테이블 중심이 될 가능성이 높다.

예시:

```txt
스타트업 목록
전문가 목록
협력사 목록
딜 파이프라인
펀드 납입 현황
프로젝트 마일스톤
권한 매핑 테이블
```

TanStack Table은 headless 방식이라 Y&A Suite의 디자인 시스템에 맞춰 자유롭게 UI를 입힐 수 있다. 정렬, 필터, 페이지네이션, 컬럼 숨김, 행 선택 같은 기능도 안정적으로 구현할 수 있다.

## 11. Charts: Recharts

1차 구축에서는 복잡한 시각화보다 업무 지표를 빠르게 보여주는 차트가 중요하다.

예시:

```txt
전사 지표 요약
펀드 소진율
프로그램 성과
월별 매출/이익
프로젝트 진행률
```

Recharts는 React 친화적이고 사용법이 단순해서 1차 구축에 적합하다. 추후 더 복잡한 시각화가 필요하면 ECharts를 일부 화면에 도입할 수 있다.

## 12. Testing: Vitest + Playwright

Vitest는 단위 테스트에 사용한다.

대상:

```txt
권한 판단 로직
마스터 데이터 정규화
중복 후보 점수 계산
식별자 포맷팅
폼 validation schema
```

Playwright는 실제 브라우저 기반 E2E 테스트에 사용한다.

대상:

```txt
로그인
권한별 접근 가능/불가능 화면
스타트업 등록
마스터 검색
임시 등록
병합 승인
주요 업무 플로우
```

특히 Y&A Suite는 권한과 화면 접근이 밀접하게 연결되므로, 핵심 플로우는 Playwright로 검증하는 것이 좋다.

## 13. Deploy: Vercel

Next.js를 사용한다면 Vercel이 가장 자연스럽다.

각 서비스를 별도 프로젝트로 만들고, Root Directory를 `apps/{service}`로 지정한다.

예시:

```txt
Project: Y&A Work
Root Directory: apps/work
Domain: work.ynarcher.co.kr
Build Command: pnpm --filter @yna/work build
```

서비스별 배포 매핑:

```txt
apps/hub          -> hub.ynarcher.co.kr
apps/dev          -> dev.ynarcher.co.kr
apps/work         -> work.ynarcher.co.kr
apps/mna          -> mna.ynarcher.co.kr
apps/project      -> project.ynarcher.co.kr
apps/fund         -> fund.ynarcher.co.kr
apps/management   -> management.ynarcher.co.kr
```

## 14. 모바일 대응 기준

1차 범위는 모바일 앱이 아니라 반응형 웹이다.

권장 기준:

```txt
Desktop: 관리자/실무자 메인 사용
Tablet: 회의, 심사, 현장 확인
Mobile: 조회, 승인, 알림 확인, 간단 입력
```

모바일에 적합한 기능:

```txt
대시보드 조회
알림 확인
승인/반려
간단 코멘트
스타트업/전문가 검색
일정/멘토링 확인
```

모바일에 적합하지 않은 기능:

```txt
대량 엑셀 업로드
복잡한 펀드 장부 입력
M&A 실사자료 관리
복잡한 권한 매핑
대형 테이블 편집
```

모든 화면은 모바일에서 깨지지 않아야 하지만, 복잡한 업무는 데스크톱 최적화를 우선한다.

## 15. 최종 요약

Y&A Suite의 1차 추천 스택은 다음과 같다.

```txt
pnpm workspace + Turborepo
Next.js + React + TypeScript
Supabase
Tailwind CSS + shadcn/ui
React Hook Form + Zod
TanStack Query + TanStack Table
Recharts
Vitest + Playwright
Vercel
```

이 조합은 여러 서비스 앱을 독립 배포하면서도, 공통 인증/권한/마스터 데이터 체계를 안정적으로 공유하기에 적합하다.
