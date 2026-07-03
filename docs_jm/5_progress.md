# 5. Y&A 개발 진행 로그 (핸드오프)

이 문서는 단위 작업이 끝날 때마다 진행 상황을 남겨, **어느 노트북에서든, 대화를 새로 시작하더라도 개발을 이어갈 수 있게** 하는 핸드오프 기록입니다. (근거 규칙: `2_rules.md` 6번)

작동 방식:

```txt
1. 새 작업을 시작하기 전에 3_checklist.md와 이 문서를 먼저 읽는다.
2. 단위 작업을 완료하면 3_checklist.md 체크박스를 갱신하고, 아래에 진행 항목을 추가한다.
3. 기록 후 반드시 commit & push 한다. (다른 노트북에서 pull로 이어받기)
```

주의: 개발 도구(Claude)의 로컬 메모리는 기기 간에 공유되지 않습니다. **현재 상태의 단일 진실 공급원은 저장소에 커밋된 이 문서와 `3_checklist.md`입니다.**

---

## 기록 템플릿

새 항목은 아래 형식으로, **최신 항목이 맨 위**에 오도록 추가합니다.

```markdown
### [YYYY-MM-DD] [기기: 기기명] 단위 작업 제목
*   **완료**: 이번에 무엇을 만들었는지 (파일/폴더/주요 변경점)
*   **현재 상태**: 동작 확인 여부, 통과한 테스트, 남은 이슈
*   **다음 작업**: 이어서 진행할 단위 작업 (3_checklist.md 항목 기준)
*   **주의점**: 임시 처리, 미완성 부분, 참고 사항
```

---

## 진행 기록

### [2026-07-03] [기기: yna_suite dev] Phase 1.4 인증 및 권한 기반
*   **완료**:
    *   **권한 모델 확장**(`packages/permissions`): `scope.ts`(scopeTypeOf/scopeIdOf/hasGlobalScope), `templates.ts`(`ROLE_TEMPLATE_MATRIX` 8역할×7도메인 + `ROLE_DEFAULT_SCOPE` + `templatePermissions`). scope/templates 단위 테스트 8개 추가(총 12 pass).
    *   **RLS helper**(`20260703180001`): `dev.can_read_domain/can_write_domain/get_scope_type/get_scope_id/has_role/is_master/can_merge_master`. auth.jwt() No-Join 파싱 + `expires_at<=now()` 즉시 차단, authenticated/anon EXECUTE + `USAGE ON SCHEMA dev`.
    *   **Custom Access Token Hook**(`20260703180002`): `dev.custom_access_token_hook`가 `dev.user_permissions`→`app_metadata.permissions`(read/write/scope/expires_at)+`roles` 주입. `supabase_auth_admin` 권한/전용 SELECT 정책, 일반 역할 EXECUTE REVOKE. `config.toml [auth.hook.custom_access_token]` 등록.
    *   **RLS 정책**(`20260703180003`): hub 마스터(startups/experts/partners/managers)·부속(aliases/identifiers/field_history)·병합(candidates/events)·공통(audit_logs/attachments) + dev(user_permissions/permission_templates/permission_audit_logs) read/write 분리 명시 허용(35 stmts). 물리 삭제 금지(DELETE 정책 없음), audit/권한 INSERT 는 service_role 전용.
    *   **템플릿 seed**(`20260703180004`): 시스템 기본 8종(master…viewer) `permissions` JSONB(매트릭스와 동일), ON CONFLICT 멱등.
    *   **앱 인증 배선**(hub·dev 동일): `lib/auth/`(env·server·middleware·session·dev-session·permission-context), `middleware.ts`(세션 갱신+게이트), `login`(server action + form), `auth/callback`·`auth/signout` route, `(app)` 라우트 그룹으로 대시보드 이동+서버 세션 주입. `demo-session.ts` 제거. AppShell 에 `userMenuExtra`(로그아웃 폼) 슬롯 추가.
    *   **config/env**: `NEXT_PUBLIC_COOKIE_DOMAIN`(서브도메인 SSO) 옵션 + `parsePublicEnvSafe`, `@yna/database` client 에 `cookieDomain` 전달, `.env.example`(root/hub/dev)·config.toml redirect allowlist 갱신.
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 12 pass(permissions 12 + master-data 2 등), `pnpm build`(hub/dev) 2/2. SQL 오프라인 파서(pg-query-emscripten) **신규 4파일 59 stmts + 전체 145 stmts ALL_PASS**. hub 프로덕션 실행 후 dev 폴백 세션에서 `GET /` HTTP 200(대시보드/서비스 전환/로그아웃 렌더), `GET /login` 200(폴백 안내).
    *   **미검증(이슈15·18)**: Docker 미설치로 실제 로그인 왕복, RLS 정책 적용, hook claim 주입, `gen types` 미실행.
