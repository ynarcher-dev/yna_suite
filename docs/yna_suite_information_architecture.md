# Y&ARCHER WORKS Information Architecture 가이드

> 2026-07-04 아키텍처 개편: 다중 앱/서브도메인 구조를 **WORKS 단일 내부 앱(섹션 구조) + GUEST 외부 앱(Phase 2)** 으로 통합했다.

본 문서는 Y&ARCHER WORKS의 앱/섹션별 정보 구조(IA)를 정의한다. 목적은 모든 섹션을 한 번에 상세 설계하는 것이 아니라, Phase별로 어느 깊이까지 IA를 정해야 하는지 기준을 세우는 것이다.

관련 문서:

```txt
전체 기획: yna_suite_planning.md
Phase 1 범위: yna_suite_phase1_scope.md
폴더링/배포: yna_suite_foldering.md
기능 명세: yna_suite_hub_admin_functional_spec.md
권한/RLS: yna_suite_auth_permissions.md
기존 소스 반영: yna_suite_existing_source_alignment.md
```

## 1. IA 기본 원칙

플랫폼은 앱 2개로 구성된다.

```txt
WORKS (apps/works, works.ynarcher.co.kr, 포트 3000):
  내부 직원 전용 통합 앱. 7개 섹션(HUB/관리/AC/M&A/PROJECT/FUND/MANAGEMENT)을 담는다.
  섹션별 도메인 권한으로 메뉴 노출을 제어한다.
GUEST (apps/guest, guest.ynarcher.co.kr, 포트 3001):
  참가 스타트업(guest_startup)·외부 전문가(guest_expert) 전용 포털.
  Phase 2에서 구현(현재 placeholder). 외부 사용자는 WORKS에 접근 불가.
```

IA 원칙:

```txt
섹션별 IA는 따로 둔다(스키마/권한 경계와 일치).
공통 IA 문법은 통일한다.
권한이 없는 섹션 메뉴는 노출하지 않는다.
읽기 전용 사용자는 쓰기 액션을 숨기거나 비활성화한다.
각 섹션은 Dashboard/List/Detail/Create/Edit/Files/Audit 패턴을 가능한 한 공유한다.
Phase 1에서는 HUB/관리 섹션을 상세화하고, AC는 구조 IA까지만 상세화한다.
FUND/M&A/PROJECT/MANAGEMENT 섹션과 GUEST 앱은 placeholder IA로 시작한다.
```

## 2. 공통 IA

WORKS 앱의 모든 섹션이 공유하는 공통 IA이다.

```txt
Login
Auth Callback
No Permission
Read Only State
My Account
Section Switcher (앱 내 섹션 전환 — 권한 있는 섹션만 노출)
Notification Placeholder
File Download
Audit/History Entry
System Error
Not Found
```

공통 AppShell 요소:

```txt
Sidebar (섹션별 메뉴 트리)
Topbar
Current Section Name
Current User
Permission-aware Navigation
Content Area
Mobile Drawer Navigation
```

## 3. 섹션별 상세도 기준

| 앱 / 섹션 | Phase 1 IA 깊이 | 비고 |
| :--- | :--- | :--- |
| WORKS / HUB | 상세 IA | 바로 구현 가능한 수준. 앱 기본 섹션 |
| WORKS / 관리(ADMIN) | 상세 IA | 바로 구현 가능한 수준 |
| WORKS / AC | 구조 IA | Phase 2 구현을 위한 선행 구조 |
| WORKS / FUND | placeholder IA | 1차 메뉴 수준 |
| WORKS / M&A | placeholder IA | 1차 메뉴 수준 |
| WORKS / PROJECT | placeholder IA | 1차 메뉴 수준 |
| WORKS / MANAGEMENT | placeholder IA | 1차 메뉴 수준 |
| GUEST 앱 | placeholder | 라우트/IA는 Phase 2에서 정의 |

## 4. HUB 섹션 IA

HUB는 전사 마스터 원장과 데이터 품질 관리의 중심이며, WORKS 앱의 기본 섹션으로 루트 경로를 사용한다.

```txt
HUB (루트 경로)
  Dashboard                /
  Global Search            /search
  Startups                 /startups
    List
    Detail
      Overview
      Identifiers
      Aliases
      Field History
      Related AC History
      Merge Candidates
      Audit Summary
    Create/Edit
  Experts                  /experts
    List
    Detail
      Overview
      Contact Identifiers
      Expertise
      Related Evaluations/Mentoring
      Aliases
    Create/Edit
  Partners                 /partners
    List
    Detail
      Overview
      Partner Type
      Identifiers
      Related Project/Fund/M&A
      Aliases
    Create/Edit
  Temporary Masters        /temporary-masters
  Merge Candidates         /merge-candidates
    List
    Compare Detail
    Preview
    Approve/Reject/Ignore/Hold  (Hold는 화면 내 서버 액션 전용 — api_contracts §15)
  Import Batches           /import-batches
    List
    Detail
  Audit Logs               /audit-logs
  Domain Connection Test   /domain-test  (개발/검증 · staging/dev 전용, production 비활성화)
```

