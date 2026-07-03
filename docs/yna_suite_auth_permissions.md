# Y&A Suite 인증 및 권한 설계 가이드

본 문서는 Y&A Suite의 인증, 권한, 접근 제어 기준을 정의한다. Y&A Suite는 여러 서비스가 독립 도메인으로 배포되지만, 사용자는 하나의 계정 체계로 로그인하고 서비스별 권한에 따라 접근한다.

권한 설계의 핵심 질문은 다음과 같다.

> 누가, 어떤 서비스에 들어갈 수 있고, 어떤 데이터를 보고, 무엇을 수정할 수 있는가?

## 1. 기본 원칙

Y&A Suite의 권한은 단순한 `admin/user` 구분으로 처리하지 않는다. 사용자 유형, 서비스 도메인 권한, 데이터 범위를 함께 판단한다.

권한 모델:

```txt
User Role + Domain Permission + Data Scope
```

의미:

```txt
User Role          = 사용자의 기본 역할
Domain Permission  = 서비스별 read/write 권한
Data Scope         = 해당 서비스 안에서 접근 가능한 데이터 범위
```

예시:

```txt
투자실 직원:
role = investment_team
fund = read/write
scope = global 또는 department

외부 전문가:
role = guest_expert
work = read
scope = self

참가 스타트업:
role = guest_startup
work = read/write
scope = company
scope_id = 자기 startup_id
```

## 2. 사용자 유형

1차 권한 템플릿은 다음 사용자 유형을 기준으로 한다.

| 사용자 유형 | 설명 |
| :--- | :--- |
| `master` | 최고 관리자. 전 서비스와 권한 관리 가능 |
| `executive` | 경영진. 주요 서비스 읽기 중심 접근 |
| `management_office` | 경영실/경영지원. 조직, HR, 성과 관리 중심 |
| `investment_team` | 투자실. Fund, M&A, Project 관련 업무 중심 |
| `business_team` | 사업부. Work, Project 관련 업무 중심 |
| `guest_expert` | 외부 전문가. 배정된 평가/멘토링 중심 |
| `guest_startup` | 참가 스타트업. 자기 회사/신청 정보 중심 |
| `viewer` | 제한적 읽기 전용 사용자 |

사용자 유형은 기본 템플릿일 뿐이며, Y&A Dev에서 사용자별 override를 허용한다.

## 3. 인증 방식

인증은 Supabase Auth를 기준으로 한다.

기본 정책:

```txt
이메일 기반 로그인
하나의 계정으로 모든 Y&A 서비스 접근
서비스별 도메인에서 동일한 세션 체계 사용
권한은 로그인 이후 dev 스키마의 권한 테이블에서 조회
```

서비스 도메인 예시 (ynarcher.co.kr의 서브도메인):

```txt
hub.ynarcher.co.kr
dev.ynarcher.co.kr
work.ynarcher.co.kr
mna.ynarcher.co.kr
project.ynarcher.co.kr
fund.ynarcher.co.kr
management.ynarcher.co.kr
```

접근 흐름:

```txt
1. 사용자가 서비스 도메인에 접속한다.
2. 세션이 없으면 로그인 페이지로 이동한다.
3. 로그인 성공 후 원래 접근하려던 서비스로 redirect한다.
4. 앱은 dev 권한 테이블에서 해당 서비스 권한을 조회한다.
5. 권한이 없으면 접근 불가 페이지를 표시한다.
6. 권한이 있으면 앱에 진입한다.
7. 화면, 버튼, 데이터 조회는 role/domain/scope 기준으로 제한한다.
```

## 4. 서비스 도메인 권한

서비스별 권한은 `none`, `read`, `write`를 기본으로 한다.

| 권한 | 의미 |
| :--- | :--- |
| `none` | 서비스 접근 불가 |
| `read` | 서비스 접근 및 조회 가능 |
| `write` | 조회 및 생성/수정/승인 등 쓰기 가능 |