*   **다음 작업**: **Phase 1.5 Y&A Dev — 사용자 및 권한 관리** — 사용자 목록/상세, 초대/생성(Auth 계정+권한 원자적), 도메인별 권한 관리(템플릿+override), 권한 매트릭스, 안전장치+감사 로그, 외부 사용자 연결. (인터랙티브 컴포넌트 Dialog/Select/DataTable 등 Radix/TanStack 승인 후 추가 시점)
*   **주의점**:
    *   dev 폴백 세션은 master 권한이라 로컬에서 모든 서비스 스위처가 보임(의도된 배선 검증). 실제 권한 제한은 Supabase 연결+테스트 계정에서 확인.
    *   페이지 이동으로 stale `.next/types` 발생 시 `rm -rf apps/*/.next && pnpm build`로 라우트 타입 재생성 후 typecheck.
    *   Docker/staging 환경에서 `supabase db reset`→`supabase gen types typescript --local > packages/database/src/types.ts` 후 RLS 테스트 계정 10종으로 정책 검증 필요.
    *   `custom_access_token_hook` 은 Supabase 대시보드(Auth Hooks)에서도 활성화해야 원격에 반영됨(config.toml 은 로컬 기준).

### [2026-07-03] [기기: yna_suite dev] Phase 1.3 Supabase 스키마 및 마이그레이션 기반
*   **완료**:
    *   **논리 스키마**(`supabase/migrations/20260703171001_create_schemas_and_helpers.sql`): `hub/dev/staging` 우선 + `work/mna/project/fund/management` 스키마 뼈대(테이블 없음). 공통 `dev.set_updated_at()` 트리거 함수 등록.
    *   **hub 마스터 원장**(`171002`): `startups`/`experts`/`partners`/`managers`. master_code UNIQUE, normalized_name·status 인덱스, `startups.business_number` 부분 unique, `partners.business_number` 부분 인덱스, `managers.user_id` UNIQUE(auth.users 1:1). updated_at 트리거 4개.
    *   **hub 마스터 부속**(`171003`): `master_aliases`/`master_identifiers`/`master_field_history`. `master_identifiers` (entity_type,identifier_type,normalized_value) 중복 방지 unique + (entity_type,entity_id)·normalized 인덱스. 다형 참조라 entity_id 는 FK 없이 인덱스만.
    *   **hub 병합**(`171004`): `merge_candidates`(entity_type/status·source·target 인덱스)/`merge_events`(sync_status 워커 폴링 인덱스, before/after_snapshot NOT NULL).
    *   **hub 공통**(`171005`): `audit_logs`(domain/entity·actor·created_at 인덱스)/`attachments`(domain/entity 인덱스, 본체는 Storage).
    *   **dev 권한**(`171006`): `user_permissions`(PK user_id+domain_name, updated_at 트리거)/`permission_templates`(role_key PK, 선포함)/`permission_audit_logs`(target·actor·created_at 인덱스).
    *   **RLS 기본 deny**(`171007`): hub/dev 14개 테이블 `ENABLE ROW LEVEL SECURITY`(정책 없음 = 기본 차단, service_role 만 통과). 실제 정책은 Phase 1.4.
    *   `packages/database/src/types.ts` 주석 갱신(gen types 는 DB 필요 → 미실행 사유 명시).
