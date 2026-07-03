# 4. Y&A 개발 이슈 및 메모

이 문서는 개발을 진행하면서 마주치는 **다양한 이슈, 돌발 상황, 의사결정 내역**을 가독성 있게 정리하는 메모장입니다. 

---

## 1. 아키텍처 의사결정 내역 (2026-07-03)

### 📌 이슈 01: 도메인 독립 배포 시 통합 로그인(SSO) 세션 공유 문제
*   **상황**: 기획서에는 `yna-hub.co.kr`, `yna-work.co.kr`처럼 도메인을 완전히 분리하기로 함.
*   **문제**: 브라우저 보안 규정상 완전히 다른 도메인 간에는 세션 쿠키가 공유되지 않음. 사용자가 서비스 이동 시마다 로그인 창을 새로 봐야 하는 문제 발생.
*   **해결**: 회사 보유 도메인인 `ynarcher.co.kr`을 활용하여, `hub.ynarcher.co.kr`, `work.ynarcher.co.kr` 같이 **서브도메인 형태로 배포 주소를 통일**하기로 결정함. 이렇게 하면 쿠키 공유가 정상 작동하여 한 번 로그인으로 모두 이용 가능함.

### 📌 이슈 02: RLS(조회 권한 검증) 적용 시 화면 로딩 지연 우려
*   **상황**: 보안 규칙상 매번 권한 테이블(`dev.user_permissions`)에 접근하여 조인을 수행하는 쿼리로 헬퍼 함수가 작성됨.
*   **문제**: 대량의 스타트업 목록을 가져올 때 한 줄 한 줄마다 권한 테이블 조회 쿼리가 실행되어 화면 속도가 매우 느려짐.
*   **해결**: 사용자가 로그인할 때 발급되는 토큰(JWT)의 `app_metadata` 공간에 권한 목록을 미리 실어보내기로 함. DB 조인 없이 토큰 값만 1단계로 파싱하여 고속 검증하도록 표준 코드를 수정함.

### 📌 이슈 03: 스타트업 대장 병합 시 DB 먹통(Lock) 우려
*   **상황**: 관리자가 중복 기업 병합을 승인하면, 해당 기업과 연결된 모든 평가, 프로젝트, 펀드 이력 등의 FK(관계값)를 한꺼번에 업데이트해야 함.
*   **문제**: 대량이 업데이트되는 동안 데이터베이스 테이블 전체에 락(Lock)이 걸려 타 사용자들이 글을 쓰거나 읽지 못하고 대기해야 함.
*   **해결**: 병합 승인 시점에는 원장의 상태만 빠르게 변경하여 동기식 트랜잭션을 끝내고, 수많은 관계 테이블의 데이터 갱신은 백그라운드 워커를 통해 차례대로 비동기 처리하는 **2단계 병합 아키텍처**를 수립함.

### 📌 이슈 04: 공통 UI 프로젝트의 비즈니스 오염 우려
*   **상황**: 공통 UI 모듈(`packages/ui`)에 스타트업을 직접 검색하여 데려오는 `StartupPicker` 등의 컴포넌트를 설계함.
*   **문제**: UI가 비즈니스 API 쿼리나 데이터 모델을 역으로 가져다 쓰는 결합 상태가 됨. 이로 인해 코드 패키지 간 순환 참조(Circular Dependency) 오류가 나거나 빌드가 무거워짐.
*   **해결**: `packages/ui`는 오직 화면 스타일링 컴포넌트(Atom)만 갖도록 제한함. API 쿼리가 수반되는 도메인 특화 Picker는 `packages/master-data` 또는 각 서비스 앱의 개별 폴더에서 구현하기로 함.

---

## 1-1. 개발 환경 구축 메모 (Phase 1.0, 2026-07-03)

### 📌 이슈 05: 커밋된 `.env.local`에 실제 anon key 노출 (작성일자: 2026-07-03)
*   **상황**: 저장소에 `.env.local`이 git으로 추적되고 있었고, 실제 Supabase URL과 anon key가 담겨 있었음.
*   **문제**: 환경 문서(`yna_suite_environment_deployment.md` §11) 기준 `.env.local` 계열은 커밋 금지 대상. anon key는 RLS 전제하에 공개 가능한 publishable 키라 즉시 위험은 낮지만, 정책상 저장소에 남으면 안 됨.
*   **해결**: `.gitignore`에 `.env`/`.env.local`/`.env.*.local` 등을 추가하고 `git rm --cached .env.local`로 추적만 해제(로컬 파일은 유지). 키가 publishable 등급이라 즉시 rotation은 불필요하나, 민감 secret이 아니었는지 확인 권장.

