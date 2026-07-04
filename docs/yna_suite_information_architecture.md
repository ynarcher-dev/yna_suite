# Y&A Suite Information Architecture 가이드

본 문서는 Y&A Suite의 서비스별 정보 구조(IA)를 정의한다. 목적은 모든 서비스를 한 번에 상세 설계하는 것이 아니라, Phase별로 어느 깊이까지 IA를 정해야 하는지 기준을 세우는 것이다.

관련 문서:

```txt
전체 기획: yna_suite_planning.md
Phase 1 범위: yna_suite_phase1_scope.md
폴더링/배포: yna_suite_foldering.md
기능 명세: yna_suite_hub_dev_functional_spec.md
권한/RLS: yna_suite_auth_permissions.md
기존 소스 반영: yna_suite_existing_source_alignment.md
```

## 1. IA 기본 원칙

Y&A Suite는 서비스별로 독립 배포되지만, 사용자는 하나의 제품군처럼 경험해야 한다.

IA 원칙:

```txt
서비스별 IA는 따로 둔다.
공통 IA 문법은 통일한다.
권한이 없는 메뉴는 노출하지 않는다.
읽기 전용 사용자는 쓰기 액션을 숨기거나 비활성화한다.
각 서비스는 Dashboard/List/Detail/Create/Edit/Files/Audit 패턴을 가능한 한 공유한다.
Phase 1에서는 Hub/Dev를 상세화하고, Work는 구조 IA까지만 상세화한다.
Fund/M&A/Project/Management는 placeholder IA로 시작한다.
```

## 2. 공통 IA

모든 서비스가 공유하는 공통 IA이다.

```txt
Login
Auth Callback
No Permission
Read Only State
My Account
Service Switcher
Notification Placeholder
File Download
Audit/History Entry
System Error
Not Found
```

공통 AppShell 요소:

```txt
Sidebar
Topbar
Current Service Name
Current User
Permission-aware Navigation
Content Area
Mobile Drawer Navigation
```

## 3. 서비스별 상세도 기준

| 서비스 | Phase 1 IA 깊이 | 비고 |
| :--- | :--- | :--- |
| Hub | 상세 IA | 바로 구현 가능한 수준 |
| Dev | 상세 IA | 바로 구현 가능한 수준 |
| Work | 구조 IA | Phase 2 구현을 위한 선행 구조 |
| Fund | placeholder IA | 1차 메뉴 수준 |
| M&A | placeholder IA | 1차 메뉴 수준 |
| Project | placeholder IA | 1차 메뉴 수준 |
| Management | placeholder IA | 1차 메뉴 수준 |

## 4. Y&A Hub IA

Hub는 전사 마스터 원장과 데이터 품질 관리의 중심이다.

```txt
Hub
  Dashboard
  Global Search
  Startups
    List
    Detail
      Overview
      Identifiers
      Aliases
      Field History
      Related Work History
      Merge Candidates
      Audit Summary
    Create/Edit
  Experts
    List
    Detail
      Overview
      Contact Identifiers
      Expertise
      Related Evaluations/Mentoring
      Aliases
    Create/Edit
  Partners
    List
    Detail
      Overview
      Partner Type
      Identifiers
      Related Project/Fund/M&A
      Aliases
    Create/Edit
  Temporary Masters
  Merge Candidates
    List
    Compare Detail
    Preview
    Approve/Reject/Ignore/Hold  (Hold는 화면 내 서버 액션 전용 — api_contracts §15)
  Import Batches
    List
    Detail
  Audit Logs
  Domain Connection Test  (개발/검증 · staging/dev 전용, production 비활성화)
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
Domain Connection Test (Work 연결 Mock/Test Flow · api_contracts §19)
```

## 5. Y&A Dev IA

Dev는 계정, 권한, scope, 감사의 중심이다.

```txt
Dev
  Dashboard
  Users
    List
    Detail
      Profile
      Auth Account
      Domain Permissions
      Scope
      Expiration
      Permission History
    Invite/Create
  Permission Matrix
  Permission Templates
  External User Links
    Guest Startups
    Guest Experts
  Permission Audit Logs
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
External User Links는 Work mock/test flow에 필요한 최소 연결만 둔다.
```