*   **현재 상태**:
    *   SQL 문법을 실제 Postgres 파서(libpg_query WASM, `pg-query-emscripten`)로 오프라인 검증 → 7개 파일 **82 statements ALL_PASS**. `pnpm typecheck` 10/10 통과.
    *   **미검증**: Docker 미설치로 `supabase db reset`(로컬 적용)·`supabase gen types` 미실행. FK 대상(`auth.users`) 존재/의미 검증은 실제 적용 시 확인 필요.
*   **다음 작업**: **Phase 1.4 인증 및 권한 기반** — Supabase Auth 로그인 연동, `packages/permissions` 권한 helper, JWT `app_metadata.permissions`(+expires_at) No-Join 주입, RLS helper(`dev.can_read_domain`/`can_write_domain`)·기본 RLS 정책, UI 권한 처리(demo-session → 실제 JWT 교체).
*   **주의점**:
    *   RLS 를 1.3에서 default deny 로 켰으므로, 1.4에서 명시 허용 정책을 붙이기 전까지 authenticated 경로로는 hub/dev 테이블 조회가 막힘(의도된 동작, 이슈12).
    *   `dev.permission_templates` 초기 템플릿 8종(master/executive/…/viewer) seed 는 1.4/1.5에서 별도 처리.
    *   Docker 있는 기기/staging 링크에서 `supabase db reset` → `supabase gen types typescript --local > packages/database/src/types.ts` 로 타입 대체 필요(이슈15).
    *   기존 `20260703063409_remote_schema.sql`(빈 파일, remote baseline)은 신규 migration 보다 앞서 실행되며 내용 없음.

