# Y&A Suite 1차 구축 범위 가이드

본 문서는 Y&A Suite의 실제 운영을 위한 **1차 구축 범위(Phase 1 Scope)**를 정의한다. 이 문서는 검증용 MVP가 아니라, 실제 업무 시스템을 단계적으로 구축하기 위한 릴리즈 기준이다.

본 문서의 기준은 다음 판단을 따른다.

> Phase 1에서는 Hub와 Dev를 먼저 단단히 만들고, Phase 2부터 Work를 시작으로 도메인 앱을 하나씩 연결한다.

기존 구현체 반영 기준:

```txt
yna-db는 Hub/Dev 서비스 경험의 원형으로 본다.
yna-matching은 Work 서비스 경험의 원형으로 본다.
다만 DB 경계, 권한, RLS, 감사 로그는 새 Suite 정책을 우선한다.
```

## 1. 용어 정의

Y&A Suite는 실험용 MVP가 아니라 실제 운영 시스템으로 구축한다. 따라서 본 문서에서는 `MVP` 대신 `1차 구축`, `Phase 1`, `Core Foundation`이라는 표현을 사용한다.

```txt
MVP
  검증용 최소 제품이라는 의미가 강함

Phase 1
  실제 운영을 전제로 한 1차 핵심 기반 구축

Core Foundation
  모든 도메인 앱이 공통으로 의존할 Hub + Dev 기반
```

## 2. Phase 전략

Y&A Suite는 한 번에 모든 도메인 앱을 완성하지 않는다. 먼저 전사 공통 기반을 만들고, 이후 도메인 앱을 순차적으로 연결한다.

권장 Phase:

```txt
Phase 1: Core Foundation
  Y&A Hub + Y&A Dev

Phase 2: First Domain Integration
  Y&A Work 연결

Phase 3: Fund Integration
  Y&A Fund 연결

Phase 4: Project Integration
  Y&A Project 연결

Phase 5: M&A Integration
  Y&A M&A 연결

Phase 6: Management Integration
  Y&A Management 연결
```

이 방식의 목적:

```txt
Hub 마스터 데이터 구조를 먼저 안정화한다.
Dev 권한 체계를 먼저 안정화한다.
각 도메인 앱은 동일한 방식으로 Hub와 Dev에 연결한다.
도메인별 기능 개발 중 공통 기반을 계속 뜯어고치는 일을 줄인다.
```

## 3. Phase 1 핵심 목표

Phase 1은 Hub와 Dev 중심의 핵심 기반 구축 단계이다.

Phase 1 목표:

```txt
1. Y&A Hub를 전사 마스터 원장으로 구축한다.
2. Y&A Dev를 계정/권한 관리 중심 앱으로 구축한다.
3. Supabase Auth와 서비스별 권한 모델을 연결한다.
4. 기존 스타트업 DB를 Hub로 이관한다.
5. 스타트업/전문가/협력사 마스터를 관리할 수 있게 한다.
6. 식별자, 별칭, 이력, 중복 후보, 병합 이벤트를 관리한다.
7. Work 연결 시나리오를 Program First 기준 mock/test flow로 검증한다.
8. 이후 도메인 앱이 붙을 표준 연결 방식을 만든다.
```

Phase 1에서 실제 업무 앱인 Work를 완성하지는 않는다. 대신 Work가 붙었을 때 필요한 핵심 연결 흐름을 Hub/Dev 내부에서 검증한다. 이때 Work의 서비스 모델은 단순 신청 앱이 아니라 Program First 구조를 전제로 한다.

## 4. Phase 1 완성 대상

Phase 1에서 운영 가능한 수준으로 완성해야 하는 영역은 다음이다.

```txt
Y&A Hub
Y&A Dev
Supabase Auth
권한/RLS 기본
기존 스타트업 DB 마이그레이션
마스터 데이터 검색/임시 생성/병합 후보
공통 UI/AppShell
공통 디자인 시스템
도메인 연결용 mock/test flow
Work Program First 계약 초안
```

Phase 1의 완성 대상은 `Hub + Dev + 공통 기반`이다.