## 6. Y&A Work 구조 IA

Work는 `yna-matching`을 원형으로 삼는 Program First 도메인 앱이다. Phase 1에서는 실제 Work 앱을 완성하지 않고, IA 구조와 mock/test flow로 연결 계약을 검증한다.

```txt
Work
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
회의록은 별도 거대 업무 앱이 아니다.
Program Detail, Module Detail, Activity Detail에서 접근 가능해야 한다.
필드는 제목, 안건, 논의 내용, 결정사항, 첨부파일 중심으로 유지한다.
참석자, 후속 조치, 담당자, 기한은 초기 IA에서 제외한다.
```

## 7. Y&A Fund Placeholder IA

```txt
Fund
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

## 8. Y&A M&A Placeholder IA

```txt
M&A
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

## 9. Y&A Project Placeholder IA

```txt
Project
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

## 10. Y&A Management Placeholder IA

```txt
Management
  Dashboard
  Managers
  HR Records
  Departments
  Performance Metrics
  Reports
  Settings
```

## 11. Route Naming 기준

라우트는 서비스별 앱 내부에서 일관된 패턴을 따른다.

```txt
/{resource}
/{resource}/new
/{resource}/{id}
/{resource}/{id}/edit
/{resource}/{id}/{tab}
```

예시:

```txt
apps/hub
  /startups
  /startups/new
  /startups/{id}
  /merge-candidates
  /merge-candidates/{id}

apps/dev
  /users
  /users/invite
  /users/{id}

apps/work
  /programs
  /programs/new
  /programs/{id}
  /programs/{id}/modules
  /programs/{id}/activities
  /programs/{id}/meeting-minutes
```

## 12. 권한과 IA

IA는 권한 모델과 함께 동작해야 한다.

```txt
domain permission이 없으면 서비스 메뉴를 숨긴다.
can_read만 있으면 조회 메뉴와 상세 화면은 열되 쓰기 액션을 숨기거나 비활성화한다.
can_write가 있어도 scope 밖 데이터는 목록과 상세에서 보이지 않아야 한다.
guest_startup/guest_expert는 내부 Hub/Dev 메뉴를 보지 않는다.
회의록은 외부 사용자에게 원칙적으로 직접 노출하지 않는다.
```

## 13. 문서 분리 기준

초기에는 본 문서 하나로 Suite IA를 관리한다.

별도 문서로 분리할 시점:

```txt
Work 실제 구현이 시작되어 화면 상세가 2단계 이상 깊어질 때
Fund/M&A/Project/Management 중 하나가 Phase 진입할 때
외부 포털 IA가 별도 사용자 경험을 요구할 때
메뉴 권한이 서비스별로 크게 달라질 때
```

분리 예시:

```txt
yna_work_information_architecture.md
yna_fund_information_architecture.md
yna_mna_information_architecture.md
```

## 14. IA 변경 체크리스트

IA를 바꿀 때 다음을 확인한다.

```txt
해당 메뉴가 어느 service/domain에 속하는가?
Phase 1 구현 대상인가, Phase 2 이후 placeholder인가?
권한 없는 사용자에게 숨겨야 하는가?
읽기 전용 사용자에게 어떤 액션을 숨겨야 하는가?
라우트 이름이 기존 패턴과 일관적인가?
데이터 모델에 대응되는 테이블이나 view가 있는가?
RLS scope 판단이 가능한가?
기능 명세와 API 계약도 함께 바뀌어야 하는가?
```

## 15. 최종 요약

Y&A Suite IA는 서비스별로 분리하되, 문법은 통일한다.

```txt
Phase 1 상세 IA:
  Hub, Dev

Phase 1 구조 IA:
  Work

Phase 1 placeholder IA:
  Fund, M&A, Project, Management
```

지금 단계의 목표는 모든 화면을 상세 설계하는 것이 아니라, 앱 라우팅, 메뉴, 권한, Phase 범위가 서로 어긋나지 않게 기준선을 만드는 것이다.