### [2026-07-03] [기기: yna_suite dev] Phase 1.2 공통 디자인 시스템 · UI · AppShell
*   **완료**:
    *   **디자인 토큰**(`packages/ui/src/tokens/`): `colors`(red 25~900 / gray 0~900 / semantic success·warning·info), `typography`(Pretendard 스택 + 7단계 타입 스케일), `spacing`(4px grid + 규격 상수), `radius`(sm4/md6/lg8), `shadows`(dropdown/popover/dialog). `tailwind-preset.ts`를 토큰 기반으로 재작성 → 앱에서 `bg-brand`/`text-gray-700` 등으로 사용. `bg-brand` = `rgb(226 34 19)`(#E22213) 컴파일 확인.
    *   **프레젠테이션 공통 컴포넌트**(`packages/ui/src/components/`): Button(primary/secondary/outline/ghost/danger, sm/md/lg), IconButton(aria-label 강제), Input, Textarea, FormField, StatusBadge(semantic tone), PermissionBadge(write/read/none/expired), MasterCodeBadge, PageHeader, EmptyState, FilterBar, BulkActionBar. 기존 flat `button.tsx`는 `components/`로 이동.
    *   **AppShell**(`components/app-shell/`): Sidebar(240px, active indicator만 brand) + Topbar(56px, native `<details>` 서비스 스위처·사용자 메뉴) + Content, 모바일 drawer(AppShell `"use client"` + useState). `linkComponent` 주입 지점으로 next 비의존 유지. 권한 필터 결과(sections/services)는 앱이 주입.
    *   **공통 상태 화면**(`components/states/`): StateMessage 기반 NoPermission/SessionExpired/SystemError/NotFound + ReadOnlyBanner.
    *   **Hub/Dev 배선**: 각 앱 `lib/nav.ts`(IA §4·§5 메뉴), `lib/services.ts`(`accessibleDomains`로 접근 가능 서비스만 스위처 노출), `lib/demo-session.ts`(임시 세션·권한 — Phase 1.4에서 실제 JWT로 교체), `components/app-frame.tsx`(`usePathname`+next/link 주입, hub/dev read 없으면 NoPermissionScreen). 각 앱 `app/not-found.tsx`·`error.tsx` 추가. layout 에서 AppFrame 으로 children 래핑, page 를 대시보드 자리표시자로 교체. globals.css 에 Pretendard CDN @import + body base(gray-25/gray-700/tnum).
    *   **의존성**: `lucide-react`(이미 `@yna/ui`에 존재)를 hub/dev `package.json`에 선언(신규 외부 패키지 아님, lockfile 변화 없음).
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 pass, `pnpm build`(hub/dev) 2/2 성공. hub 프로덕션 실행 후 `curl localhost:3000` **HTTP 200 + AppShell(사이드바 메뉴/서비스 스위처/사용자/모바일 메뉴 버튼) 렌더 확인**, 빌드 CSS 에 Pretendard @import·brand/gray 토큰 포함 확인.
    *   **주의**: smoke 시 이전 세션의 stale hub 서버(PID)가 포트 3000을 점유해 옛 빌드를 응답 → 종료 후 재기동해 신규 빌드 확인. 새 기기/세션에서 smoke 전 포트 3000 점유 프로세스 확인 필요.
*   **다음 작업**: **Phase 1.3 Supabase 스키마 및 마이그레이션 기반** — hub/dev/staging 스키마, 우선순위 1 테이블 마이그레이션, 공통 컬럼/코드 정책, 인덱스/제약, Migration Only 원칙. (스키마 생성 후 `packages/database/src/types.ts` placeholder 를 `supabase gen types`로 대체)
*   **주의점**:
    *   인터랙티브 컴포넌트(Dialog/Sheet/ConfirmDialog/Select/SearchCombobox/DatePicker/DataTable)는 무의존 정책에 따라 미구현 — 실제 소비하는 Phase 1.5+ 에서 Radix/TanStack 승인 후 추가.
    *   세션/권한은 `demo-session.ts` 자리표시자(hub·dev write, work read, 나머지 none). 서비스 스위처가 실제로 fund/mna/project/management 를 숨기는지 이 맵으로 검증 가능. Phase 1.4에서 실제 JWT로 대체.
    *   서비스 스위처 href 는 로컬 `localhost:port` / 운영 `host` 분기 — 실제 base URL 정리는 Phase 1.4 환경 배선에서.

### [2026-07-03] [기기: yna_suite dev] Phase 1.1 모노레포 및 공통 패키지 스캐폴딩
*   **완료**:
    *   **공통 패키지 8개 생성**(`packages/*`, 모두 `@yna/*` 내부 패키지, TS 소스 직접 export):
        *   `core`(도메인/역할/스코프 상수, JWT 권한 claim 타입, Result/AppError), `utils`(회사명/사업자번호/전화/이메일/도메인 정규화 + 이메일/전화 마스킹), `config`(APP_CONFIGS 도메인 설정 + zod 공개/서버 env 스키마), `database`(Supabase browser/server client 팩토리 — cookie 어댑터 주입, next 비의존), `permissions`(canRead/canWrite/isExpired — can_write→can_read 강제·만료 즉시 차단), `auth`(Supabase User→권한 claim 추출), `master-data`(마스터 검색 계약 + 병합 점수 등급 95/80/60), `ui`(`cn`, Button, Tailwind preset).
        *   Vitest 단위 테스트: utils(정규화 4) · permissions(권한 4) · master-data(점수 2) = 10 pass.
    *   **앱 스캐폴딩**: `apps/hub`(포트 3000), `apps/dev`(포트 3001) Next.js 15 + React 19 App Router. TanStack Query Provider, Tailwind v3.4(+ ui preset), 홈 화면(공통 패키지 연결 확인용). `work/mna/project/fund/management`는 README placeholder만.
    *   **패키지 트랜스파일 방식**: 앱 `next.config.mjs`의 `transpilePackages`로 `@yna/*` 소스 직접 번들(별도 빌드 스텝 없음).
    *   **의존성 방향 lint**: 루트 `eslint.config.mjs`(flat, ESLint 9 + typescript-eslint) + `no-restricted-imports` — 앱 간 import 금지, `packages/ui`의 비즈니스/API/DB import 금지. 음성 테스트로 규칙 발화 확인.
    *   루트 devDeps에 eslint 스택 추가, `pnpm-workspace.yaml`에 빌드 스크립트 허용(esbuild/sharp), `.gitignore`에 `next-env.d.ts` 추가.
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 10 pass, `pnpm build`(hub/dev) 2/2 성공. hub 프로덕션 실행 후 `curl localhost:3000` **HTTP 200 + 공통 패키지 렌더 확인**.
    *   **주의(이슈 10)**: turbo가 pnpm 바이너리를 못 찾던 문제 → `corepack enable --install-directory "%APPDATA%\npm" pnpm`으로 shim 설치 후 turbo 정상. 새 기기에서 동일 조치 필요할 수 있음.
*   **다음 작업**: **Phase 1.2 공통 디자인 시스템 · UI · AppShell** — 디자인 토큰(그레이스케일 + CI Red) 정의, 핵심 공통 컴포넌트, 권한 기반 AppShell(Sidebar/Topbar), 공통 상태 화면. 이때 shadcn 컴포넌트·RHF·TanStack Table 등 필요한 라이브러리 추가.
*   **주의점**:
    *   미사용 의존성 금지 규칙에 따라 shadcn 컴포넌트 본체·RHF·TanStack Table·Recharts·Playwright는 아직 미설치(Phase 1.2+에서 사용 시 추가). Tailwind는 v3.4 채택.
    *   `packages/database/src/types.ts`의 `Database`는 placeholder — Phase 1.3 스키마 생성 후 `supabase gen types`로 대체.
    *   turbo test 실행 시 "no output files(coverage)" 경고는 무해(coverage 미생성).

### [2026-07-03] [기기: yna_suite dev] Phase 1.0 개발 환경 및 의존성 준비 (기반)
*   **완료**:
    *   도구 버전 고정: `.node-version`/`.nvmrc`(Node 24.16.0), 루트 `package.json`의 `packageManager: pnpm@11.9.0` + `engines`, `.editorconfig`.
    *   모노레포 루트: `package.json`, `pnpm-workspace.yaml`(`apps/*`,`packages/*`), `turbo.json`(build/dev/lint/typecheck/test/e2e), `tsconfig.base.json`(strict), `.prettierrc.json`/`.prettierignore`.
    *   루트 devDependencies 설치 + `pnpm-lock.yaml` 커밋: turbo 2.10.2, typescript 5.9.3, prettier 3.9.4, @types/node 24.13.2.
    *   환경 템플릿: 루트 `.env.example` 정비 + `apps/hub|dev|work/.env.example` 생성(NEXT_PUBLIC 공개값/서버 secret 분리).
    *   스크립트: `pnpm dev/build/lint/typecheck/test/e2e/format/format:check/db:migrate/db:reset`.
    *   온보딩 문서 `README.md`(도구 버전·빠른 시작·명령어·의존성 경계·로컬 Supabase·포트).
    *   **보안 수정**: git에 추적되던 `.env.local`(실 anon key 포함)을 `git rm --cached`로 추적 해제하고 `.gitignore`에 `.env*`/`.env.local` 등 추가.
*   **현재 상태**:
    *   `pnpm install`(Corepack 경유) 재현 성공, lockfile 생성. `pnpm lint`/`typecheck`/`format:check` 통과(앱 없어 turbo task 0개, 정상). `db:migrate`/`db:reset`는 Supabase CLI 2.105.0로 백킹.
    *   **주의**: 이 환경은 pnpm 전역 shim이 EPERM으로 설치 안 됨 → `corepack pnpm <명령>`으로 실행. Docker 미설치 → `supabase start`(로컬 DB) 미검증.
*   **다음 작업**: **Phase 1.1 모노레포 및 공통 패키지 스캐폴딩** — `apps/hub`,`apps/dev` Next.js 앱 + `packages/*` 뼈대 생성, 앱별 1차 스택(Next/React/Tailwind/shadcn/TanStack 등) 설치, 의존성 방향 lint 강제. (Phase 1.0의 "앱별 스택 설치"·"Hub/Dev 실행 smoke"는 여기서 마무리)
*   **주의점**:
    *   `apps/hub|dev|work`에는 현재 `.env.example`만 있고 `package.json`이 없어 워크스페이스에서 무시됨(정상). 1.1에서 앱 스캐폴딩.
    *   `pnpm format`은 `docs/`·`docs_jm/`를 제외(원본/진행 문서 자동 재포맷 방지) — `.prettierignore` 참고.