도메인 목록:

```txt
hub
dev
work
mna
project
fund
management
```

권한 테이블 초안:

```sql
CREATE TABLE dev.user_permissions (
    user_id UUID REFERENCES auth.users(id),
    domain_name VARCHAR(50) NOT NULL,
    role_key VARCHAR(50) NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    scope_type VARCHAR(50) DEFAULT 'none',
    scope_id UUID NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, domain_name)
);
```

`can_write = true`이면 일반적으로 `can_read = true`도 함께 부여한다.

## 5. 데이터 Scope 모델

도메인 권한만으로는 충분하지 않다. 같은 `work:read`라도 사용자 유형에 따라 볼 수 있는 데이터 범위가 달라진다.

| Scope | 의미 |
| :--- | :--- |
| `none` | 접근 범위 없음 |
| `global` | 전사 범위 |
| `department` | 특정 부서 범위 |
| `program` | 특정 프로그램 범위 |
| `project` | 특정 프로젝트 범위 |
| `fund` | 특정 펀드 범위 |
| `company` | 특정 스타트업/회사 범위 |
| `self` | 본인에게 직접 연결된 데이터만 |

예시:

```txt
경영진:
hub:read, scope=global
fund:read, scope=global

사업부 직원:
work:write, scope=department
project:write, scope=department

외부 전문가:
work:read, scope=self

참가 스타트업:
work:write, scope=company, scope_id={startup_id}
```

## 6. 권한 템플릿

초기 템플릿은 다음과 같이 정의한다.

| 템플릿 | Hub | Dev | Work | M&A | Project | Fund | Management |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `master` | RW | RW | RW | RW | RW | RW | RW |
| `executive` | R | None | R | R | R | R | R |
| `management_office` | R | None | R | None | RW | R | RW |
| `investment_team` | R | None | R | RW | RW | RW | R |
| `business_team` | R | None | RW | None | RW | None | R |
| `guest_expert` | None | None | R | None | None | None | None |
| `guest_startup` | None | None | RW | None | None | None | None |
| `viewer` | R | None | R | None | None | None | None |

표기:

```txt
R = read
RW = read/write
None = 접근 불가
```

템플릿은 기본값이다. 실제 권한은 사용자별로 조정할 수 있다.

예시:

```txt
사업부 사용자에게 기본 business_team 템플릿 부여
임시 협업을 위해 fund:read 권한 추가
expires_at에 만료일 설정
```

## 7. 앱 접근 규칙

각 앱은 진입 시 해당 도메인 권한을 확인한다.

```txt
apps/hub          -> domain_name = hub
apps/dev          -> domain_name = dev
apps/work         -> domain_name = work
apps/mna          -> domain_name = mna
apps/project      -> domain_name = project
apps/fund         -> domain_name = fund
apps/management   -> domain_name = management
```

접근 판정:

```txt
can_read = false, can_write = false
-> 접근 불가

can_read = true, can_write = false
-> 읽기 전용

can_read = true, can_write = true
-> 조회 및 쓰기 가능
```

## 8. UI 권한 처리

UI 권한 처리는 보안의 최종선이 아니라 사용자 경험을 위한 장치이다. 실제 보안은 Supabase RLS에서 보장해야 한다.

UI 처리 기준:

```txt
서비스 접근 권한 없음:
  접근 불가 페이지 표시

읽기 전용:
  저장/삭제/승인 버튼 숨김 또는 비활성화
  읽기 전용 배지 표시

쓰기 가능:
  생성/수정/승인/반려 버튼 표시

일부 데이터만 접근:
  목록에서 허용된 데이터만 표시
```

권한 없음 메시지:

```txt
이 서비스에 접근할 권한이 없습니다.
필요한 경우 Y&A Dev 관리자에게 권한을 요청하세요.
```

주의:

```txt
버튼을 숨겼다고 보안이 완료된 것이 아니다.
직접 API 호출 또는 클라이언트 조작을 RLS가 차단해야 한다.
```

