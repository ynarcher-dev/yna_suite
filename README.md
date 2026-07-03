# Y&A Suite

인증 · 권한 · 마스터 데이터를 하나의 체계로 공유하면서, 서비스별로 독립 배포하는 사내 업무 플랫폼 모노레포입니다.

> 개발을 시작하기 전에 **[docs_jm/0_CLAUDE.md](docs_jm/0_CLAUDE.md)** 를 먼저 읽으세요. 작업 순서·진행 상태·규칙의 진입점입니다.

---

## 1. 사전 요구 도구 (버전 고정)

| 도구         | 버전                          | 확인/설치                               |
| :----------- | :---------------------------- | :-------------------------------------- |
| Node.js      | **24.16.0** (`.node-version`) | `node -v` / nvm·fnm 사용 시 `nvm use`   |
| pnpm         | **11.9.0** (`packageManager`) | Corepack로 관리 (아래 참고)             |
| Supabase CLI | 2.x                           | `supabase --version`                    |
| Docker       | 로컬 Supabase 실행 시 필요    | `supabase start`는 Docker가 있어야 동작 |
| Git          | 2.x                           | `git --version`                         |

### pnpm 준비 (Corepack)

이 저장소는 pnpm 버전을 `package.json`의 `packageManager` 필드로 고정합니다. 전역 설치 대신 Node에 포함된 **Corepack**을 사용합니다.

```bash
corepack enable            # 전역 pnpm shim 생성 (Windows는 관리자 권한 필요할 수 있음)
pnpm --version             # 11.9.0 확인
```

> Windows에서 `corepack enable`이 권한 오류(EPERM, `C:\Program Files\nodejs\...`)로 실패하면,
> 전역 shim 없이 `corepack pnpm <명령>` 형태로 그대로 사용할 수 있습니다. (예: `corepack pnpm install`)
> 어느 쪽이든 실행되는 pnpm 버전은 `packageManager` 필드로 고정되어 두 노트북에서 동일합니다.

---

## 2. 빠른 시작 (신규 개발자 재현 절차)

```bash
# 1) 의존성 설치 (lockfile 기준)
pnpm install                 # 또는: corepack pnpm install

# 2) 환경변수 준비 — 루트 + 각 앱
cp .env.example .env.local
cp apps/hub/.env.example  apps/hub/.env.local
cp apps/dev/.env.example  apps/dev/.env.local
cp apps/work/.env.example apps/work/.env.local
#   → .env.local 에 실제 Supabase URL / anon key / (서버 앱은) service role key 를 채운다.
#   → .env.local 계열은 커밋되지 않는다(.gitignore).

# 3) (선택) 로컬 Supabase 기동 — Docker 필요
supabase start
pnpm db:reset                # 스키마/마이그레이션/seed 재적용

# 4) 앱 실행 (앱 스캐폴딩은 Phase 1.1에서 추가됨)
pnpm dev
```

---

## 3. 공통 명령어

| 명령                | 설명                                           |
| :------------------ | :--------------------------------------------- |
| `pnpm dev`          | 전체 앱 개발 서버 (turbo)                      |
| `pnpm build`        | 전체 빌드                                      |
| `pnpm lint`         | 린트                                           |
| `pnpm typecheck`    | 타입 체크                                      |
| `pnpm test`         | 단위 테스트 (Vitest)                           |
| `pnpm e2e`          | E2E 테스트 (Playwright)                        |
| `pnpm format`       | Prettier 포맷 (docs/·docs_jm/ 제외)            |
| `pnpm format:check` | 포맷 검사 (CI용)                               |
| `pnpm db:migrate`   | `supabase migration up` — 마이그레이션 적용    |
| `pnpm db:reset`     | `supabase db reset` — 로컬 DB 초기화 후 재적용 |

특정 앱만 대상으로 하려면 filter를 사용합니다.

```bash
pnpm --filter @yna/hub build
turbo build --filter=@yna/work
```

---

## 4. 저장소 구조

```txt
apps/          서비스별 독립 배포 단위 (hub, dev, work, mna, project, fund, management)
packages/      여러 앱이 공유하는 공통 코드 (auth, permissions, master-data, database, ui, core, config, utils)
supabase/      DB 스키마 · 마이그레이션 · RLS 정책
docs/          설계 원본 문서 (source of truth)
docs_jm/       개발 진행용 문서 (개요·규칙·체크리스트·메모·핸드오프)
```

자세한 기준: [docs/yna_suite_foldering.md](docs/yna_suite_foldering.md)

### 의존성 경계 규칙 (필수)

- `apps/* → packages/*` 방향만 허용. **앱 간 직접 import 금지**.
- `packages/ui` 에는 비즈니스 로직 · API 호출 · Supabase client · 데이터 페칭 hook 금지. (순수 표현 컴포넌트 + 디자인 토큰만)
- API가 결합된 공통 기능(마스터 Picker 등)은 `packages/master-data` 또는 개별 앱에 둔다.
- 새 라이브러리는 기존 스택으로 해결 가능한지 먼저 확인하고, 동일 목적(UI/폼/테이블/차트/날짜) 라이브러리 중복 도입을 금지한다.
- 상세: [docs/yna_suite_maintenance_rules.md](docs/yna_suite_maintenance_rules.md)

---

## 5. 로컬 Supabase

- 설정: `supabase/config.toml` (project_id `yna_suite`, 로컬 API `54321`, DB `54322`)
- 원격 프로젝트: `dgybxeenloocimfgahro` (link 완료)
- `supabase start` / `pnpm db:reset` 은 **Docker Desktop 실행**이 전제입니다. Docker가 없으면 로컬 DB는 건너뛰고 원격 dev Supabase를 사용합니다.
- **운영 DB 직접 수정 금지.** 모든 스키마 변경은 `supabase/migrations` 파일로만 합니다. (`YYYYMMDDHHMMSS_*.sql`)

환경/배포 상세: [docs/yna_suite_environment_deployment.md](docs/yna_suite_environment_deployment.md)

---

## 6. 로컬 포트 규칙

| 앱                | 포트 |
| :---------------- | :--- |
| `apps/hub`        | 3000 |
| `apps/dev`        | 3001 |
| `apps/work`       | 3002 |
| `apps/mna`        | 3003 |
| `apps/project`    | 3004 |
| `apps/fund`       | 3005 |
| `apps/management` | 3006 |

---

## 7. 진행 상태

- 현재 단계: **Phase 1 — Core Foundation**
- 다음 작업과 완료 항목은 [docs_jm/3_checklist.md](docs_jm/3_checklist.md), 최신 핸드오프는 [docs_jm/5_progress.md](docs_jm/5_progress.md) 를 확인하세요.