Phase 1 필수:

```txt
Dashboard
Global Search
Startups
Experts
Partners
Temporary Masters
Merge Candidates
Import Batches
Audit Logs
Domain Connection Test (AC 연결 Mock/Test Flow · api_contracts §19)
```

## 5. 관리(ADMIN) 섹션 IA

관리 섹션은 계정, 권한, scope, 감사의 중심이다. 기존 Dev 앱 라우트가 `/admin` 아래로 이동했으며, master 등 관리 권한자에게만 메뉴가 노출된다.

```txt
관리(ADMIN)
  Dashboard
  Users                       /admin/users
    List
    Detail                    /admin/users/{id}
      Profile
      Auth Account
      Domain Permissions
      Scope
      Expiration
      Permission History
    Invite/Create
  Permission Matrix           /admin/permission-matrix
  Permission Templates        /admin/permission-templates
  External User Links
    Guest Startups
    Guest Experts
  Permission Audit Logs       /admin/permission-audit-logs
  System Settings
```

Phase 1 필수:

```txt
Users
User Detail
User Invite/Create
Domain Permissions
Permission Templates
Permission Audit Logs
```

Phase 1 단순화:

```txt
Permission Matrix는 복잡하면 User Detail 중심으로 축소한다.
System Settings는 placeholder로 시작한다.
External User Links는 AC mock/test flow에 필요한 최소 연결만 둔다.
```

## 6. AC 섹션 구조 IA

AC(액셀러레이팅, 구 Y&A Work)는 `yna-matching`을 원형으로 삼는 Program First 섹션이다. 라우트는 `/ac/*`를 사용한다(Phase 2). Phase 1에서는 실제 AC 섹션을 완성하지 않고, IA 구조와 mock/test flow(`/api/mock/ac/*`)로 연결 계약을 검증한다.

```txt
AC (/ac/*)
  Dashboard
  Programs
    List
    Detail
      Overview
      Timeline
      Modules
      Applications
      Participants
      Activities
      Meeting Minutes
      Files
      Outcomes
    Create/Edit
  Modules
    Recruitment
    Participant Management
    Document Review
    Onsite Evaluation
    Orientation
    Mentoring
    Business Matching
    Demo Day
    Outcome Management
    Custom Event
  Applications
    List
    Detail
  Participants
    Startups
    Experts
    Partners
    Managers
  Activities
    List
    Detail
    Create/Edit
  Meeting Minutes
    List
    Detail
    Create/Edit
  Files
  Outcome Reports
```

Phase 2 우선 상세화:

```txt
Programs
Modules
Applications
Participants
Document Review
Mentoring
Business Matching
Activities
Meeting Minutes
```

회의록 IA 기준:

```txt
회의록은 별도 거대 업무 섹션이 아니다.
Program Detail, Module Detail, Activity Detail에서 접근 가능해야 한다.
필드는 제목, 안건, 논의 내용, 결정사항, 첨부파일 중심으로 유지한다.
참석자, 후속 조치, 담당자, 기한은 초기 IA에서 제외한다.
```

## 7. FUND 섹션 Placeholder IA

라우트는 `/fund/*` (해당 Phase에서 상세화).

```txt
FUND (/fund/*)
  Dashboard
  Funds
    List
    Detail
  Limited Partners
  Capital Calls
  Investments
  Reports
  Files
```

## 8. M&A 섹션 Placeholder IA

라우트는 `/mna/*` (해당 Phase에서 상세화).

```txt
M&A (/mna/*)
  Dashboard
  Deals
    List
    Detail
  Pipeline
  Advisory Partners
  Due Diligence Files
  Closing
  Reports
```

## 9. PROJECT 섹션 Placeholder IA

라우트는 `/project/*` (해당 Phase에서 상세화).

```txt
PROJECT (/project/*)
  Dashboard
  Projects
    List
    Detail
  Milestones
  Partners
  Manpower Allocations
  Files
  Reports
```

## 10. MANAGEMENT 섹션 Placeholder IA

라우트는 `/management/*` (해당 Phase에서 상세화).

```txt
MANAGEMENT (/management/*)
  Dashboard
  Managers
  HR Records
  Departments
  Performance Metrics
  Reports
  Settings
```

