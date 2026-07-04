# Y&A Suite 폴더링 및 배포 구조 가이드

본 문서는 Y&A Suite를 **서비스별 독립 도메인으로 배포**하면서도, 공통 인증/권한/마스터 데이터 로직을 한 저장소에서 일관되게 관리하기 위한 폴더 구조 기준을 정의한다.

## 1. 기본 방향

Y&A Suite는 하나의 통합 제품군이지만, 실제 사용자는 서비스별 도메인으로 접근한다.

```txt
hub.ynarcher.co.kr          -> Y&A Hub
dev.ynarcher.co.kr          -> Y&A Dev
work.ynarcher.co.kr         -> Y&A Work
mna.ynarcher.co.kr          -> Y&A M&A
project.ynarcher.co.kr      -> Y&A Project
fund.ynarcher.co.kr         -> Y&A Fund
management.ynarcher.co.kr   -> Y&A Management
```

따라서 저장소 구조는 다음 원칙을 따른다.

1. `apps/` 하위 폴더는 실제 배포 단위이다.
2. `packages/` 하위 폴더는 여러 앱이 공유하는 공통 코드이다.
3. `supabase/` 하위 폴더는 DB 스키마, 마이그레이션, RLS 정책 관리 영역이다.
4. `docs/` 하위 폴더는 기획, 아키텍처, 의사결정 문서를 보관한다.
5. 각 서비스의 업무 로직은 해당 앱 안에 두되, 전사 공통 능력은 패키지로 분리한다.

## 2. 추천 루트 구조

```txt
yna_suite/
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json

  apps/
    hub/
    dev/
    work/
    mna/
    project/
    fund/
    management/

  packages/
    auth/
    permissions/
    master-data/
    database/
    ui/
    core/
    config/
    utils/

  supabase/
    config.toml
    migrations/     ← 모든 스키마/테이블/RLS 변경의 단일 관리 경로
    seed/

  docs/             ← yna_suite_*.md 설계 문서 (평면 구조, docs/README.md가 목차)
  docs_jm/          ← 작업 노트 (계획/규칙/체크리스트/메모/진행/문서리뷰)

  scripts/
    import/
    dedupe/
    maintenance/

  tests/
    unit/
    integration/
    rls/
```

## 3. `apps/` 구조

`apps/`는 서비스별 독립 앱을 배치하는 영역이다. 각 하위 폴더는 별도의 도메인으로 배포될 수 있어야 한다.

```txt
apps/
  hub/           # hub.ynarcher.co.kr
  dev/           # dev.ynarcher.co.kr
  work/          # work.ynarcher.co.kr
  mna/           # mna.ynarcher.co.kr
  project/       # project.ynarcher.co.kr
  fund/          # fund.ynarcher.co.kr
  management/    # management.ynarcher.co.kr
```

각 앱은 자기 도메인의 화면, 라우팅, 앱 전용 업무 로직을 가진다.

```txt
apps/work/
  package.json
  src/
    app/
    features/
    components/
    routes/
    lib/
  .env.example
```

앱별 책임은 다음처럼 나눈다.

| 앱 | 주요 책임 |
| :--- | :--- |
| `apps/hub` | 전사 검색, 마스터 원장, 중복 후보 검토, 병합 승인 |
| `apps/dev` | 계정 생성, 권한 템플릿, 서비스별 접근 제어 |
| `apps/work` | Program First 기반 프로그램, 모듈, 신청/참여자, 평가, 멘토링, 비즈니스 매칭, 데모데이, 성과관리, 커스텀 활동, 회의록 |
| `apps/mna` | 딜 소싱, 자문 이력, 실사 자료, 클로징 |
| `apps/project` | 수주 사업, R&D 프로젝트, 마일스톤, 투입 인력 |
| `apps/fund` | 펀드, LP, 캐피탈콜, 투자 내역 |
| `apps/management` | HRM/HRD, 조직, 성과, 경영관리 |

## 4. `packages/` 구조

`packages/`는 여러 앱이 공통으로 사용하는 코드를 둔다. 특정 앱에만 필요한 업무 로직은 패키지로 올리지 않는다.

```txt
packages/
  auth/
  permissions/
  master-data/
  database/
  ui/
  core/
  config/
  utils/
```

| 패키지 | 주요 책임 |
| :--- | :--- |
| `packages/auth` | SSO, 세션, 로그인 상태, Supabase Auth 연동 |
| `packages/permissions` | 권한 체크, 도메인별 read/write 판단, 권한 상수 |
| `packages/master-data` | 스타트업/전문가/협력사 검색, 임시 등록, 식별, 병합 후보 생성 |
| `packages/database` | Supabase client, DB 타입, 공통 query helper |
| `packages/ui` | 공통 UI 컴포넌트, 레이아웃, 디자인 토큰 |
| `packages/core` | 공통 타입, 도메인 상수, 에러 타입, 결과 객체 |
| `packages/config` | 앱별 환경 설정, 도메인 설정, feature flag |
| `packages/utils` | 날짜, 문자열 정규화, 포맷팅 등 범용 유틸 |

특히 `packages/master-data`는 Y&A Suite의 핵심 공통 계층이다. Hub 앱의 화면과 운영 기능은 `apps/hub`에 두지만, 다른 앱에서도 사용하는 마스터 검색/임시 생성/중복 후보 판단 로직은 이 패키지에 둔다.

