# Y&ARCHER WORKS 환경변수 및 배포 환경 전략 가이드

> 2026-07-04 아키텍처 개편: 서비스별 7개 앱/7개 서브도메인 구조를 **WORKS 단일 내부 앱(apps/works) + GUEST 외부 포털(apps/guest)** 2앱 구조로 변경했다. 본 문서는 개편 기준으로 갱신되었다.

본 문서는 Y&ARCHER WORKS의 local/dev/staging/production 환경 구성, 앱별 환경변수, Supabase 프로젝트, Vercel 배포, 도메인 및 인증 callback 전략을 정의한다.

Y&ARCHER WORKS는 하나의 모노레포에서 2개 앱을 관리하고, 각 앱을 독립 도메인으로 배포한다.

```txt
apps/works   -> works.ynarcher.co.kr (내부 통합 앱)
apps/guest   -> guest.ynarcher.co.kr (외부 포털, Phase 2 — 현재 placeholder)
```

## 1. 기본 원칙

환경/배포는 다음 원칙을 따른다.

```txt
앱은 독립 배포하되 공통 패키지는 workspace로 공유한다.
환경변수는 앱별로 분리하되 이름 규칙은 통일한다.
production 데이터와 개발/검증 데이터는 분리한다.
인증 callback URL은 두 앱 도메인을 모두 명시적으로 등록한다.
service role key는 클라이언트에 절대 노출하지 않는다.
배포 환경마다 Supabase URL, anon key, redirect URL을 명확히 분리한다.
```

## 2. 환경 구분

Y&ARCHER WORKS는 다음 환경을 사용한다.

| 환경 | 목적 | 데이터 |
| :--- | :--- | :--- |
| `local` | 개발자 로컬 개발 | 로컬 또는 개발용 샘플 데이터 |
| `dev` | 개발 서버/내부 기능 확인 | 개발용 데이터 |
| `staging` | 운영 전 검증 | 운영 유사 데이터, 민감정보 마스킹 권장 |
| `production` | 실제 운영 | 실제 업무 데이터 |

권장:

```txt
local/dev/staging/production을 코드에서 명확히 구분한다.
production DB에 직접 테스트 데이터를 넣지 않는다.
staging은 운영 배포 전 권한/RLS/인증 콜백 검증에 사용한다.
```

## 3. Supabase 프로젝트 전략

권장 구성:

```txt
Supabase Project 1: local/dev
Supabase Project 2: staging
Supabase Project 3: production
```

최소 구성:

```txt
Supabase Project 1: dev/staging
Supabase Project 2: production
```

비추천:

```txt
dev/staging/production을 모두 하나의 Supabase 프로젝트에서 처리
```

이유:

```txt
RLS 정책 실험 중 운영 데이터 접근 위험
마이그레이션 테스트 중 운영 데이터 손상 위험
인증 redirect URL 관리 혼선
개발 계정과 운영 계정 혼재
```

## 4. Vercel 프로젝트 전략

각 앱은 별도 Vercel 프로젝트로 배포한다(총 2개).

```txt
Vercel Project: yna-works
Root Directory: apps/works
Domain: works.ynarcher.co.kr

Vercel Project: yna-guest
Root Directory: apps/guest
Domain: guest.ynarcher.co.kr
```

빌드 명령:

```txt
pnpm --filter @yna/works build
pnpm --filter @yna/guest build
```

Turborepo 사용 시:

```txt
turbo build --filter=@yna/works
```

## 5. 도메인 전략

운영 도메인:

```txt
works.ynarcher.co.kr
guest.ynarcher.co.kr
```

staging 도메인:

```txt
works.stg.ynarcher.co.kr
guest.stg.ynarcher.co.kr
```

dev 도메인 또는 Vercel preview:

```txt
dev-yna-works.vercel.app
preview deployments
```

권장:

```txt
production은 고정 도메인만 허용한다.
staging은 `*.stg.ynarcher.co.kr` 서브도메인 패턴을 사용한다(위 목록 기준 — `stg-works.…` 같은 접두사 방식이 아님. Auth callback allowlist 등록 시 혼동 주의).
preview URL은 인증 callback이 필요한 기능 검증에 제한이 있을 수 있다.
```

## 6. 공통 환경변수

모든 앱에서 사용하는 공통 환경변수는 다음 규칙을 따른다.

```txt
NEXT_PUBLIC_APP_ENV
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_DOMAIN
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_AUTH_REDIRECT_URL
NEXT_PUBLIC_COOKIE_DOMAIN      ← 선택값. works↔guest 간 SSO 세션 공유용 쿠키 도메인
                                 (예: .ynarcher.co.kr — Phase 1.4 추가, 미설정 시 호스트 기본값)
```