## 5. Phase 1 제외 대상

Phase 1에서 실제 도메인 앱 업무 플로우는 완성하지 않는다.

```txt
Y&A Work 실제 프로그램/신청 운영
Y&A Fund 실제 펀드 업무 운영
Y&A Project 실제 프로젝트 업무 운영
Y&A M&A 실제 딜 업무 운영
Y&A Management 실제 HR/성과 업무 운영
외부 스타트업 포털
외부 전문가 평가 포털
고급 알림/메일 워크플로우
자동 병합
고급 BI 대시보드
```

단, 각 도메인의 존재는 권한/스키마/환경 설정에 반영한다.

```txt
domain_name 목록에는 work, fund, project, mna, management를 포함한다.
apps 폴더 구조는 준비할 수 있다.
DB 스키마 초안은 준비할 수 있다.
하지만 실제 업무 화면과 운영 플로우는 Phase 2 이후로 넘긴다.
```

## 6. Y&A Hub Phase 1 범위

Hub는 Phase 1의 핵심 앱이다.

Phase 1 필수:

```txt
Hub 대시보드 기본
통합 검색 기본
스타트업 마스터 목록
스타트업 마스터 상세
스타트업 마스터 생성/수정
전문가 마스터 목록
전문가 마스터 상세
전문가 마스터 생성/수정
협력사 마스터 목록
협력사 마스터 상세
협력사 마스터 생성/수정
마스터 검색/자동완성 API
임시 마스터 생성
식별자 관리
별칭 관리
필드 변경 이력 조회
중복 후보 목록
중복 후보 상세 비교
수동 병합 승인/반려
병합 이벤트 기록
기본 감사 로그 조회
```

Phase 1 제한:

```txt
중복 후보 점수는 규칙 기반으로 시작
자동 병합은 하지 않음
고급 데이터 품질 점수화는 제외
고급 통합 리포트는 제외
```

## 7. Y&A Dev Phase 1 범위

Dev는 Phase 1의 또 다른 핵심 앱이다.

Phase 1 필수:

```txt
사용자 목록
사용자 생성/초대
사용자 상세
Supabase Auth 계정 연결
권한 템플릿 부여
서비스별 read/write 권한 관리
scope_type 기본 관리
권한 변경 로그
권한 없음 처리 기준
읽기 전용 처리 기준
관리자 권한 보호
```

Phase 1 제한:

```txt
scope_type은 global/self/company 중심으로 우선 구현
department/program/fund/project scope는 구조만 준비
권한 만료일은 구조를 두되 UI는 단순하게 시작
```

Phase 1 제외:

```txt
복잡한 승인 워크플로우 기반 권한 요청
조직도 기반 자동 권한 동기화
권한 템플릿 고급 편집기
```

## 8. 공통 인증/권한 Phase 1 범위

Phase 1 필수:

```txt
Supabase Auth 로그인
서비스별 도메인 접근 제어 구조
dev.user_permissions 기반 read/write 판단
권한 없음 페이지
읽기 전용 UI 처리
RLS 기본 정책
권한 변경 감사 로그
```

중요:

```txt
Phase 1에서 Work 앱을 완성하지 않더라도,
work/fund/project/mna/management 도메인 권한은 Dev에서 설정 가능해야 한다.
```

이렇게 해야 Phase 2부터 도메인 앱을 붙일 때 Dev 구조를 다시 만들지 않는다.

## 9. 마스터 데이터 Phase 1 범위

Phase 1 필수:

```txt
스타트업 검색
전문가 검색
협력사 검색
임시 마스터 생성
master_identifiers 저장
master_aliases 저장
master_field_history 저장
merge_candidates 생성
수동 병합
merge_events 기록
audit_logs 기록
```

Phase 1에서 반드시 검증할 흐름:

```txt
기존 스타트업 DB에 있는 기업 검색
공식 번호 없는 스타트업 등록
유사한 이름/대표자 기반 중복 후보 생성
관리자 수동 병합
병합 이력 보존
대표값에서 밀려난 값 alias/identifier/history 보존
```