## 9. Supabase RLS 원칙

RLS는 Y&A Suite 보안의 최종 방어선이다.

기본 원칙:

```txt
모든 업무 테이블은 RLS를 활성화한다.
인증된 사용자만 접근한다.
dev.user_permissions를 기준으로 도메인 권한을 확인한다.
외부 사용자는 scope 기준으로 자기 데이터만 접근한다.
쓰기 권한은 read 권한보다 더 엄격하게 검사한다.
```

예시: JWT App Metadata의 claims 파싱을 통한 고성능 도메인 읽기 권한 검증
-- (매 쿼리마다 dev.user_permissions 테이블을 조인하는 성능 병목을 차단)

```sql
CREATE OR REPLACE FUNCTION dev.can_read_domain(target_domain TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    -- JWT 내 app_metadata -> permissions -> 도메인명 값을 파싱하여 무조인(No-Join) 고속 판정
    -- 임시 권한은 JWT claim에 expires_at을 함께 싣고, RLS helper에서 현재 시각과 비교한다.
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'can_read')::BOOLEAN,
        FALSE
    ) AND COALESCE(
        (auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'expires_at')::TIMESTAMPTZ > now(),
        TRUE
    );
$$;
```

예시: 도메인 쓰기 권한 확인 함수 (JWT Claims 파싱)

```sql
CREATE OR REPLACE FUNCTION dev.can_write_domain(target_domain TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT dev.can_read_domain(target_domain)
    AND COALESCE(
        (auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'can_write')::BOOLEAN,
        FALSE
    );
$$;
```

JWT 권한 claim에는 최소한 다음 값을 포함한다.

```json
{
  "app_metadata": {
    "permissions": {
      "work": {
        "can_read": true,
        "can_write": false,
        "scope_type": "company",
        "scope_id": "uuid",
        "expires_at": "2026-07-31T14:59:59Z"
      }
    }
  }
}
```

`expires_at`이 `NULL`이면 만료 없는 권한으로 간주한다. `expires_at`이 지정된 임시 권한은 access token 자체가 아직 유효하더라도 RLS helper에서 `now()`와 비교하여 만료 즉시 차단해야 한다.

구현(Phase 1.4): claim 주입은 **Custom Access Token Hook** `dev.custom_access_token_hook`이 담당한다. 토큰 발급/갱신 시 `dev.user_permissions`를 읽어 `app_metadata.permissions`(도메인별 read/write/scope/expires_at)와 `app_metadata.roles`(역할 배열)를 주입하며, `supabase/config.toml`의 `[auth.hook.custom_access_token]`에 `pg-functions://postgres/dev/custom_access_token_hook`로 등록한다(원격은 대시보드 Auth Hooks에서도 활성화). RLS helper는 `dev.can_read_domain`/`dev.can_write_domain`/`dev.get_scope_type`/`dev.get_scope_id`/`dev.has_role`/`dev.is_master`/`dev.can_merge_master`로 제공한다.

권한 변경·회수·만료 시각 변경 후에는 클라이언트 세션의 권한 claim 갱신을 유도한다. 즉시 회수가 필요한 고위험 권한은 access token TTL을 짧게 유지하거나 권한 버전 claim/세션 무효화 정책을 함께 사용한다.

예시: Work 프로그램 읽기 정책

```sql
CREATE POLICY "work programs read"
ON work.programs
FOR SELECT
TO authenticated
USING (
    dev.can_read_domain('work')
);
```

실제 정책은 scope 조건을 함께 적용해야 한다.

```txt
global      -> 전체 허용
department  -> 같은 부서 데이터만
program     -> 특정 프로그램만
self        -> 본인에게 배정된 데이터만
company     -> 연결된 스타트업 데이터만
```

## 10. 외부 사용자 권한

외부 사용자는 기본적으로 내부 데이터에 접근할 수 없다.

외부 전문가:

