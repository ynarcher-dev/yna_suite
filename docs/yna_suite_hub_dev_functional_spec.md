# Y&A Suite Hub/Dev Phase 1 기능 명세 가이드

본 문서는 Phase 1에서 구축할 Y&A Hub와 Y&A Dev의 화면, 기능, 권한, 완료 기준을 정의한다.

`yna_suite_phase1_scope.md`가 범위를 정한다면, 이 문서는 구현자가 화면 단위로 무엇을 만들어야 하는지 판단할 수 있게 하는 기능 명세이다.

관련 문서:

```txt
1차 범위: yna_suite_phase1_scope.md
디자인 시스템: yna_suite_design_system.md
API 계약: yna_suite_api_contracts.md
RLS 매트릭스: yna_suite_rls_policy_matrix.md
마스터 정책: yna_suite_master_data_policy.md
기존 소스 반영: yna_suite_existing_source_alignment.md
```

## 1. Phase 1 목표

Phase 1의 기능 목표:

```txt
Hub를 전사 마스터 원장으로 사용할 수 있다.
Dev에서 사용자와 권한을 관리할 수 있다.
Supabase Auth와 권한/RLS가 실제로 연결된다.
기존 스타트업 DB를 Hub로 이관할 수 있다.
마스터 검색/임시 생성/중복 후보/수동 병합이 가능하다.
Program First 기준 Work 연결 mock/test flow를 통과한다.
```

Phase 1에서 하지 않는 것:

```txt
실제 Work 프로그램 운영
실제 Fund/M&A/Project/Management 업무 운영
외부 스타트업 포털 완성
외부 전문가 평가 포털 완성
자동 병합
고급 BI 대시보드
```

## 2. 공통 AppShell

Hub와 Dev는 같은 AppShell을 사용한다.

구성:

```txt
좌측 sidebar
상단 topbar
서비스명/현재 사용자
권한 기반 메뉴 표시
content 영역
```

필수 동작:

```txt
로그인하지 않은 사용자는 로그인으로 이동
도메인 권한이 없으면 접근 불가 페이지 표시
읽기 전용 사용자는 쓰기 액션 숨김 또는 비활성화
모바일에서는 drawer navigation 사용
```

완료 기준:

```txt
Hub/Dev 모두 같은 레이아웃 사용
권한 없는 메뉴가 노출되지 않음
키보드 포커스 표시
모바일에서 주요 화면 깨짐 없음
```

## 3. 로그인/권한 확인

기능:

```txt
Supabase Auth 로그인
로그아웃
세션 유지
도메인 권한 조회
권한 없음 페이지
읽기 전용 표시
```

화면/상태:

```txt
로그인 페이지
auth callback 처리
접근 불가 페이지
세션 만료 처리
```

완료 기준:

```txt
master 사용자는 Hub/Dev 접근 가능
viewer는 Hub read 가능, Dev 접근 불가
no_permission은 Hub/Dev 접근 불가
만료된 권한은 접근 불가
```

## 4. Hub 대시보드

목적:

```txt
전사 마스터 데이터 상태를 빠르게 확인한다.
```

필수 위젯:

```txt
스타트업 마스터 수
전문가 마스터 수
협력사 마스터 수
pending 마스터 수
pending merge candidate 수
최근 병합 이벤트
최근 import batch 상태
```

제외:

```txt
고급 BI
복잡한 차트
도메인별 매출/성과 분석
```

완료 기준:

```txt
각 숫자가 실제 DB 기준으로 조회됨
권한 없는 사용자는 접근 불가
최근 항목 클릭 시 관련 상세로 이동
```

## 5. Hub 통합 검색

목적:

```txt
스타트업, 전문가, 협력사를 한 화면에서 검색한다.
```

필수 기능:

```txt
검색어 입력
entity_type 필터
상태 필터
검색 결과 목록
마스터 코드 표시
검증 상태 표시
상세 이동
```

검색 대상:

```txt
name
legal_name
alias
identifier normalized_value
representative_name
email/phone 마스킹 표시
```

완료 기준:

```txt
회사명 일부 검색 가능
alias 검색 가능
사업자번호 검색 가능
merged 상태는 기본 제외
include_merged 옵션 지원 검토
```

## 6. 스타트업 마스터 목록

필수 컬럼:

```txt
master_code
name
legal_name
representative_name
business_number
verification_status
status
source_domain
updated_at
```

필수 기능:

```txt
검색
상태 필터
검증 상태 필터
정렬
페이지네이션
신규 생성
상세 이동
```

권한:

```txt
hub read: 목록 조회
hub write: 생성/수정
```

완료 기준:

```txt
read-only 사용자는 생성 버튼 비활성화
사업자번호/전화번호 등 민감 필드는 필요 시 마스킹
모바일에서는 핵심 컬럼만 표시
```

## 7. 스타트업 마스터 상세

필수 섹션:

```txt
기본 정보
식별자
별칭
필드 변경 이력
관련 업무 이력 요약
중복 후보
감사 로그 요약
```

필수 액션:

```txt
기본 정보 수정
식별자 추가
별칭 추가
상태 변경
중복 후보 상세 이동
```

완료 기준:

```txt
변경 시 field_history 기록
민감 변경은 audit log 기록
merged source는 수정 제한
```

## 8. 전문가 마스터

목록 필수 컬럼:

```txt
master_code
name
email
phone
organization
position
expertise_tags
verification_status
status
```

상세 필수 섹션:

```txt
기본 정보
연락처 식별자
전문 분야
소속/직함 이력
관련 평가/멘토링 요약
별칭
```

완료 기준:

```txt
이메일/전화번호 정규화
동명이인 가능성을 고려해 이름만으로 자동 병합하지 않음
```

## 9. 협력사 마스터

목록 필수 컬럼:

```txt
master_code
name
partner_type
business_number
representative_name
verification_status
status
```

상세 필수 섹션:

```txt
기본 정보
기관 유형
식별자
별칭
관련 Project/Fund/M&A 요약
```

완료 기준:

```txt
LP/자문사/수행기관 등 partner_type 관리 가능
사업자번호가 있으면 중복 후보 생성에 강하게 반영
```

## 10. 임시 마스터 생성

사용 경로:

```txt
Hub 직접 생성
Mock Work 신청 흐름
향후 Work/M&A/Fund 등 도메인 앱
```

필수 입력:

```txt
entity_type
name
source_domain
대표자/연락처/이메일 등 가능한 식별 단서
```

처리:

```txt
TEMP master_code 발급
verification_status=pending
normalized 값 생성
identifier/alias 저장
merge_candidates 생성
audit log 기록
```

완료 기준:

```txt
사업자번호가 없어도 생성 가능
생성 직후 검색 가능
유사 기존 마스터가 있으면 후보 생성
```

## 11. 중복 후보 목록

필수 컬럼:

```txt
entity_type
source master
target master
score
reasons
status
created_at
```

필수 기능:

```txt
entity_type 필터
score 범위 필터
status 필터
상세 비교 이동
```

권한:

```txt
master 또는 master_data_merge 권한
외부 사용자 접근 불가
```

완료 기준:

```txt
pending 후보 확인 가능
반려/무시된 후보도 이력으로 조회 가능
```

## 12. 중복 후보 상세/비교

필수 구성:

```txt
좌측 source
우측 target
필드별 비교
식별자 비교
별칭 비교
관련 업무 이력 비교
충돌 경고
병합 후 미리보기
```

필수 액션:

```txt
승인
반려
무시
보류
```

완료 기준:

```txt
이름만 유사한 경우 경고 표시
사업자번호 충돌 시 승인 차단
승인 전 affected_records 표시
```

## 13. 병합 승인

병합 승인 처리:

```txt
source/target lock
대표값 결정
밀려난 값 alias/identifier/history 보존
source status='merged'
source merged_into_id 설정
merge_events 기록(sync_status='pending')
audit_logs 기록
동기 트랜잭션 commit
백그라운드 워커에서 업무 FK를 target으로 순차 업데이트
조회 중에는 resolve helper로 최종 마스터 보장
```

완료 기준:

```txt
1단계 병합 실패 시 source/target 변경 전체 rollback
비동기 반영 전에도 Work mock 신청이 최종 target master로 resolve됨
비동기 반영 완료 후 Work mock 신청 FK가 target으로 이동
merge_events.affected_records 기록
merge_events.sync_status 기록
source 상세에서 target으로 이동 링크 표시
```

## 14. Import Batch 조회

목적:

```txt
기존 스타트업 DB import 결과를 운영자가 확인한다.
```

필수 컬럼:

```txt
source_name
entity_type
total_rows
processed_rows
failed_rows
status
started_at
finished_at
```

상세:

```txt
성공/실패 row 요약
신규 마스터 생성 수
기존 마스터 연결 수
중복 후보 생성 수
실패 사유 목록
```

완료 기준:

```txt
dry-run 결과 확인 가능
실패 row 재처리 기준 확인 가능
```

## 15. Dev 사용자 목록

필수 컬럼:

```txt
name
email
role_key
status
last_sign_in_at
created_at
```

필수 기능:

```txt
검색
역할 필터
상태 필터
사용자 초대
상세 이동
```

권한:

```txt
dev read: 목록 조회
dev write: 초대/수정
```

완료 기준:

```txt
Dev 권한 없는 사용자는 접근 불가
읽기 전용 Dev 사용자는 초대 불가
```

## 16. Dev 사용자 상세

필수 섹션:

```txt
기본 프로필
Auth 계정 상태
도메인별 권한
scope 설정
권한 만료일
권한 변경 이력
```

필수 액션:

```txt
권한 템플릿 적용
도메인별 read/write 변경
scope 변경
expires_at 변경
사용자 비활성화
```

완료 기준:

```txt
권한 변경 시 reason 입력
before/after permission_audit_logs 기록
can_write=true이면 can_read=true 강제
expires_at은 JWT 권한 claim과 RLS helper 만료 검증에 반영
권한 변경 후 대상 사용자의 access token claim 갱신 유도
master 권한 변경은 확인 dialog
```