## 10. 데이터 마이그레이션 Phase 1 범위

Phase 1 필수:

```txt
기존 스타트업 DB import
staging 테이블
import batch 관리
raw_payload 보존
컬럼 매핑
정규화
식별자 생성
alias 생성
중복 후보 생성
실패 row 기록
dry-run
검증 리포트
rollback 기준
```

Phase 1 제한:

```txt
전문가/협력사 import는 구조 우선
모든 과거 업무 이력 완전 이관은 Phase 2 이후
```

## 11. Work 연결 Mock/Test Flow

Phase 1에서 Work 앱을 완성하지 않더라도, Work가 붙었을 때의 핵심 흐름은 반드시 테스트해야 한다.

목적:

```txt
Hub와 Dev가 실제 도메인 앱을 받을 준비가 되었는지 검증한다.
마스터 검색/임시 생성/병합 구조가 추상 설계로만 끝나지 않게 한다.
Phase 2 Work 개발 시 재설계를 줄인다.
```

검증 시나리오:

```txt
1. Dev에서 work 도메인 권한을 가진 사용자 생성
2. Mock Work 프로그램 생성
3. Mock Work 프로그램 모듈 생성
4. Hub에 기존 스타트업 마스터 존재
5. Mock Work 신청 데이터 생성
6. 기존 스타트업 검색 후 연결
7. 다른 Mock 신청에서 유사한 신규 스타트업 임시 생성
8. merge_candidates 생성
9. Hub 관리자가 병합 승인
10. Mock Work 신청 이력이 최종 마스터에 귀속되는지 확인
11. Mock Work custom activity 생성
12. Mock Work 회의록/첨부파일 연결 확인
13. audit_logs와 merge_events 기록 확인
```

Work mock/test flow가 전제로 하는 서비스 구조:

```txt
program
program_module
application
program_activity
meeting_minutes
```

검증해야 할 Work 서비스 감각:

```txt
프로그램 안에 모집/평가/멘토링/비즈니스 매칭 같은 모듈이 붙을 수 있음
프로그램 또는 모듈 안에 커스터마이즈 행사/activity가 붙을 수 있음
activity에는 가벼운 회의록과 첨부파일이 붙을 수 있음
Work 기록은 Hub 마스터를 참조하지만 Hub 마스터를 직접 수정하지 않음
Work에서 새 스타트업/전문가/협력사가 유입되면 Hub 임시 마스터와 병합 후보 흐름을 탐
```

구현 방식:

```txt
간단한 내부 테스트 화면
또는 scripts/mock-domain/work-application-flow
또는 Hub 내부의 "도메인 연결 테스트" 기능
```

Phase 1에서 필요한 것은 실제 Work UI 완성이 아니라, 도메인 연결 계약의 검증이다.

## 12. Phase 2: Y&A Work 연결

Phase 2는 첫 번째 실제 도메인 앱으로 Work를 붙이는 단계이다.

Phase 2 주요 범위:

```txt
Y&A Work 앱 완성
Program First 구조
프로그램 목록/상세/생성
프로그램 모듈 관리
신청 목록/상세
신청자/참여자 관리
스타트업 검색 후 신청 연결
신규 스타트업 임시 생성 후 신청 연결
신청 상태 관리
전문가 참조
서류평가
현장평가
오리엔테이션
평가 배정 기본
멘토링 세션 기본 등록
비즈니스 매칭
데모데이
성과관리
커스터마이즈 행사/activity
가벼운 회의록/첨부파일
외부 스타트업/전문가 권한 검증 (self/company scope 격리 테스트 —
  Phase 1은 외부 사용자 연결과 Hub/Dev 접근 차단까지만 검증한다)
```

Phase 2에서 검증할 핵심:

```txt
Work가 Hub 마스터를 실제로 참조하는가?
Work가 Dev 권한 체계를 실제로 따르는가?
Work에서 생성한 임시 마스터가 Hub 병합 큐로 들어오는가?
병합 후 Work 이력이 최종 마스터로 귀속되는가?
```