예시:

```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_NAME=Y&ARCHER WORKS
NEXT_PUBLIC_APP_DOMAIN=works.ynarcher.co.kr
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
NEXT_PUBLIC_AUTH_REDIRECT_URL=https://works.ynarcher.co.kr/auth/callback
```

주의:

```txt
NEXT_PUBLIC_ 접두사가 붙은 값은 브라우저에 노출된다.
anon key는 RLS 전제하에 공개 가능하지만 service role key는 절대 노출하지 않는다.
```

## 7. 서버 전용 환경변수

서버에서만 사용하는 값은 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.

```txt
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
APP_ENCRYPTION_KEY
INTERNAL_API_SECRET
IMPORT_JOB_SECRET
```

사용 위치:

```txt
Next.js Server Actions
Route Handlers
Edge Functions
마이그레이션/운영 스크립트
관리자 전용 batch job
```

주의:

```txt
SUPABASE_SERVICE_ROLE_KEY는 RLS를 우회할 수 있으므로 매우 제한적으로 사용한다.
클라이언트 번들에 포함되면 안 된다.
로그에 출력하면 안 된다.
권한이 필요한 운영 작업은 감사 로그를 남긴다.
```

## 8. 앱별 환경변수 예시

### 8.1 WORKS (내부 통합 앱)

```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_NAME=Y&ARCHER WORKS
NEXT_PUBLIC_APP_DOMAIN=works.ynarcher.co.kr
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
NEXT_PUBLIC_AUTH_REDIRECT_URL=https://works.ynarcher.co.kr/auth/callback
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key   # 관리(/admin) 섹션의 계정 생성 등 서버 전용 작업
```

### 8.2 GUEST (외부 포털, Phase 2)

```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_NAME=Y&ARCHER WORKS-GUEST
NEXT_PUBLIC_APP_DOMAIN=guest.ynarcher.co.kr
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
NEXT_PUBLIC_AUTH_REDIRECT_URL=https://guest.ynarcher.co.kr/auth/callback
```

## 9. 인증 Callback URL

Supabase Auth에는 두 앱의 callback URL을 등록해야 한다(2앱 allowlist 체계).

운영:

```txt
https://works.ynarcher.co.kr/auth/callback
https://guest.ynarcher.co.kr/auth/callback
```

staging:

```txt
https://works.stg.ynarcher.co.kr/auth/callback
https://guest.stg.ynarcher.co.kr/auth/callback
```

local:

```txt
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

주의:

```txt
각 앱의 redirect URL은 명시적으로 allowlist에 등록한다.
wildcard redirect는 운영에서 가급적 사용하지 않는다.
```

## 10. 포트 규칙

로컬 개발 시 앱별 포트를 고정한다.

```txt
apps/works   -> localhost:3000
apps/guest   -> localhost:3001
```

이렇게 하면 인증 callback, CORS, redirect 설정이 덜 흔들린다.

## 11. 환경변수 파일 규칙

각 앱은 `.env.example`을 반드시 가진다.

```txt
apps/works/.env.example
apps/guest/.env.example
```

실제 secret이 들어간 파일은 커밋하지 않는다.

```txt
.env.local
.env.production
.env.staging
```

`.gitignore`에 포함:

```txt
.env
.env.local
.env.*.local
```

루트에는 공통 예시만 둔다.

```txt
.env.example
```

## 12. 패키지 환경 설정

공통 환경 설정은 `packages/config`에서 관리한다.

```txt
packages/config/
  apps.ts
  domains.ts
  env.ts
  supabase.ts
```

예시:

```ts
export const APP_DOMAINS = {
  works: "works.ynarcher.co.kr",
  guest: "guest.ynarcher.co.kr",
} as const;
```

배포 도메인(앱 2개)과 권한 도메인 키(hub, admin, ac, mna, project, fund, management 7종)는 서로 다른 개념이므로 `packages/config`에서 별도 상수로 관리한다.

앱 내부에서 도메인 문자열을 직접 하드코딩하지 않는다.

## 13. Supabase 마이그레이션 전략

DB 변경은 `supabase/migrations`에서 관리한다.

```txt
supabase/
  config.toml
  migrations/   ← 테이블/RLS 포함 모든 DB 변경의 단일 관리 경로
  seed/
