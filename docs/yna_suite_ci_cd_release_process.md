# Y&ARCHER WORKS CI/CD 및 릴리즈 운영 가이드

> 2026-07-04 아키텍처 개편: 서비스별 7개 앱 구조를 **WORKS 단일 내부 앱(apps/works) + GUEST 외부 포털(apps/guest)** 2앱 구조로 변경했다. 본 문서는 개편 기준으로 갱신되었다.

본 문서는 Y&ARCHER WORKS의 브랜치 전략, PR 검증, CI 체크, DB migration 반영, staging 검증, production 배포 절차를 정의한다.

Y&ARCHER WORKS는 WORKS/GUEST 2개 앱을 독립 배포하지만 인증, 권한, DB, 마스터 데이터가 공유되므로 배포 순서와 검증 기준이 중요하다.

관련 문서:

```txt
환경/배포: yna_suite_environment_deployment.md
DB 운영: yna_suite_database_operations.md
보안 정책: yna_suite_security_policy.md
유지보수 규칙: yna_suite_maintenance_rules.md
RLS 매트릭스: yna_suite_rls_policy_matrix.md
```

## 1. 핵심 원칙

CI/CD는 다음 원칙을 따른다.

```txt
production은 항상 staging 검증 후 배포한다.
DB migration은 앱 배포와 순서를 명확히 맞춘다.
RLS 변경은 자동/수동 테스트를 모두 통과해야 한다.
공통 패키지 변경은 영향 앱(works/guest)을 모두 확인한다.
preview는 production Supabase에 연결하지 않는다.
릴리즈 결과와 rollback 가능성을 기록한다.
```

## 2. 브랜치 전략

권장 브랜치:

| 브랜치 | 목적 |
| :--- | :--- |
| `main` | production 배포 기준 |
| `develop` | staging 또는 통합 검증 기준 |
| `feature/*` | 기능 개발 |
| `fix/*` | 버그 수정 |
| `hotfix/*` | 운영 긴급 수정 |
| `release/*` | 릴리즈 후보 안정화 |

운영 규칙:

```txt
main 직접 push 금지
PR 기반 merge
DB migration 포함 PR은 별도 라벨 부여
보안/RLS 변경 PR은 추가 리뷰어 지정
```

소규모 팀에서는 `develop` 없이 `main + feature/* + preview` 방식도 가능하다. 단, staging 배포 기준은 반드시 유지한다.

> **현 단계(Phase 1~2, 1인 개발) 운영 방식**: 위 소규모 예외를 적용한다. 단위 작업마다 즉시 commit & push하는 작업 규칙(`docs_jm/2_rules.md`)은 feature 브랜치 위에서의 커밋 습관을 말하며, main 반영은 PR merge를 기본으로 한다(급한 문서 수정 등 경미한 변경은 main 직접 push 허용). 협업 인원이 늘어나는 시점부터 위 운영 규칙(PR 필수·리뷰어 지정)을 전면 적용한다.

## 3. PR 필수 체크

모든 PR은 다음을 통과해야 한다.

```txt
lint
typecheck
unit test
affected app build (works/guest 2앱 기준 — 앱 내부 변경은 해당 앱만, 공통 패키지 변경은 두 앱 모두)
문서 변경 필요 여부 확인
권한/RLS 영향 여부 확인
```

권장 명령:

```txt
pnpm lint
pnpm typecheck
pnpm test
turbo build --filter=@yna/works
```

공통 패키지 변경 시:

```txt
packages/ui 변경 -> 영향을 받는 앱(works/guest) 모두 build
packages/permissions 변경 -> 권한 관련 unit/e2e test
packages/master-data 변경 -> 정규화/병합 후보 unit test
packages/database 변경 -> query/RLS smoke test
```

## 4. PR 체크리스트

PR 작성자는 다음을 확인한다.

```txt
변경 목적이 명확한가?
영향 앱이 적혀 있는가?
DB migration이 필요한가?
RLS 변경이 필요한가?
새 환경변수가 있는가?
문서 갱신이 필요한가?
테스트를 추가했는가?
rollback 방법이 있는가?
```

권한/보안 관련 PR은 추가 확인한다.

