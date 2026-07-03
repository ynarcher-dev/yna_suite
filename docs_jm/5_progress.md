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