예시:

```txt
packages/master-data/
  startups/
    normalize.ts
    search.ts
    create-temp.ts
    merge-candidate.ts
  experts/
  partners/
  identifiers/
    business-number.ts
    phone.ts
    email.ts
  merge/
    score.ts
    apply-merge.ts
    audit-log.ts
```

## 5. `supabase/` 구조

`supabase/`는 데이터베이스 변경과 보안 정책을 관리하는 영역이다. 앱 배포 대상이 아니라 DB 운영 대상이다.

```txt
supabase/
  config.toml
  migrations/
    20260703171001_create_schemas.sql
    20260703171002_create_hub_master_tables.sql
    ...
  seed/
```

테이블 정의와 RLS 정책을 포함한 **모든 DB 변경은 `supabase/migrations`의 시간순 migration 파일로만 관리**한다(`yna_suite_database_operations.md` §2 Migration Only). 별도의 `schemas/`·`policies/` 디렉터리로 나누어 관리하지 않는다 — 초기 설계에서 검토했으나 migration 단일 경로로 확정했다(Phase 1.3).

DB 스키마는 서비스 도메인과 동일한 이름으로 나누고, 이관 전용 스키마 하나를 추가로 둔다.

```txt
hub
dev
work
mna
project
fund
management
staging   ← 기존 데이터 import 전용 (배포 환경명 'staging'과 무관)
```

RLS 정책도 같은 기준으로 나누되, 공통 권한 판단이 필요한 경우 `dev.user_permissions` 또는 권한 관련 DB function을 참조한다.

## 6. 배포 기준

배포 단위는 `apps/*`이다.

```txt
apps/hub          -> hub.ynarcher.co.kr
apps/dev          -> dev.ynarcher.co.kr
apps/work         -> work.ynarcher.co.kr
apps/mna          -> mna.ynarcher.co.kr
apps/project      -> project.ynarcher.co.kr
apps/fund         -> fund.ynarcher.co.kr
apps/management   -> management.ynarcher.co.kr
```

Vercel, Netlify, Cloudflare Pages 같은 플랫폼에서는 각 프로젝트의 Root Directory를 해당 앱 폴더로 지정한다.

```txt
Project: Y&A Work
Root Directory: apps/work
Domain: work.ynarcher.co.kr
Build Command: pnpm --filter @yna/work build
```

공통 패키지는 별도로 배포하지 않는다. 앱이 빌드될 때 workspace dependency로 함께 번들링된다.

예시 명령:

```txt
pnpm --filter @yna/hub build
pnpm --filter @yna/work build
pnpm --filter @yna/fund build
```

Turbo를 사용할 경우:

```txt
turbo build --filter=@yna/work
```

## 7. 의존성 규칙

의존성 방향은 아래처럼 유지한다.

```txt
apps/* -> packages/* -> external libraries
apps/* -> supabase client
```

피해야 할 의존성 및 순환 참조:

```txt
apps/work -> apps/hub (앱 간 직접 의존성 금지)
apps/fund -> apps/work
packages/master-data -> apps/hub
packages/ui -> apps/work (공통 UI가 개별 서비스 앱을 참조 금지)
packages/ui -> packages/master-data (공통 UI가 비즈니스 도메인 로직에 의존 금지)
```

즉, 앱끼리는 직접 import하지 않으며, 앱 간 공유가 필요한 코드는 `packages/`로 올린다. 
특히, `packages/ui`는 **순수 화면 표현 컴포넌트(Presentation Component)** 및 디자인 토큰만 포함해야 한다. API 호출, TanStack Query, DB 접근 등의 비즈니스 로직은 `packages/ui` 내부에서 절대 수행할 수 없으며, `StartupPicker`나 `ExpertPicker`와 같이 API와 강하게 결합된 도메인 특화 컴포넌트는 `packages/ui`가 아닌 각 개별 서비스 앱(`apps/*`) 또는 `packages/master-data` 내부에서 설계해야 한다.

## 8. 피해야 할 구조

아래와 같은 기능형 폴더링은 초기에는 단순하지만, 서비스가 늘어나면 소유권이 흐려진다.

```txt
components/
pages/
services/
db/
utils/
```

Y&A Suite는 서비스별 도메인이 명확하므로, 기능형 폴더링보다 **도메인 앱 중심 폴더링**이 적합하다.

## 9. 최종 요약

```txt
apps/      = 서비스별 독립 배포 단위
packages/  = 여러 서비스가 공유하는 공통 코드
supabase/  = DB 스키마, 마이그레이션, RLS 정책
docs/      = 기획/설계/의사결정 문서
scripts/   = 운영, 가져오기, 중복 정리 자동화
tests/     = 단위/통합/RLS 테스트
```

Y&A Suite의 핵심은 각 서비스를 독립적으로 배포하면서도, 인증/권한/마스터 데이터는 하나의 체계로 묶는 것이다. 따라서 폴더링의 기준은 항상 다음 질문으로 판단한다.

> 이 코드는 특정 서비스의 화면/업무인가, 아니면 여러 서비스가 공유해야 하는 전사 공통 능력인가?

전자는 `apps/{service}`에 두고, 후자는 `packages/{capability}`로 분리한다.

참고:

```txt
서비스별 메뉴와 라우트 구조는 yna_suite_information_architecture.md를 기준으로 한다.
```