### 📌 이슈 06: pnpm 전역 shim 설치 실패 → Corepack 경유 사용 (작성일자: 2026-07-03)
*   **상황**: `corepack enable`이 `C:\Program Files\nodejs\`에 shim을 쓰려다 EPERM(권한) 오류로 실패.
*   **문제**: 전역 `pnpm` 명령이 PATH에 없어 바로 실행 불가.
*   **해결**: pnpm 버전을 `package.json`의 `packageManager: pnpm@11.9.0`으로 고정하고, 전역 shim 없이 `corepack pnpm <명령>`으로 실행. 관리자 권한으로 `corepack enable`을 한 번 실행하면 전역 `pnpm`도 사용 가능. README에 안내함.

### 📌 이슈 07: Phase 1.0 앱별 스택 설치 이월 결정 (작성일자: 2026-07-03)
*   **상황**: 체크리스트 1.0 "기본 라이브러리 설치"는 Next/React 등 앱별 1차 스택 전체 설치를 요구하나, 앱 스캐폴딩(1.1)이 아직 없음.
*   **문제**: 앱이 없는 상태에서 프레임워크 스택을 설치할 위치가 없음.
*   **해결**: 1.0에서는 루트 공통 도구(turbo/typescript/prettier)만 설치해 lockfile을 확정하고, 앱별 프레임워크 스택 설치와 Hub/Dev 실행·smoke 재현은 Phase 1.1로 이월. 체크리스트/진행로그에 이월 사유 명시.

---

## 1-2. 스캐폴딩 메모 (Phase 1.1, 2026-07-03)

### 📌 이슈 08: 내부 패키지 빌드 방식 — TS 소스 직접 export + transpilePackages (작성일자: 2026-07-03)
*   **상황**: `packages/*` 공통 패키지를 앱에서 쓰려면 보통 각 패키지를 `tsc`로 빌드해 `dist`를 export해야 함.
*   **문제**: 패키지마다 빌드 스텝을 두면 watch/캐시/순서 관리가 복잡해지고, 초기 스캐폴딩 단계에서 과함.
*   **해결**: 각 패키지 `package.json`의 `exports`를 `./src/index.ts`(소스)로 두고, 앱(`next.config.mjs`)의 `transpilePackages`에 `@yna/*`를 등록해 Next가 직접 트랜스파일하도록 함. 패키지엔 build 스크립트가 없고 typecheck는 `tsc --noEmit`으로만 검증. (근거: yna_suite_foldering.md §7)

### 📌 이슈 09: 의존성 스택 일부 이연 — 미사용 라이브러리 금지 규칙 준수 (작성일자: 2026-07-03)
*   **상황**: 스택 문서(tech_stack.md)는 Tailwind/shadcn/RHF/Zod/TanStack Query·Table/Recharts/Vitest/Playwright를 1차 스택으로 명시.
*   **문제**: 공통 게이트의 "새 라이브러리 추가 검토(사용처 확인)" 및 유지보수 규칙상 실제 사용처 없는 의존성을 미리 설치하면 안 됨.
*   **해결**: 이번엔 실행에 필요한 기반만 설치(Next 15, React 19, Tailwind v3.4, TanStack Query, Zod, Supabase client, Vitest). shadcn 컴포넌트 본체·RHF·TanStack Table·Recharts·Playwright는 실제 화면/기능이 생기는 Phase 1.2+에서 추가. Tailwind는 v4 대신 안정적인 **v3.4** 채택.

### 📌 이슈 10: turbo가 pnpm 바이너리를 못 찾는 문제 (작성일자: 2026-07-03)
*   **상황**: 이슈 06대로 pnpm 전역 shim이 없어 `corepack pnpm`으로 실행. 그런데 `corepack pnpm build`(=`turbo run ...`) 시 turbo가 "cannot find binary path"로 실패.
*   **문제**: turbo는 각 패키지 task를 실행하려고 PATH에서 `pnpm`을 찾는데, 전역 shim이 없어 못 찾음.
*   **해결**: 이미 PATH·쓰기 가능한 `%APPDATA%\npm`에 corepack shim 설치 — `corepack enable --install-directory "C:\Users\Admin\AppData\Roaming\npm" pnpm`. 이후 turbo 정상 동작. (새 기기 온보딩 시 동일 조치 필요할 수 있음. README/이슈 06과 함께 참고.)

### 📌 이슈 11: ESLint 단일 루트 flat config로 의존성 방향 강제 (작성일자: 2026-07-03)
*   **상황**: 앱/패키지마다 eslint를 설치·설정하면 중복이 크고, 앱은 `next lint` flat-config 연동이 번거로움.
*   **문제**: 의존성 방향 규칙(앱 간 import 금지, ui의 비즈니스/API import 금지)을 일관되게 강제할 위치가 필요.
*   **해결**: 루트 `eslint.config.mjs` 하나 + 경로별 override(`packages/ui/**`)로 `no-restricted-imports` 규칙을 둠. eslint는 루트에만 설치하고, pnpm이 워크스페이스 스크립트 실행 시 상위 `node_modules/.bin`을 PATH에 넣으므로 각 패키지 `eslint .`가 루트 바이너리·config를 사용. 앱 lint는 `next lint` 대신 `eslint .`로 통일하고 Next 빌드 린트는 `eslint.ignoreDuringBuilds`로 끔(중앙 관리).

---

## 1-3. 스키마/마이그레이션 메모 (Phase 1.3, 2026-07-03)

### 📌 이슈 12: RLS 기본 활성화(default deny)를 1.3에서 선반영 (작성일자: 2026-07-03)
*   **상황**: 실제 RLS 정책 구현은 Phase 1.4 항목이지만, 테이블을 먼저 만들면 정책이 붙기 전까지 상태를 어떻게 둘지 결정 필요.
*   **문제**: 정책 없이 테이블만 만들고 RLS 를 끄면, 서버/authenticated 경로에서 테이블이 사실상 열려 있게 되어 "권한 없음이 기본값" 원칙(database_operations §5, data_model §14)에 어긋남.
*   **해결**: `20260703171007_enable_rls_default_deny.sql`에서 hub/dev 14개 테이블에 `ENABLE ROW LEVEL SECURITY`만 적용. 정책이 하나도 없으면 authenticated/anon 은 기본 deny, service_role(BYPASSRLS)만 접근 가능. read/write 분리·scope·외부 사용자 격리 정책은 Phase 1.4에서 별도 migration 으로 추가. 즉 1.3은 "닫아두고", 1.4에서 "명시 허용".

### 📌 이슈 13: dev.permission_templates 를 1.3에 포함 (작성일자: 2026-07-03)
*   **상황**: 체크리스트 1.3의 명시 테이블 목록에는 `dev.permission_templates`가 없지만, data_model §15 우선순위1에는 포함됨.
*   **문제**: `dev.user_permissions.role_key`가 참조하는 역할 템플릿의 원본 테이블이 없으면 Phase 1.4/1.5 권한 부여 흐름의 근거가 비게 됨.
*   **해결**: 우선순위1·기반 테이블이므로 `20260703171006`에 함께 생성. FK 강제는 두지 않고(템플릿 삭제/버전 관리 유연성) role_key 는 논리적 참조로 둠. 초기 템플릿 8종 seed 는 Phase 1.4/1.5에서 별도 처리.

### 📌 이슈 14: 공통 updated_at 트리거 함수 위치 = dev.set_updated_at() (작성일자: 2026-07-03)
*   **상황**: 다수 테이블의 `updated_at`을 UPDATE 시 자동 갱신하려면 공통 트리거 함수가 필요.
*   **문제**: `public`에 함수를 두면 Data API(PostgREST)에 RPC 로 노출될 수 있고, 도메인 스키마(hub 등)에 두면 소유가 애매함.
*   **해결**: 시스템/권한 담당 스키마인 `dev`에 `dev.set_updated_at()`를 만들고, updated_at 컬럼이 있는 테이블(startups/experts/partners/managers, user_permissions, permission_templates)에 BEFORE UPDATE 트리거로 재사용. created_at-only 이력/로그 테이블에는 트리거를 붙이지 않음.

### 📌 이슈 15: Docker 미설치로 gen types/로컬 적용 미검증 (작성일자: 2026-07-03)
*   **상황**: 마이그레이션 7개 작성 후 `supabase db reset`(로컬 적용)과 `supabase gen types`로 `packages/database/src/types.ts` 대체를 계획.
*   **문제**: 현재 개발 환경은 Docker 미설치라 로컬 Supabase 를 띄울 수 없고, 원격 DB 직접 push 는 운영 DB 수정 금지 규칙상 불가.
*   **해결**: SQL 문법은 실제 Postgres 파서(libpg_query WASM, pg-query-emscripten)로 오프라인 검증(82 statements ALL_PASS). 실제 적용/gen types 는 Docker 있는 기기 또는 staging 링크 환경에서 `supabase db reset` → `supabase gen types typescript --local > packages/database/src/types.ts` 로 수행 예정. 그전까지 `types.ts`는 placeholder 유지(주석에 사유 명시).

---

## 1-4. 인증/권한 메모 (Phase 1.4, 2026-07-03)

### 📌 이슈 16: JWT 권한 주입 = Custom Access Token Hook 채택 (작성일자: 2026-07-03)
*   **상황**: `app_metadata.permissions`(No-Join RLS 전제)를 어떻게 실을지 두 방식(① Auth Hook Postgres 함수, ② 권한 변경 시 Admin API `updateUserById`)이 가능.
*   **문제**: ②는 권한 변경 지점마다 동기화 코드가 필요하고 누락 위험이 있으며, 토큰 갱신 시 자동 반영이 안 됨.
*   **해결**: 사용자 승인하에 ① 채택. `20260703180002`에 `dev.custom_access_token_hook(event jsonb)`를 만들어 토큰 발급/갱신 시 `dev.user_permissions`를 읽어 `app_metadata.permissions`(도메인별 read/write/scope/expires_at) + `app_metadata.roles`(역할 배열)를 주입. `config.toml [auth.hook.custom_access_token]`에 `pg-functions://postgres/dev/custom_access_token_hook` 등록. 훅은 `supabase_auth_admin`으로 실행되므로 해당 역할에 EXECUTE + `user_permissions` SELECT 정책 부여, 일반 역할에는 EXECUTE REVOKE. 권한 변경 즉시 반영이 필요하면 짧은 access token TTL/세션 무효화를 운영 정책으로 병행(auth_permissions §9).

### 📌 이슈 17: dev 폴백 세션(Supabase env 미설정 시) (작성일자: 2026-07-03)
*   **상황**: 이 개발 기기는 Docker 미설치로 로컬 Supabase 를 못 띄우고, 운영 DB 직접 접속은 금지라 실제 로그인 세션을 만들 수 없음.
*   **문제**: 실제 세션 없이 앱을 열면 미들웨어가 무한히 `/login`으로 보내 UI/배선 검증이 불가.
*   **해결**: 사용자 승인하에 dev 폴백 유지. `NEXT_PUBLIC_SUPABASE_URL` 등 공개 env 파싱 실패 시(`parsePublicEnvSafe`→null) `isSupabaseConfigured=false`로 보고, 미들웨어는 게이트 없이 통과, `getSession()`은 master 템플릿 권한의 폴백 세션(`lib/auth/dev-session.ts`)을 돌려줌. env 가 설정되면(운영/스테이징은 항상 설정) 실제 JWT 경로로 자동 전환되어 폴백은 노출되지 않음. `/login`은 폴백 모드에서 안내 문구만 표시.

### 📌 이슈 18: 인증 라우트 그룹 재구성 + 무-Docker 검증 범위 (작성일자: 2026-07-03)
*   **상황**: 로그인/콜백 화면은 AppShell 없이, 대시보드 등은 AppShell 안에서 렌더해야 하고, 세션은 서버에서 읽어야 함.
*   **문제**: 기존 루트 `layout.tsx`가 모든 경로를 AppFrame 으로 감싸 `/login`까지 shell 이 붙음. 또 페이지 이동으로 stale `.next/types`가 typecheck 를 깨뜨림.
*   **해결**: 각 앱에서 `src/app/(app)/` 라우트 그룹을 만들어 대시보드를 옮기고, `(app)/layout.tsx`(서버)에서 `getSession()`→미인증이면 `/login` redirect 후 `AppFrame`(user/permissions 주입) 렌더. 루트 layout 은 `Providers`만. `demo-session.ts` 제거, 권한/세션은 `lib/auth/*`로 이관. 페이지 이동 후 `.next` 삭제→`build`로 라우트 타입 재생성해야 typecheck 통과(온보딩 주의). **미검증(이슈15 연장)**: 실제 로그인 왕복, RLS 정책 적용, hook claim 주입, `gen types`는 Docker/staging 환경에서 `supabase db reset`→`gen types`→테스트 계정 RLS 로 확인 필요. SQL 은 오프라인 파서로 145 stmts ALL_PASS.

## 1-5. 사용자·권한 관리 메모 (Phase 1.5, 2026-07-03)

### 📌 이슈 19: Dev 사용자·권한 실데이터 경로를 mock 으로 대체(무-Docker) (작성일자: 2026-07-03)
*   **상황**: Phase 1.5(사용자 목록/상세·초대·권한 변경·매트릭스·외부 연결·감사)는 `auth.users` + `dev.user_permissions` 조회/변경과 초대(Admin API, service role)를 필요로 함.
*   **문제**: 이 기기는 Docker 미설치로 로컬 Supabase 를 못 띄우고(이슈15·17), 운영 DB 직접 접속은 금지라 실제 사용자/권한 데이터를 읽고 쓸 수 없음. `packages/database/src/types.ts` 도 아직 placeholder(gen types 미실행).
*   **해결**: 사용자 승인(무의존·네이티브 방침)하에 **데이터 계층을 분기(seam)** 로 구현. `apps/dev/src/lib/dev-data/service.ts`·`actions.ts` 는 `isSupabaseConfigured=false`(dev 폴백)면 `mock-store.ts`(globalThis 캐시 in-memory)로 화면·배선·안전장치·감사 흐름을 실제로 구동하고, env 가 설정된 경우(운영/스테이징)에는 명시적으로 "Docker/staging 에서 연결 예정" 오류를 던져 미완성 실데이터 경로가 조용히 노출되지 않게 함. Docker/staging 에서 `supabase db reset`→`gen types` 후 이 seam 에 실제 쿼리(auth.users 조인 + dev.user_permissions + Admin API 초대)를 붙이면 됨. mock 스토어는 운영 env 에서 절대 사용되지 않음.

### 📌 이슈 20: 인터랙티브 UI 컴포넌트를 네이티브(무의존)로 구현 (작성일자: 2026-07-03)
*   **상황**: Phase 1.5 는 드롭다운·확인 dialog·데이터 테이블이 필요. 1.2 에서 이들(Select/Dialog/DataTable)은 Radix/TanStack 승인 시점(1.5)으로 이연했음(이슈09 계열).
*   **문제**: Rule 8.3(외부 패키지 추가는 사전 승인)·미사용 의존성 금지. 새 의존성을 추가할지, 네이티브로 갈지 결정 필요.
*   **해결**: 사용자 결정으로 **외부 패키지 없이 네이티브 구현**(AppShell 의 네이티브 `<details>` 선례와 동일 방침). `packages/ui` 에 `Select`(네이티브 `<select>`)·`Switch`(role=switch button)·`Table`(시맨틱 `<table>`, design_system §12 규격)·`ConfirmDialog`(controlled 오버레이, Escape 취소·확인 포커스) 추가. `PermissionMatrix`/`DomainAccessSwitch`(design_system §10 — dev 소유)는 `apps/dev` 에서 이 primitive 로 조립. Radix/TanStack 은 실제 필요(복잡한 a11y/가상 스크롤)가 생기면 재검토.

## 1-6. Hub 스타트업 마스터 메모 (Phase 1.6, 2026-07-03)

### 📌 이슈 21: Hub 마스터 실데이터 경로를 mock seam 으로 대체(무-Docker) (작성일자: 2026-07-03)
*   **상황**: Phase 1.6(대시보드·통합 검색·스타트업 마스터 목록/상세·수정)은 `hub.startups`/`master_identifiers`/`master_aliases`/`master_field_history`/`merge_candidates`/`audit_logs` 조회·변경을 필요로 함.
*   **문제**: 이 기기는 Docker 미설치로 로컬 Supabase 를 못 띄우고(이슈15·17·19), 운영 DB 직접 접속은 금지라 실제 hub 스키마를 읽고 쓸 수 없음. `packages/database/src/types.ts` 도 아직 placeholder.
*   **해결**: 이슈19(dev)와 동일 방침으로 **데이터 계층을 분기(seam)** 로 구현. `apps/hub/src/lib/hub-data/service.ts`·`actions.ts` 는 `isSupabaseConfigured=false`(dev 폴백)면 `mock-store.ts`(globalThis in-memory, seed=`mock-seed.ts`)로 화면·필터·수정·field_history·감사 흐름을 실제로 구동하고, env 가 설정된 경우(운영/스테이징)에는 명시적 오류를 던져 미완성 실데이터 경로가 조용히 노출되지 않게 함. Docker/staging 에서 `supabase db reset`→`gen types` 후 이 seam 에 실제 쿼리(hub 스키마 조회 + RPC `create_temporary_master`/`search_master_candidates`)를 붙이면 됨.

### 📌 이슈 22: 1.6 범위 경계 — 전문가/협력사 상세·중복후보 파이프라인 이연 (작성일자: 2026-07-03)
*   **상황**: functional_spec §6 은 목록 필수기능에 "신규 생성"을, §5 통합 검색은 3종 마스터(스타트업/전문가/협력사)를 모두 대상으로 함. 그러나 전문가/협력사 상세(§8·9)는 Phase 1.7, 임시 마스터 생성 파이프라인·중복 후보 자동 생성(§10·11)은 Phase 1.8/1.10 항목임.
*   **문제**: 1.6 에서 어디까지 만들지 경계가 필요. 전 범위를 당기면 1.7/1.8/1.10 과 중복되고, 통합 검색에서 전문가/협력사를 빼면 §5 미충족.
*   **해결**: (1) 통합 검색·대시보드 집계는 전문가/협력사를 **최소 필드(SimpleMaster)** 로 mock 시드에 포함해 검색·카운트가 실제로 동작. 단, 상세 링크는 스타트업만 활성(전문가/협력사 행은 비링크, 상세는 1.7). (2) 목록 "신규 등록"은 **TEMP 임시 마스터 생성 + audit** 까지만 구현하고, normalized identifier 파이프라인·중복 후보 자동 생성(`merge_candidates`)은 1.8/1.10 으로 이연(`mockCreateStartup` 주석 명시). 상세의 중복 후보 섹션은 seed 된 후보를 조회·표시만 함(승인/반려 액션은 1.10).

### 📌 이슈 23: 개인정보 마스킹 유틸 확장 + 목록/상세 노출 분리 (작성일자: 2026-07-03)
*   **상황**: 규칙5·security_policy 상 목록 화면의 대표자/사업자번호/전화/이메일은 마스킹, 상세는 권한자+audit 전제 원본 노출.
*   **해결**: `@yna/utils/format` 에 `maskBusinessNumber`(앞 3자리)·`maskName`(가운데 마스킹) 추가(+단위 테스트 8개). 스타트업 **목록**은 대표자명·사업자번호를 마스킹, **상세**는 원본 노출(상세 진입 자체가 hub read 권한자 + 향후 조회 audit 대상). 식별자 섹션은 민감 식별자(business/corporation/phone/email) 값을 마스킹 표시.

## 1-7. Hub 전문가·협력사 마스터 메모 (Phase 1.7, 2026-07-03)

### 📌 이슈 24: 1.7 범위 경계 + 마스터 계층 엔티티 공용화 (작성일자: 2026-07-03)
*   **상황**: functional_spec §8·9 는 전문가/협력사의 목록·상세와 완료 기준(이메일/전화 정규화, 동명이인 이름만 자동 병합 금지, partner_type 관리, 사업자번호 중복 강반영)을 요구한다. 1.6 에서 전문가/협력사는 `SimpleMaster`(검색·집계용 최소 필드)로만 존재했다.
*   **문제**: (1) 어디까지 만들지 경계 필요 — 신규 등록·중복 후보 생성/승인은 1.8/1.10 항목과 겹친다. (2) 스타트업 상세/목록 로직(식별자·별칭·필드이력·중복후보·감사·수정/추가/상태 dialog)을 전문가/협력사에 그대로 복제하면 3중 중복이 되어 유지보수 규칙(파일 크기·재사용)에 어긋난다.
*   **해결**:
    *   **범위**: 전문가/협력사 **목록·상세 + 기본정보 수정·식별자/별칭 추가·상태 변경**까지 구현. **신규(임시) 마스터 생성 UI 는 넣지 않음**(§8·9 목록 필수기능에 신규 생성 없음) → Phase 1.8 공통 임시 마스터 생성 API 로 이연. 중복 후보는 seed 를 **표시만**(승인/반려는 Phase 1.10). 동명이인(`ex-3`/`ex-9` 이심사)·사업자번호 일치(`pt-temp`→`pt-2` 96점)는 "이름만으로 자동 병합 안 함 / 사업자번호는 강하게 반영"을 보여주는 시드 예시로만 둔다.
    *   **엔티티 공용화**: 식별자/별칭/필드이력/감사/중복후보를 `hub-data` 에서 엔티티 공용으로 다룬다. `mock-store` 에 `subTables(entityType,id)` 조회와 `updateMasterFields`/`addIdentifierRow`/`addAliasRow`/`setMasterStatus` 제네릭 mutation(+`appendAudit(entityType,…)`)을 두고, 스타트업 함수는 얇은 래퍼로 유지. 서버 액션은 `action-helpers` 의 `runAddIdentifier`/`runAddAlias`/`runSetStatus` 공용 runner + 엔티티별 `updateXBasic`(전문가는 전문분야 태그, 협력사는 partner_type diff 포함)으로 조립. 상세 화면 섹션과 수정/추가/상태 dialog 는 `components/masters/*` 공용 컴포넌트로 이관하고 스타트업도 이를 사용(startup 전용 4파일 삭제).
    *   Docker/staging 연결 시 `mock-store` 제네릭 mutation 과 `mock-masters` 조회만 실제 hub 스키마 쿼리/RPC 로 교체하면 3개 엔티티가 함께 실데이터로 전환된다(이슈21 seam 유지). 통합 검색은 전문가(이메일·소속)·협력사(사업자번호·대표자)로 매칭 필드를 확장하고 상세 링크를 활성화했다.

## 1-8. 마스터 검색/임시 생성 API 메모 (Phase 1.8, 2026-07-03)

### 📌 이슈 25: 마스터 검색·임시 생성을 HTTP API 로 승격 + mock seam 유지 (작성일자: 2026-07-03)
*   **상황**: Phase 1.8 은 `GET /api/hub/master-search`·`POST /api/hub/masters/{entity_type}/temporary` 를 **모든 도메인 앱이 재사용하는 공통 계약**으로 만들 것을 요구한다(api_contracts §6·7). 1.6/1.7 의 생성/검색은 Hub 내부 서버 액션·`mockSearchMasters` 로만 존재했다.
*   **문제**: (1) 실제 hub 스키마·RPC(`search_master_candidates`/`create_temporary_master`)는 Docker 미설치로 못 붙인다(이슈15·21). (2) 생성 시 중복 후보 자동 생성(§13 점수)이 아직 없었다. (3) 크로스오리진(Work 등 타 도메인 앱→Hub) 호출의 인증/CORS 는 아직 대상 앱이 없다.
*   **해결**:
    *   **HTTP Route Handler**(`app/api/hub/...`)로 계약을 실체화하되, service 는 이슈21 seam 을 그대로 탄다 — dev 폴백에선 mock store, env 설정 시 명시적 오류. 공통 envelope(`ok/data/meta.request_id` · `ok:false/error{code,message}`)·인증/권한 가드(`requireHubAccess`)를 `lib/api/`에 둔다.
    *   **중복 후보 자동 생성**: `@yna/master-data` 에 순수 `scoreDuplicateCandidate`(§13 — 공식번호 일치=강한/상충=충돌 제외, 없으면 이름·대표자·연락처 합산 상한 94)를 추가하고, 임시 생성 직후 `generateCandidates`가 활성 동종 마스터와 비교해 pending 후보를 만든다. **자동 병합은 절대 하지 않음**(승인은 Phase 1.10).
    *   **로컬 입력 UX**: 생성 dialog 는 same-origin fetch 로 검색 API 를 자동완성 호출하고(기존 선택=중복 방지/FK 연계), 없으면 임시 생성 API 를 호출한다. 서버 액션(수정/식별자/별칭/상태)은 유지하고 **생성만 API 로 승격**(중복후보 로직 중앙화).
    *   **크로스오리진 인증/CORS** 는 실제 소비자(Work, Phase 2/1.13)가 생길 때 Supabase JWT 전달·허용 오리진과 함께 처리한다. 현재는 Hub 자체 소비만 검증.
    *   한글 요청 본문은 `req.json()`이 UTF-8 로 정상 파싱하나, **curl inline `-d` 는 Windows 콘솔 인코딩으로 깨질 수 있어** smoke 는 UTF-8 파일(`--data-binary @`)로 검증했다(코드 문제 아님).

## 1-9. 식별자·별칭·필드 이력 메모 (Phase 1.9, 2026-07-03)

### 📌 이슈 26: 식별자/별칭 관리 이중 진입점(서버 액션 + HTTP 계약) + 마스킹 원본 조회 audit (작성일자: 2026-07-03)
*   **상황**: Phase 1.9 는 식별자 primary 전환(트랜잭션)·검증상태·삭제, 별칭 삭제, 필드이력 출처, 목록 마스킹 원본 조회 audit 를 요구하고(master_data_policy §3~6·12), 이를 공통 API §10~11(`POST/PATCH/DELETE /api/hub/...`)로도 계약화해야 한다. 1.6/1.7 에서 식별자/별칭 **추가**는 서버 액션으로만 존재했다.
*   **문제**: (1) UI 편의(사유 dialog·revalidate·reveal 인라인 반환)는 서버 액션이 자연스럽고, 크로스앱 재사용·계약 명세는 HTTP 라우트가 필요하다. (2) 실제 hub RPC/RLS 는 Docker 미설치로 못 붙인다(이슈15·21·25). (3) 상세 식별자 원본값은 RSC props 로 이미 클라이언트에 전달되는데(이슈23 목록 마스킹과 동일 구조) "원본 조회 audit" 를 어떻게 만족시키는지.
*   **해결**:
    *   **이중 진입점, 단일 mutation**: Hub 상세 UI 는 엔티티 공용 **서버 액션**(`actions-identifiers.ts` → `action-helpers` runner)을, 크로스앱은 **HTTP 라우트**(`service-subrecords.ts`, 공통 envelope/ApiError 코드)를 쓰되 **둘 다 같은 `mock-store` mutation**(`setIdentifierPrimary`/`setIdentifierVerification`/`removeIdentifier`/`removeAlias`/`addIdentifierRow`/`addAliasRow`)으로 수렴한다. Docker/staging 에서 mutation 만 hub RPC/쿼리로 교체하면 두 경로가 함께 전환된다(1.8 방침 연장 — "생성만 API 승격"에서 "관리도 API 계약 병행"으로 확장, 서버 액션 UI 는 유지).
    *   **primary 트랜잭션**: `setIdentifierPrimary` 는 같은 (entityId, identifierType) 안에서 기존 primary 를 해제하고 대상만 설정한다. 정책 §5 "primary 하나만 지정"을 **식별자 유형별 단일 대표**로 해석(대표 전화 1개·대표 사업자번호 1개 공존 가능).
    *   **원본 조회 audit**: 상세 "원본 보기"는 `revealIdentifierAction` → `view_sensitive` audit 를 남기고, 클라이언트가 이미 보유한 원본을 노출한다(마스킹은 UX, 최종 보안은 RLS — 이슈23 방침 동일). 실데이터 연결 시 원본 반환 endpoint 를 권한·마스킹과 함께 서버에서 강제한다.
    *   **스키마 변경 없음**: `verified_status`(master_identifiers)·`source_domain`(master_field_history/master_aliases)은 1.3 마이그레이션(`171003`)에 이미 존재 → 타입/시드/UI 로만 표면화. 새 migration 불필요.

## 1-10. 중복 후보·수동 병합 메모 (Phase 1.10, 2026-07-03)

### 📌 이슈 27: 수동 병합 2단계 반영·이중 진입점·resolved view (작성일자: 2026-07-03)
*   **상황**: Phase 1.10 은 중복 후보 목록/상세 비교, 병합 미리보기(`.../preview`), 수동 승인/반려/무시/보류, 2단계 비동기 병합 반영(정책 §10.3, api_contracts §12~15)을 요구한다. 후보 자동 생성(§13)은 1.8 에서 이미 구현됨.
*   **문제**: (1) 실제 병합 RPC(`approve_merge_candidate`)·RLS(`can_merge_master`)·타 도메인 FK 워커는 Docker 미설치로 붙일 수 없다(이슈15·21). (2) 업무 도메인 앱이 아직 없어 병합이 옮길 FK(affected_records)가 0건이다 — "2단계 비동기"를 어떻게 의미 있게 구현하는지. (3) UI 편의(사유 dialog·revalidate·승인 후 이동)와 크로스앱 계약(HTTP)을 어떻게 함께 두는지.
*   **해결**:
    *   **2단계 병합, Phase 1 즉시 완료**: 승인 시 1단계(동기)에서 `source.status='merged'`+`merged_into_id`+대표값 승계(§14)+밀려난 값 보존(source 이름→previous_name alias, source 식별자/별칭→target 승계)+`merge_event`+audit 를 확정한다. 2단계(비동기 FK)는 업무 도메인 앱이 없어 affected_records=0 → `sync_status='completed'` 로 즉시 종료. Work 연결(1.13/Phase 2)에서 affected>0 이면 `pending` + 백그라운드 워커로 전환된다. 조회 정합은 `packages/database` 의 `resolveMasterId`(COALESCE(merged_into_id,id)) helper + `hub.resolved_startups/experts/partners` view(마이그레이션 `190001`)로 표준화 — 업무 도메인은 hub 마스터 직접 조인 + 개별 COALESCE 를 쓰지 않는다.
    *   **이중 진입점, 단일 mutation**: 승인/반려/무시는 **HTTP 계약**(`service-merge.ts`, §14~15)과 **서버 액션**(`actions-merge.ts`, 사유 dialog·revalidate) 둘 다 제공하고, **보류(hold)는 서버 액션 전용**(§15 는 HTTP 로 reject/ignore 만 정의). 둘 다 같은 `mock-merge` mutation 으로 수렴한다(이슈26 방침 연장). Docker/staging 연결 시 mutation 만 hub RPC 로 교체.
    *   **순수 병합 로직 분리**: 대표값 결정(`resolveMergeField`/`resolveMergeFields`)과 충돌 경고(`detectMergeWarnings`/`hasBlockingConflict`)는 `@yna/master-data`(순수·테스트 9)에 두고, 엔티티별 필드/정책 매핑(`merge-fields.ts`)과 스토어 트랜잭션(`mock-merge.ts`)은 hub-data 에 둔다. 강한 식별자(사업자/법인번호) 충돌은 승인을 차단(blocked)하지만, 후보 생성 단계에서 이미 충돌은 제외되므로 방어적 가드다.
    *   **병합 권한**: 정책 §17 "hub write + master_data_merge 또는 master role" 중, 현재 세션 모델은 도메인 read/write 만 담아 `requireMergeAccess`=hub write 로 확인하고, 세분 권한(master_data_merge)은 실데이터 연결 시 RLS `dev.can_merge_master` 가 최종 강제한다(UI/API 는 UX, 최종 보안은 RLS — 일관 방침).
    *   **마스터 상세 연결**: 스타트업/전문가/협력사 상세의 중복후보 섹션 링크를 반대편 마스터가 아니라 **검토 화면**(`/merge-candidates/{id}`)으로 바꿔 병합 흐름의 단일 진입점을 만들었다(`MergeCandidatesSection` basePath prop 제거).

## 1-11. 감사 로그 메모 (Phase 1.11, 2026-07-03)

### 📌 이슈 28: 감사 표준 request_id 컬럼 드리프트 + before/after 마스킹 스냅샷 + append-only (작성일자: 2026-07-03)
*   **상황**: Phase 1.11 은 `hub.audit_logs`/`dev.permission_audit_logs` 를 actor·domain·entity·action·**before/after·reason·request_id** 전 필드로 기록하고, 수정/삭제 불가·개인정보 원문 payload 미저장 조회 화면을 요구한다(api_contracts §5·security §15·data_model §12). 1.5~1.10 은 각 변경마다 audit 를 남기되 Hub `AuditEntry` 는 actor/action/entity/reason/createdAt 만, Dev 는 before/after 는 있으나 request_id 가 없었다.
*   **문제**: (1) **표준↔스키마 드리프트** — `request_id` 는 audit 표준(§5·§15)의 필수 항목이나 1.3 마이그레이션 DDL(171005·171006)의 audit 테이블에는 컬럼이 없었다. (2) before/after 에 변경 값을 남기되 **개인정보 원문 전체 payload 저장 금지**(security §11)를 어떻게 만족시키는지 — 대표자명/사업자번호/전화/이메일은 민감. (3) "수정/삭제 불가"(불변성)를 어떻게 보장하는지. (4) Hub 는 전용 감사 조회 화면이 없었다(상세의 auditSummary 요약만, 최근 10건).
*   **해결**:
    *   **request_id 컬럼 추가**: 마이그레이션 `20260703200001_add_request_id_to_audit_logs.sql` 로 두 테이블에 `request_id TEXT NULL`(+COMMENT) 추가(스키마만, 기존 행 backfill 없음). `docs/yna_suite_data_model.md` §12·§5.3 DDL 도 동기화. 한 요청에서 발생한 다중 감사(예: 병합 승인의 target+source 2행)는 `newAuditRequestId()`=`req_<uuid>` 를 **공유**해 상관관계 짓는다. HTTP API 경로의 envelope request_id 와 동일 포맷.
    *   **before/after 마스킹 스냅샷**: `appendAudit(…, extra?)` 가 before/after 스냅샷을 받고, `auditFieldSnapshot(changes)` 가 민감 필드(대표자명→maskName, 사업자/법인번호→maskBusinessNumber, 전화→maskPhone, 이메일→maskEmail)를 `@yna/utils` 마스킹으로 스냅샷화한다. 즉 **무엇이 바뀌었는지(필드·비민감값)는 남기되 개인정보 원문은 저장하지 않는다**. 식별자/별칭 add/remove/verify/primary/reveal 은 값 자체가 민감이라 before/after 를 의도적으로 null 로 두고 action+entity+reason+request_id 로만 추적(원문 미저장). 이는 목록 마스킹(이슈23)·원본조회 audit(이슈26) 방침의 연장이다.
    *   **append-only(불변성)**: `hub-data`·`dev-data` mock 스토어에 감사 항목 수정/삭제 mutation 을 두지 않음(추가만). 최종 강제는 RLS — 1.4 정책에서 audit 테이블에 DELETE 정책이 없고(물리 삭제 금지) UPDATE 정책도 두지 않아 authenticated 경로로는 변경 불가, INSERT 는 service_role 전용.
    *   **Hub 전용 조회 화면**: `/audit-logs`(nav 엔 이미 항목 존재, 라우트 신설) — 전 엔티티·검색/엔티티/작업 필터·before/after native `<details>` 상세·request_id·대상 masterCode 라벨. Dev `/permission-audit-logs`(1.5) 에는 before/after·request_id 열을 보강. 두 화면 모두 "수정·삭제되지 않는다" 안내.
    *   **정적 프리렌더 특성**: dev 폴백(무-env)에서 `/audit-logs`(및 기존 `/startups`·`/merge-candidates`)는 세션 미의존이라 빌드 시 정적 프리렌더된다 — 런타임 mock mutation 이 화면에 즉시 반영되지 않음(smoke 는 seed 렌더 + 병합 API envelope 로 검증). 운영/스테이징은 `(app)` layout 의 `getSession()` 쿠키 조회로 라우트가 동적 렌더되어 실시간 반영된다. 렌더 전략은 형제 목록 페이지와 일치시켜 별도 force-dynamic 은 두지 않음.
    *   **미검증(이슈15 연장)**: Docker 미설치로 마이그레이션 실제 적용(`supabase db reset`)·`gen types`·RLS 는 미검증. SQL 오프라인 파서(pg-query-emscripten)는 이 기기에 미설치라 문법은 표준 ALTER/COMMENT 4문(육안·괄호균형 확인)으로 두고 db reset 시 최종 검증.

## 2. 향후 추가 메모 (메모 작성 템플릿)

개발 중 특이사항이 생기면 아래 형식으로 이어서 기록해 주세요.

```markdown
### 📌 이슈 [번호]: [이슈 요약 제목] (작성일자: YYYY-MM-DD)
*   **상황**: 어떤 상황에서 어떤 기능의 이슈가 있었는지 설명
*   **문제**: 무엇이 작동하지 않았거나 우려되는지 비전공자가 봐도 알기 쉽게 설명
*   **해결**: 어떻게 조치했고, 어떤 코드가 바뀌었는지 기록
```