```txt
권한 없는 사용자가 접근할 수 없는가?
읽기 전용 사용자의 쓰기가 차단되는가?
외부 사용자의 타사/타인 데이터 접근이 차단되는가?
service role이 클라이언트에 노출되지 않는가?
민감 데이터가 로그에 남지 않는가?
```

## 5. CI 체크 구성

권장 CI job:

```txt
install
lint
typecheck
unit-test
build-affected
db-migration-check
rls-test
playwright-smoke
```

단계별 목적:

| Job | 목적 |
| :--- | :--- |
| `install` | lockfile 기반 설치 검증 |
| `lint` | 코드 스타일/기본 오류 검증 |
| `typecheck` | TypeScript 계약 검증 |
| `unit-test` | 핵심 로직 검증 |
| `build-affected` | 변경 영향 앱 빌드 |
| `db-migration-check` | migration 문법/적용 가능성 검증 |
| `rls-test` | 테스트 계정별 접근 검증 |
| `playwright-smoke` | 주요 브라우저 흐름 검증 |

## 6. DB Migration 포함 PR

DB 변경 PR은 더 보수적으로 처리한다.

필수 항목:

```txt
supabase/migrations 파일
관련 data_model 문서 갱신
RLS 영향 검토
backfill 필요 여부
rollback 전략
staging 검증 결과
```

Migration 작성 원칙:

```txt
schema 변경과 대량 데이터 변경을 분리한다.
breaking change를 피한다.
기존 컬럼 삭제보다 deprecated 처리한다.
NOT NULL은 nullable 추가 -> backfill -> 제약 추가 순서로 진행한다.
```

DB 변경 PR 라벨:

```txt
db:migration
db:rls
db:backfill
security
breaking-risk
```

## 7. RLS 변경 PR

RLS 변경은 production 배포 전 반드시 staging에서 테스트한다.

필수 테스트 계정:

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

필수 검증:

```txt
권한 있는 SELECT 성공
권한 없는 SELECT 실패
권한 있는 UPDATE 성공
읽기 전용 UPDATE 실패
외부 사용자의 타사 데이터 실패
만료된 권한 실패
```

RLS 변경 PR은 `yna_suite_rls_policy_matrix.md` 갱신 여부를 확인한다.

## 8. 환경변수 변경

새 환경변수를 추가할 때는 다음을 함께 처리한다.

```txt
apps/works 또는 apps/guest의 .env.example 갱신
루트 .env.example 갱신 필요 여부 확인
yna_suite_environment_deployment.md 갱신
Vercel project 환경변수 등록
staging/production 값 분리
NEXT_PUBLIC_ 노출 여부 검토
```

주의:

```txt
secret은 문서에 실제 값을 쓰지 않는다.
service role key는 NEXT_PUBLIC_ 접두사 금지
```

## 9. Preview 배포

Preview는 UI 확인과 제한된 기능 검증에 사용한다.

허용:

```txt
화면 리뷰
컴포넌트 검토
샘플 데이터 기반 기능 검증
```

금지:

```txt
production Supabase 연결
운영 개인정보 사용
외부 공유 preview에 민감 데이터 노출
```

권장:

```txt
preview는 dev Supabase 사용
Auth callback이 필요한 기능은 staging에서 최종 검증
```

## 10. Staging 배포 절차

staging 배포 순서:

```txt
1. PR merge 또는 release branch 생성
2. staging Supabase migration 적용
3. staging 앱 배포
4. Auth callback 확인
5. RLS/권한 테스트
6. 핵심 smoke test
7. 데이터 생성/수정/병합 테스트
8. 결과 기록
```

staging smoke test:

```txt
로그인 가능
WORKS 접속 가능 (루트 = HUB 섹션)
관리 섹션(/admin) 접속 가능
권한 없는 사용자 차단 (권한 없는 섹션 메뉴 미노출 포함)
HUB 마스터 검색 가능
임시 마스터 생성 가능
중복 후보 생성 가능
병합 승인 가능
audit log 기록 확인
```

## 11. Production 배포 절차

production 배포 전 조건:

```txt
staging smoke test 통과
RLS 테스트 통과
DB migration 검토 완료
rollback 방법 확인
배포 담당자/승인자 확인
```

production 배포 순서:

```txt
1. 배포 공지 또는 내부 공유
2. production DB backup 상태 확인
3. production Supabase migration 적용
4. production 앱 배포
5. production smoke test
6. 주요 로그 확인
7. 배포 결과 기록
```

주의:

```txt
DB migration이 backward compatible하면 migration을 먼저 적용한다.
앱이 새 schema를 먼저 요구하면 앱 배포 순서를 조정한다.
breaking change는 release window를 잡는다.
```

## 12. 릴리즈 노트

릴리즈마다 간단한 기록을 남긴다.

필수 항목:

```txt
릴리즈 일시
배포 앱
포함 PR
DB migration 목록
환경변수 변경
권한/RLS 변경
검증 결과
rollback 방법
담당자
```

예시:

```txt
Release: 2026-07-03 WORKS Phase 1 (HUB/관리 섹션)
Apps: works
Migrations: 20260703120000_create_hub_master_tables.sql
RLS: hub.startups read/write policies
Smoke: passed
Rollback: app deploy rollback + migration deprecated path
```

## 13. Hotfix 절차

운영 긴급 수정은 빠르되 기록을 남긴다.

절차:

```txt
1. 영향 범위 확인
2. hotfix/* 브랜치 생성
3. 최소 수정
4. 빠른 테스트
5. 승인자 확인
6. production 배포
7. 결과 확인
8. 사후 문서/테스트 보강
```

DB hotfix는 더 엄격하다.

```txt
운영 SQL Editor 즉흥 UPDATE 금지
수정 전 snapshot 확보
대상 row 수 확인
audit log 또는 hotfix log 기록
```

## 14. Rollback 기준

Rollback 유형:

```txt
app deploy rollback
feature flag rollback
DB schema rollback
data rollback
secret rotation
```

앱 rollback:

```txt
Vercel 이전 배포로 즉시 rollback
DB schema가 backward compatible해야 안전
```

DB rollback:

```txt
컬럼 삭제/데이터 손실 migration은 rollback 어려움
가능하면 deprecated 방식으로 운영
데이터 변경은 batch/snapshot 기준으로 되돌림
```

Rollback 판단 질문:

```txt
사용자 접근이 막히는가?
권한이 과도하게 열렸는가?
데이터 손상 가능성이 있는가?
앱 rollback만으로 해결되는가?
DB rollback이 필요한가?
```

## 15. 배포 승인 기준

production 배포는 다음 기준을 통과해야 한다.

```txt
CI 필수 job 통과
staging 검증 통과
RLS 변경 테스트 완료
DB migration rollback 검토
보안 영향 검토
문서 갱신 완료
```

승인자:

```txt
일반 기능: 담당 리드
DB 변경: DB/백엔드 책임자
권한/RLS/보안 변경: 보안 또는 시스템 책임자
운영 hotfix: 승인자 1인 이상
```

## 16. 배포 후 모니터링

배포 후 확인 항목:

```txt
앱 접속 오류
로그인 실패 증가
권한 오류 증가
Supabase query error
RLS permission denied 급증
API 5xx 증가
성능 지연
audit log 정상 기록
```

관측 도구는 도입 시 별도 문서에 기록한다.

```txt
Vercel Logs
Supabase Logs
Sentry 또는 유사 에러 추적
내부 배포 로그
```

## 17. 체크리스트

PR 전:

```txt
테스트 작성/수정
문서 갱신
RLS 영향 확인
환경변수 영향 확인
```

staging 전:

```txt
migration 적용 가능
build 성공
preview 확인
```

production 전:

```txt
staging smoke 통과
rollback 방법 확인
승인자 확인
배포 순서 확정
```

production 후:

```txt
smoke test 통과
로그 확인
릴리즈 기록 작성
```

## 18. 최종 요약

Y&ARCHER WORKS의 릴리즈 운영은 다음을 핵심으로 한다.

```txt
PR에서 영향 범위를 명확히 한다.
DB migration과 앱 배포 순서를 분리해서 판단한다.
RLS 변경은 staging에서 테스트 계정으로 검증한다.
preview는 production 데이터에 연결하지 않는다.
production 배포는 smoke test와 rollback 계획을 전제로 한다.
```

CI/CD는 배포를 빠르게 하기 위한 자동화이면서, 데이터와 권한 경계를 깨뜨리지 않기 위한 운영 안전장치이다.