```

원칙:

```txt
스키마 변경은 migration으로 남긴다.
운영 DB 직접 수정은 금지한다.
RLS 정책 변경은 staging에서 먼저 검증한다.
seed 데이터는 dev/staging 중심으로 사용한다.
production seed는 최소화한다.
```

## 14. 배포 순서

운영 배포는 다음 순서를 권장한다.

```txt
1. DB migration 검토
2. staging Supabase에 migration 적용
3. staging 앱 배포
4. 권한/RLS/인증 callback 테스트
5. production Supabase에 migration 적용
6. production 앱 배포
7. smoke test
8. 배포 로그 기록
```

주의:

```txt
DB migration이 필요한 배포는 앱 배포보다 먼저 migration 적용 순서를 검토한다.
breaking change가 있으면 backward compatible migration을 우선한다.
```

## 15. Preview 배포

Vercel preview 배포는 UI 확인과 기능 검토에 사용한다.

제한:

```txt
Auth callback URL 등록이 필요한 기능은 preview에서 제한될 수 있다.
preview가 production Supabase에 연결되면 안 된다.
민감 데이터가 preview 환경에 노출되면 안 된다.
```

권장:

```txt
preview는 dev Supabase에 연결한다.
외부 공유 preview는 샘플 데이터만 사용한다.
```

## 16. Secret 관리

secret은 다음 위치에서 관리한다.

```txt
Vercel Project Environment Variables
Supabase Dashboard Secrets
로컬 개발자의 .env.local
```

금지:

```txt
Git에 secret 커밋
문서에 실제 key 작성
로그에 secret 출력
클라이언트 코드에서 service role 사용
```

## 17. 앱/섹션 간 이동

WORKS 내부 섹션 간 이동은 앱 내부 라우팅으로 처리한다.

예시:

```txt
AC 섹션에서 HUB 스타트업 상세 보기
-> /startups/{startup_id}  (WORKS 내부 라우트, HUB 섹션)
```

WORKS↔GUEST 간 이동은 도메인 링크로 처리하며, SSO 쿠키 공유(NEXT_PUBLIC_COOKIE_DOMAIN=.ynarcher.co.kr)로 세션을 유지한다.

권한 없는 섹션/앱으로 이동한 경우:

```txt
로그인 상태 확인
해당 권한 도메인(섹션) 권한 확인
권한 없으면 접근 불가 페이지 표시 (권한 없는 섹션은 메뉴에도 노출하지 않음)
```

## 18. Smoke Test

smoke test 대상 URL:

```txt
production: https://works.ynarcher.co.kr, https://guest.ynarcher.co.kr (GUEST는 Phase 2 구현 전까지 placeholder 응답 확인)
staging:    https://works.stg.ynarcher.co.kr, https://guest.stg.ynarcher.co.kr
```

배포 후 최소 확인 항목:

```txt
앱 접속 가능
권한별 섹션 메뉴 노출/숨김 정상
로그인 가능
auth callback 정상
세션 유지 정상
권한 없는 사용자 차단
권한 있는 사용자 접근
Supabase 조회 정상
RLS 차단 정상
공통 UI 로딩 정상
```

smoke test 계정 (RLS 테스트 계정 10종과 동일 — `yna_suite_ci_cd_release_process.md` §"테스트 계정" 기준):

```txt
master
executive
management_office
investment_team
business_team
guest_expert
guest_startup
viewer
no_permission
expired_permission
```

## 19. 체크리스트

앱 배포 전:

```txt
Vercel 프로젝트를 생성했는가? (works, guest 2개)
Root Directory가 apps/works 또는 apps/guest로 설정되었는가?
도메인을 연결했는가?
Supabase URL/anon key가 환경별로 맞는가?
Auth callback URL을 등록했는가?
service role key가 클라이언트에 노출되지 않는가?
권한 없는 사용자 접근 테스트를 했는가?
```

DB 변경 전:

```txt
migration 파일이 있는가?
staging에서 먼저 적용했는가?
RLS 정책 테스트를 했는가?
rollback 방식을 검토했는가?
```

## 20. 최종 요약

Y&ARCHER WORKS의 배포 전략은 다음과 같다.

```txt
apps/works, apps/guest는 각각 독립 Vercel 프로젝트로 배포한다.
packages/*는 앱 빌드 시 공유되는 공통 코드이다.
Supabase는 dev/staging/production을 분리한다.
환경변수는 앱별로 관리하되 이름 규칙은 통일한다.
Auth callback URL은 두 앱 도메인별로 명시 등록한다.
service role key는 서버 전용이며 절대 클라이언트에 노출하지 않는다.
운영 배포 전 staging에서 RLS와 인증 흐름을 검증한다.
```