## 13. Phase 3 이후 후보

Phase 3 이후는 도메인 앱을 하나씩 추가한다.

권장 순서:

```txt
Phase 3: Y&A Fund
Phase 4: Y&A Project
Phase 5: Y&A M&A
Phase 6: Y&A Management
```

순서는 실제 업무 우선순위에 따라 바꿀 수 있다.

각 Phase의 공통 목표:

```txt
도메인 앱을 독립 도메인으로 배포한다.
Hub 마스터를 참조한다.
Dev 권한 체계를 따른다.
도메인 업무 이력을 Hub 마스터 생애 이력에 연결한다.
필요한 경우 임시 마스터 생성과 병합 후보 생성을 지원한다.
```

## 14. Phase 1 완료 기준

Phase 1은 다음 조건을 만족해야 완료로 본다.

```txt
Y&A Hub 접속 가능
Y&A Dev 접속 가능
Supabase Auth 로그인 가능
Dev에서 사용자 생성/권한 부여 가능
서비스별 권한이 RLS와 UI에 반영됨
Hub 스타트업/전문가/협력사 마스터 등록 가능
기존 스타트업 DB 1차 import 가능
식별자/별칭/필드 이력 저장 가능
중복 후보가 생성되고 Hub에서 검토 가능
수동 병합 가능
병합 이벤트와 감사 로그가 남음
Work 연결 mock/test flow 통과
공통 디자인 시스템이 Hub/Dev 주요 화면에 적용됨
권한 없는 사용자 차단 및 외부 사용자 Hub/Dev 접근 차단 테스트 통과
  (외부 사용자의 self/company scope 격리 검증은 Phase 2 — §12 참고)
staging에서 smoke test 통과
production 배포 절차 문서화
```

## 15. 구현 순서 제안

Phase 1 구현 순서는 다음을 권장한다. (실제 진행은 `docs_jm/3_checklist.md` 기준 — import 도구는 감사 로그 뒤(Phase 1.12)에 구현했다. 권장 순서와 다르지만 의존성 위반은 아니다.)

```txt
1. 모노레포 스캐폴딩
2. 공통 UI/AppShell
3. Supabase schema/migration 기본
4. Auth/permission 기본
5. Y&A Dev 사용자/권한 관리
6. Y&A Hub 스타트업 마스터
7. 기존 스타트업 DB import
8. Hub 전문가/협력사 마스터
9. 마스터 검색/임시 생성
10. 식별자/별칭/필드 이력
11. 병합 후보/수동 병합
12. 감사 로그
13. Work 연결 mock/test flow
14. staging 배포 및 smoke test
15. production 배포
```

## 16. 체크리스트

Phase 1에 포함할 기능인지 판단할 때 다음을 확인한다.

```txt
Hub 또는 Dev 핵심 기반에 직접 필요한가?
모든 도메인 앱이 공통으로 의존할 기능인가?
기존 데이터 이관에 필요한가?
마스터 데이터 신뢰도에 영향을 주는가?
권한/RLS 구조를 검증하는 데 필요한가?
Work 연결 mock/test flow에 필요한가?
```

Phase 1에서 미룰 수 있는 기능:

```txt
특정 도메인 앱에만 필요한 업무 상세
고급 자동화
고급 리포트
복잡한 외부 사용자 경험
도메인별 전문 워크플로우
```

## 17. 최종 요약

Phase 1은 Hub + Dev를 먼저 구축하는 Core Foundation 단계이다.

```txt
Phase 1 완성:
  Hub, Dev, Auth, Permission, RLS, Master Data, Migration, Merge, Audit

Phase 1 검증:
  Work 연결 mock/test flow

Phase 2 완성:
  Work 실제 도메인 앱

Phase 3 이후:
  Fund, Project, M&A, Management 순차 연결
```

이 전략은 초기 업무 앱 출시 속도보다 공통 기반의 안정성을 우선한다. 대신 Phase 1에서 Work 연결 시나리오를 반드시 검증해, Hub와 Dev가 실제 도메인 앱을 받을 준비가 되었는지 확인한다.