## 10-1. GUEST 앱 Placeholder

GUEST 앱(apps/guest)은 참가 스타트업·외부 전문가 전용 포털이다. 메뉴/라우트/화면 IA는 **Phase 2에서 정의**한다. Phase 1에서는 placeholder 앱과 외부 사용자 연결/차단 검증(기능 명세 §19)만 둔다.

```txt
GUEST (guest.ynarcher.co.kr)
  (Phase 2에서 정의)
  guest_startup: 자기 회사 scope 데이터만
  guest_expert: 자기 배정 scope 데이터만
```

## 11. Route Naming 기준

WORKS 앱 내부에서 라우트는 일관된 패턴을 따른다. HUB 섹션은 기본 섹션으로 루트 경로를 쓰고, 나머지 섹션은 섹션 prefix를 쓴다.

```txt
HUB(기본 섹션):     /{resource}
그 외 섹션:         /{section}/{resource}    (section = admin | ac | fund | project | mna | management)

/{resource}
/{resource}/new
/{resource}/{id}
/{resource}/{id}/edit
/{resource}/{id}/{tab}
```

예시:

```txt
apps/works
  # HUB 섹션 (루트)
  /startups
  /startups/new
  /startups/{id}
  /merge-candidates
  /merge-candidates/{id}
  /domain-test

  # 관리 섹션
  /admin/users
  /admin/users/invite
  /admin/users/{id}
  /admin/permission-matrix
  /admin/permission-templates
  /admin/permission-audit-logs

  # AC 섹션 (Phase 2)
  /ac/programs
  /ac/programs/new
  /ac/programs/{id}
  /ac/programs/{id}/modules
  /ac/programs/{id}/activities
  /ac/programs/{id}/meeting-minutes

  # mock API (개발/검증)
  /api/mock/ac/*
```

GUEST 앱(apps/guest)의 라우트는 Phase 2에서 정의한다.

## 12. 권한과 IA

IA는 권한 모델과 함께 동작해야 한다. 권한 도메인 키는 `hub, admin, ac, mna, project, fund, management` 7개다.

```txt
domain permission이 없으면 해당 섹션 메뉴를 숨긴다.
can_read만 있으면 조회 메뉴와 상세 화면은 열되 쓰기 액션을 숨기거나 비활성화한다.
can_write가 있어도 scope 밖 데이터는 목록과 상세에서 보이지 않아야 한다.
guest_startup/guest_expert는 WORKS 앱에 접근하지 않는다(GUEST 앱 전용 — Phase 2).
회의록은 외부 사용자에게 원칙적으로 직접 노출하지 않는다.
```

## 13. 문서 분리 기준

초기에는 본 문서 하나로 WORKS/GUEST IA를 관리한다.

별도 문서로 분리할 시점:

```txt
AC 섹션 실제 구현이 시작되어 화면 상세가 2단계 이상 깊어질 때
FUND/M&A/PROJECT/MANAGEMENT 중 하나가 Phase 진입할 때
GUEST 앱 IA가 별도 사용자 경험을 요구할 때(Phase 2)
메뉴 권한이 섹션별로 크게 달라질 때
```

분리 예시:

```txt
yna_ac_information_architecture.md
yna_fund_information_architecture.md
yna_mna_information_architecture.md
yna_guest_information_architecture.md
```

## 14. IA 변경 체크리스트

IA를 바꿀 때 다음을 확인한다.

```txt
해당 메뉴가 어느 앱(WORKS/GUEST)과 어느 섹션/domain에 속하는가?
Phase 1 구현 대상인가, Phase 2 이후 placeholder인가?
권한 없는 사용자에게 숨겨야 하는가?
읽기 전용 사용자에게 어떤 액션을 숨겨야 하는가?
라우트 이름이 기존 패턴(HUB=루트, 그 외=/{section}/*)과 일관적인가?
데이터 모델에 대응되는 테이블이나 view가 있는가?
RLS scope 판단이 가능한가?
기능 명세와 API 계약도 함께 바뀌어야 하는가?
```

## 15. 최종 요약

WORKS IA는 섹션별로 분리하되, 문법은 통일한다. 섹션 분리는 스키마/권한 경계와 일치한다.

```txt
Phase 1 상세 IA:
  HUB, 관리(ADMIN) 섹션

Phase 1 구조 IA:
  AC 섹션

Phase 1 placeholder IA:
  FUND, M&A, PROJECT, MANAGEMENT 섹션, GUEST 앱
```

지금 단계의 목표는 모든 화면을 상세 설계하는 것이 아니라, 앱 라우팅, 섹션 메뉴, 권한, Phase 범위가 서로 어긋나지 않게 기준선을 만드는 것이다.