```txt
role = guest_expert
work = read
scope = self

접근 가능:
  본인에게 배정된 평가
  본인에게 배정된 멘토링
  본인에게 명시 배정된 프로그램 활동
  본인이 작성한 코멘트

접근 불가:
  전체 스타트업 목록
  다른 전문가 평가
  내부 심사역 메모
  내부 회의록
  Fund/M&A/Management 데이터
```

참가 스타트업:

```txt
role = guest_startup
work = read/write
scope = company
scope_id = 자기 startup_id

접근 가능:
  자기 회사 신청 정보
  자기 회사 프로그램 참여 정보
  자기 회사 멘토링 일정
  자기 회사에 공개된 프로그램 활동
  제출 자료 업로드

접근 불가:
  다른 스타트업 정보
  평가위원 내부 점수
  내부 심사 메모
  내부 회의록
  Fund/M&A/Management 데이터
```

## 11. 권한 변경 감사 로그

권한 변경은 반드시 이력을 남긴다.

감사 로그 테이블 초안:

```sql
CREATE TABLE dev.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL,
    domain_name VARCHAR(50) NULL,
    before_value JSONB NULL,
    after_value JSONB NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

기록 대상:

```txt
계정 생성
권한 템플릿 부여
서비스 권한 추가
서비스 권한 회수
임시 권한 만료일 변경
role 변경
scope 변경
관리자 권한 부여
```

## 12. 주요 보안 규칙

```txt
Y&A Dev 접근 권한은 master 계열에게만 부여한다.
외부 사용자는 Hub, Dev, M&A, Fund, Management에 직접 접근할 수 없다.
서비스별 read/write 권한과 RLS 정책은 항상 함께 관리한다.
삭제, 병합, 권한 변경은 반드시 감사 로그를 남긴다.
임시 권한은 expires_at을 설정한다.
권한이 만료되면 자동으로 접근 불가 처리한다.
```

## 13. 구현 위치

권한 관련 코드는 다음 위치에 둔다.

```txt
packages/auth
  Supabase 세션, 로그인/로그아웃, 사용자 정보

packages/permissions
  role 상수
  domain permission 판단
  scope 판단
  UI 권한 helper

supabase/schemas/dev
  user_permissions.sql
  permission_audit_logs.sql

supabase/policies
  도메인별 RLS 정책

apps/dev
  권한 관리 UI
  사용자 관리 UI
  감사 로그 조회
```

앱에서는 직접 권한 규칙을 새로 만들지 않고 `packages/permissions`의 helper를 사용한다.

## 14. 체크리스트

새 기능을 만들 때 다음을 확인한다.

```txt
이 기능은 어느 domain에 속하는가?
read 권한만 필요한가, write 권한이 필요한가?
scope 조건이 필요한가?
외부 사용자가 접근할 가능성이 있는가?
UI에서 버튼/메뉴를 숨기거나 비활성화했는가?
RLS에서 같은 권한 조건을 강제하는가?
권한 변경 또는 민감 액션이면 감사 로그를 남기는가?
임시 권한이면 expires_at을 설정했는가?
JWT 권한 claim에 expires_at을 포함하고 RLS helper에서 만료를 검증하는가?
테스트 계정별 접근 테스트가 있는가?
```

## 15. 최종 요약

Y&A Suite의 권한 모델은 다음 조합으로 설계한다.

```txt
User Role + Domain Permission + Data Scope
```

이 구조를 사용하면 다음 요구를 모두 처리할 수 있다.

```txt
경영진은 전체 읽기 중심 접근
투자실은 Fund/M&A 중심 쓰기 접근
사업부는 Work/Project 중심 쓰기 접근
외부 전문가는 본인 배정 업무만 접근
참가 스타트업은 자기 회사 데이터만 접근
관리자는 Y&A Dev에서 권한을 부여하고 회수
```

UI 권한 처리는 사용자 경험을 위한 것이고, 실제 보안은 Supabase RLS에서 최종적으로 보장한다.