## 17. 권한 매트릭스 화면

목적:

```txt
사용자별 서비스 권한을 한눈에 관리한다.
```

필수 기능:

```txt
사용자 행
도메인 열
read/write 토글
scope 표시
템플릿 적용
변경 저장
```

완료 기준:

```txt
한 화면에서 과도하게 복잡하면 사용자 상세 중심으로 축소 가능
변경 전/후 diff 표시
저장 후 audit log 기록
```

## 18. 권한 템플릿

초기 템플릿:

```txt
master
executive
management_office
investment_team
business_team
guest_expert
guest_startup
viewer
```

Phase 1 기능:

```txt
템플릿 목록 조회
사용자에게 템플릿 적용
개별 override
```

Phase 1 제외:

```txt
복잡한 템플릿 편집기
승인 워크플로우 기반 권한 요청
```

## 19. 외부 사용자 연결

외부 사용자는 반드시 대상 마스터와 연결된다.

guest_startup:

```txt
user_id -> startup_id
scope_type=company
scope_id=startup_id
```

guest_expert:

```txt
user_id -> expert_id
scope_type=self
배정된 evaluation/mentoring 기준 접근
```

완료 기준:

```txt
외부 사용자는 Hub/Dev 직접 접근 불가
자기 회사/자기 배정 데이터만 조회
타사/타인 데이터 접근 실패 테스트 통과
```

## 20. Work 연결 Mock/Test 화면 또는 Script

Phase 1 필수 검증:

```txt
work 권한 사용자 생성
Mock Work 프로그램 생성
Mock Work 프로그램 모듈 생성
기존 Hub 스타트업 검색
Mock Work 신청 생성
신규 임시 스타트업 생성
중복 후보 생성
병합 승인
Mock Work 신청 FK 이동 확인
Mock Work 커스텀 activity 생성
Mock Work 회의록/첨부파일 연결 확인
audit/merge event 확인
```

Mock Work가 전제로 하는 서비스 구조:

```txt
프로그램은 최상위 실행 단위이다.
프로그램 안에는 모집, 신청자/참여자 관리, 서류평가, 현장평가, 오리엔테이션, 멘토링, 비즈니스 매칭, 데모데이, 성과관리 모듈이 붙을 수 있다.
정형 모듈로 표현하기 어려운 행사는 custom activity로 등록한다.
회의록은 program/module/activity에 연결되는 가벼운 기록이다.
```

회의록 Phase 1/mock 필드:

```txt
title
agenda
discussion
decisions
attachments
created_by
created_at
updated_at
```

회의록 Phase 1/mock 제외:

```txt
참석자 정교 관리
후속 조치
담당자
기한
공개 범위 고급 설정
회의록 전용 감사 로그
```

구현 선택:

```txt
Hub 내부 테스트 화면
scripts/mock-domain/work-application-flow
둘 다 가능
```

완료 기준:

```txt
staging에서 테스트 통과
production에서는 mock 기능 비활성화
```

## 21. 화면별 권한 기준

| 화면 | read 권한 | write 권한 |
| :--- | :--- | :--- |
| Hub Dashboard | hub read | 없음 |
| Master List | hub read | 생성 버튼 |
| Master Detail | hub read | 수정/식별자/별칭 |
| Merge Candidates | merge 권한 | 승인/반려 |
| Import Batches | hub/admin | 재처리 |
| Dev Users | dev read | 초대/수정 |
| Permission Matrix | dev read | 권한 변경 |
| Work Mock Program Flow | work read | mock 프로그램/모듈/신청/activity/회의록 생성 |

## 22. 완료 기준

Phase 1 완료 조건:

```txt
Hub/Dev 로그인 가능
권한 없는 사용자 차단
Hub 마스터 CRUD 가능
식별자/별칭/이력 저장 가능
중복 후보 생성 가능
수동 병합 가능
Dev 사용자 초대/권한 부여 가능
권한 변경 감사 로그 기록
Work mock/test flow 통과
staging smoke test 통과
```

## 23. 테스트 기준

Unit test:

```txt
정규화
식별자 생성
중복 후보 점수
권한 판단 helper
```

RLS test:

```txt
역할별 Hub/Dev 접근
외부 사용자 제한
읽기/쓰기 분리
```

E2E:

```txt
로그인
Hub 마스터 생성
임시 마스터 생성
중복 후보 병합
Dev 권한 변경
Work mock flow
```

## 24. 최종 요약

Phase 1의 Hub/Dev 기능은 다음을 완성해야 한다.

```txt
Hub = 마스터 검색, 등록, 식별자, 별칭, 중복 후보, 병합
Dev = 사용자, 권한 템플릿, 도메인 권한, scope, 감사 로그
공통 = 로그인, 권한 차단, RLS, AppShell, mock Work 연결 검증
```

Phase 1의 성공 기준은 화면 수가 많아지는 것이 아니라, 이후 Work/Fund/M&A/Project/Management가 같은 계약으로 붙을 수 있는 기반이 실제로 검증되는 것이다.
