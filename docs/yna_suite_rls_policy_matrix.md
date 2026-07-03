# Y&A Suite RLS 정책 매트릭스 가이드

본 문서는 Y&A Suite의 Supabase Row Level Security 정책을 테이블별, 역할별, scope별로 정리한다. `yna_suite_auth_permissions.md`가 권한 모델의 원칙을 설명한다면, 이 문서는 실제 RLS 구현과 테스트를 위한 기준표이다.

관련 문서:

```txt
인증/권한 원칙: yna_suite_auth_permissions.md
데이터 모델: yna_suite_data_model.md
보안 정책: yna_suite_security_policy.md
DB 운영: yna_suite_database_operations.md
기존 소스 반영: yna_suite_existing_source_alignment.md
```

## 1. 기본 전제

RLS는 Y&A Suite 보안의 최종 방어선이다.

```txt
UI 권한 처리는 사용자 경험이다.
API 권한 체크는 빠른 차단이다.
RLS는 최종 방어선이다.
```

RLS 원칙:

```txt
기본 deny
명시 허용
read/write 분리
외부 사용자는 self/company scope 제한
service role 우회는 서버 전용 작업에만 허용
```

## 2. 역할 목록

초기 역할은 다음을 기준으로 한다.

| role_key | 설명 |
| :--- | :--- |
| `master` | 최고 관리자 |
| `executive` | 경영진 |
| `management_office` | 경영실/경영지원 |
| `investment_team` | 투자실 |
| `business_team` | 사업부 |
| `guest_expert` | 외부 전문가 |
| `guest_startup` | 참가 스타트업 |
| `viewer` | 제한적 읽기 전용 |
| `no_permission` | 테스트용 권한 없음 |

역할은 기본 템플릿이며, 실제 접근은 `dev.user_permissions`의 도메인 권한과 scope를 함께 판단한다.

## 3. 도메인 권한 기본표

| role_key | hub | dev | work | mna | project | fund | management |
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
R = can_read
RW = can_read + can_write
None = 접근 불가
```

## 4. Scope 의미

| scope_type | 의미 |
| :--- | :--- |
| `none` | 접근 범위 없음 |
| `global` | 전체 데이터 |
| `department` | 특정 부서 범위 |
| `program` | 특정 프로그램 범위 |
| `project` | 특정 프로젝트 범위 |
| `fund` | 특정 펀드 범위 |
| `company` | 특정 스타트업/회사 범위 |
| `self` | 본인에게 직접 연결된 데이터 |

Phase 1 우선 구현:

```txt
global
self
company
```

구조만 준비:

```txt
department
program
project
fund
```

주의:

```txt
현재 dev.user_permissions는 사용자/도메인당 하나의 scope만 저장한다.
한 사용자가 여러 program/fund/project scope를 동시에 가져야 하면 별도 scope 테이블을 추가한다.
```

권장 확장 테이블:

```sql
CREATE TABLE dev.user_permission_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    domain_name VARCHAR(50) NOT NULL,
    scope_type VARCHAR(50) NOT NULL,
    scope_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);
```

## 5. 공통 RLS Helper

RLS 정책은 가능하면 공통 DB function을 사용한다.

필수 helper:

```sql
dev.can_read_domain(target_domain text)
dev.can_write_domain(target_domain text)
dev.get_scope_type(target_domain text)
dev.get_scope_id(target_domain text)
dev.has_role(target_role text)
dev.is_master()
dev.can_merge_master()
```

권장 helper:

```sql
dev.can_read_hub_master(entity_type text, entity_id uuid)
dev.can_write_hub_master(entity_type text, entity_id uuid)
work.can_read_application(application_id uuid)
work.can_write_application(application_id uuid)
work.can_read_program(program_id uuid)
work.can_write_program(program_id uuid)
work.can_read_activity(activity_id uuid)
work.can_write_activity(activity_id uuid)
hub.resolve_merged_master(entity_type text, entity_id uuid)
```

주의:

```txt
RLS function은 SECURITY DEFINER 사용 여부를 신중히 결정한다.
SECURITY DEFINER를 쓰는 경우 search_path를 고정한다.
auth.uid()가 NULL인 경우 false를 반환한다.
매 쿼리마다 dev.user_permissions 테이블을 조인하면 심각한 성능 저하가 발생하므로, RLS 헬퍼 함수는 auth.jwt()의 app_metadata에 캐싱된 권한 JSON(Custom Claims)을 무조인(No-Join)으로 파싱하도록 구현한다.
단, JWT claim 기반 판정에서도 permissions.{domain}.expires_at을 함께 확인한다. 임시 권한은 access token이 아직 유효하더라도 expires_at <= now()이면 read/write/scope helper가 false를 반환해야 한다.
권한 변경·회수 후 즉시 차단이 필요한 경우 짧은 access token TTL, 권한 버전 claim, 세션 무효화 중 하나 이상을 운영 정책으로 함께 적용한다.
```

## 6. Hub 마스터 테이블

대상:

```txt
hub.startups
hub.experts
hub.partners
```

권한 매트릭스:

| 사용자 | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `master` | 전체 | 허용 | 허용 | soft delete만 |
| 내부 `hub:read` | active 중심 전체 | 불가 | 불가 | 불가 |
| 내부 `hub:write` | 전체 | 허용 | 허용 | soft delete만 |
| `guest_startup` | 자기 회사 제한 필드 | 제한적 불가 또는 별도 view | 자기 제출 일부만 | 불가 |
| `guest_expert` | 배정 업무에 연결된 최소 정보 | 불가 | 불가 | 불가 |
| 권한 없음 | 불가 | 불가 | 불가 | 불가 |

RLS 기준:

```txt
SELECT:
  dev.can_read_domain('hub')
  OR work scope를 통해 자기 데이터에 연결된 제한 view

INSERT/UPDATE:
  dev.can_write_domain('hub')

DELETE:
  물리 삭제 금지
  status 변경만 허용
```

외부 사용자 주의:

```txt
외부 사용자는 hub.startups 전체 테이블을 직접 SELECT하지 않는다.
필요하면 별도 view/API에서 허용 필드만 제공한다.
```

## 7. Hub 관리자/심사역 테이블

대상:

```txt
hub.managers
```

권한 매트릭스:

| 사용자 | SELECT | INSERT/UPDATE |
| :--- | :--- | :--- |
| `master` | 전체 | 허용 |
| `management_office` | 전체 또는 HR scope | 허용 |
| 내부 사용자 | 제한된 프로필 조회 | 불가 |
| 외부 사용자 | 배정 업무의 담당자 표시명 수준 | 불가 |

주의:

```txt
퇴사자/비활성 사용자는 로그인 차단과 데이터 표시 정책을 함께 관리한다.
개인 HR 정보는 management.hrm_records에서 별도 제한한다.
```

## 8. Identifier/Alias/History

대상:

```txt
hub.master_identifiers
hub.master_aliases
hub.master_field_history
```

권한 매트릭스:

| 사용자 | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `master` | 전체 | 허용 | 허용 | 제한 |
| `hub:read` 내부 | 마스킹된 값 또는 필요 필드 | 불가 | 불가 | 불가 |
| `hub:write` 내부 | 전체 또는 권한별 마스킹 | 허용 | 허용 | soft delete 권장 |
| 외부 사용자 | 직접 접근 불가 | 불가 | 불가 | 불가 |

주의:

```txt
전화번호/이메일 원본은 개인정보다.
목록에서는 마스킹한다.
identifier_value 전체 조회는 audit log 대상이다.
```

## 9. Merge Candidate/Event

대상:

```txt
hub.merge_candidates
hub.merge_events
```

권한 매트릭스:

| 사용자 | 후보 조회 | 승인/반려 | 병합 이벤트 조회 |
| :--- | :--- | :--- | :--- |
| `master` | 허용 | 허용 | 허용 |
| `hub:write` + merge 권한 | 허용 | 허용 | 허용 |
| `hub:read` | 제한적 조회 가능 또는 불가 | 불가 | 제한적 |
| 외부 사용자 | 불가 | 불가 | 불가 |

RLS 기준:

```txt
merge_candidates SELECT:
  dev.can_merge_master()

merge_candidates UPDATE:
  dev.can_merge_master()

merge_events SELECT:
  dev.can_read_domain('hub')
  단, before/after snapshot 민감 필드 마스킹 고려
```

주의:

```txt
병합 이벤트 snapshot에는 개인정보가 포함될 수 있다.
외부 사용자 접근은 금지한다.
```

## 10. Audit Log

대상:

```txt
hub.audit_logs
dev.permission_audit_logs
```

권한 매트릭스:

| 사용자 | SELECT | INSERT | UPDATE/DELETE |
| :--- | :--- | :--- | :--- |
| `master` | 전체 | 시스템/API만 | 불가 |
| 보안/운영 관리자 | 전체 또는 도메인별 | 시스템/API만 | 불가 |
| 일반 내부 사용자 | 본인 관련 일부 | 불가 | 불가 |
| 외부 사용자 | 불가 | 불가 | 불가 |

원칙:

```txt
audit log는 수정/삭제하지 않는다.
정정이 필요하면 별도 correction log를 남긴다.
```

## 11. Dev 권한 테이블

대상:

```txt
dev.user_permissions
dev.permission_audit_logs
```

권한 매트릭스:

| 사용자 | SELECT | INSERT/UPDATE | DELETE |
| :--- | :--- | :--- | :--- |
| `master` | 전체 | 허용 | 권한 회수 방식 |
| `dev:read` | 전체 조회 | 불가 | 불가 |
| 본인 | 본인 권한 조회 | 불가 | 불가 |
| 외부 사용자 | 본인 권한 조회만 | 불가 | 불가 |

RLS 기준:

```txt
SELECT:
  auth.uid() = user_id
  OR dev.can_read_domain('dev')

INSERT/UPDATE:
  dev.can_write_domain('dev')

DELETE:
  물리 삭제보다 can_read/can_write false 또는 revoke action 기록
```

주의:

```txt
master 권한 부여/회수는 별도 보호 조건을 둔다.
자기 자신의 master 권한 회수는 실수 방지 확인을 둔다.
```

## 12. Work 프로그램

대상:

```txt
work.programs
work.program_modules
```

권한 매트릭스:

| 사용자 | SELECT | INSERT/UPDATE |
| :--- | :--- | :--- |
| `master` | 전체 | 허용 |
| `work:read global` | 전체 | 불가 |
| `work:write global` | 전체 | 허용 |
| `work:read department/program` | scope 내 | 불가 |
| `guest_expert` | 배정된 프로그램 일부 | 불가 |
| `guest_startup` | 참여/신청 가능한 프로그램 일부 | 불가 |

Phase 1:

```txt
실제 Work 운영이 아니라 mock/test flow 중심이다.
그래도 RLS 정책은 Phase 2와 같은 방향으로 검증한다.
program_modules는 상위 program 접근권을 따른다.
custom_event 모듈도 일반 Work 모듈과 같은 권한 기준을 적용한다.
```

## 13. Work 신청/참여자

대상:

```txt
work.applications
work.program_participants
```

권한 매트릭스:

| 사용자 | SELECT | INSERT | UPDATE |
| :--- | :--- | :--- | :--- |
| `master` | 전체 | 허용 | 허용 |
| `work:read global` | 전체 | 불가 | 불가 |
| `work:write global` | 전체 | 허용 | 허용 |
| `business_team` | scope 내 | 허용 | 허용 |
| `guest_startup company` | 자기 회사 신청 | 자기 회사 신청 | 제출 전/허용 상태만 |
| `guest_expert` | 원칙적으로 직접 접근 불가 | 불가 | 불가 |

RLS 기준:

```txt
내부 사용자:
  dev.can_read_domain('work') + scope 조건

참가 스타트업:
  scope_type='company'
  AND scope_id = work.applications.startup_id

쓰기:
  can_write=true
  AND 상태 전이 허용 조건
```

주의:

```txt
평가 점수와 내부 메모는 work.applications에 직접 섞지 않는다.
외부 스타트업이 내부 심사 상태를 임의로 수정할 수 없게 상태 전이 정책을 둔다.
program_participants는 내부 운영자가 관리하고, 외부 사용자는 자기 참여 관계의 허용 필드만 본다.
```

## 14. Work 평가/멘토링

대상:

```txt
work.evaluations
work.mentoring_sessions
```

권한 매트릭스:

| 사용자 | SELECT | INSERT/UPDATE |
| :--- | :--- | :--- |
| 내부 `work:write` | scope 내 | 허용 |
| `guest_expert self` | 본인 배정 건 | 본인 작성 가능 필드 |
| `guest_startup company` | 자기 회사 관련 공개 일정 | 제한 |

RLS 기준:

```txt
guest_expert:
  evaluator_user_id = auth.uid()
  OR expert_id가 auth.uid()와 연결된 hub.experts.id

guest_startup:
  startup_id = scope_id
  단, 내부 점수/메모는 별도 view/API로 숨김
```

## 15. Work 활동/회의록

대상:

```txt
work.program_activities
work.meeting_minutes
hub.attachments 중 domain_name='work'인 회의록 첨부파일
```

권한 매트릭스:

| 사용자 | SELECT | INSERT/UPDATE |
| :--- | :--- | :--- |
| `master` | 전체 | 허용 |
| 내부 `work:read` | scope 내 program/module/activity | 불가 |
| 내부 `work:write` | scope 내 program/module/activity | 허용 |
| `guest_expert self` | 본인 배정 활동 중 공개 가능한 항목 | 제한 |
| `guest_startup company` | 자기 회사가 참여하는 활동 중 공개 가능한 항목 | 제한 |

RLS 기준:

```txt
program_activities:
  work.can_read_program(program_id)
  또는 연결 module의 program_id 기준 scope 확인

meeting_minutes:
  work.can_read_program(program_id)
  단, 외부 사용자는 원칙적으로 직접 접근하지 않는다.

attachments:
  hub.attachments.domain_name='work'
  AND entity_type='meeting_minutes'
  AND 연결 회의록 접근권 확인
```

주의:

```txt
회의록은 Phase 1/2에서 안건, 논의 내용, 결정사항, 첨부파일 중심의 가벼운 기록으로 제한한다.
참석자, 후속 조치, 담당자, 기한, 공개 범위 고급 설정은 초기 RLS 범위에서 제외한다.
회의록이 Hub 마스터 변경의 근거가 되어도 Work가 Hub 마스터를 직접 UPDATE하지 않는다.
```

## 16. Fund/M&A/Project/Management

Phase 1에서는 실제 업무 운영을 하지 않지만, RLS 방향을 준비한다.

기본 정책:

| 도메인 | 내부 접근 | 외부 접근 |
| :--- | :--- | :--- |
| `mna` | domain permission + scope | 불가 |
| `fund` | domain permission + scope | 불가 |
| `project` | domain permission + scope | 원칙적으로 불가 |
| `management` | domain permission + HR 민감도 | 불가 |

주의:

```txt
M&A, Fund, Management는 Restricted 데이터가 많다.
viewer나 executive read라도 필드 마스킹/요약 view를 검토한다.
```

## 17. Attachment

대상:

```txt
hub.attachments
```

권한 매트릭스:

| visibility | 내부 사용자 | 외부 사용자 |
| :--- | :--- | :--- |
| `public` | 허용 | 허용 가능 |
| `internal` | 로그인 내부 사용자 | 불가 |
| `restricted` | 도메인 권한자 | 불가 또는 명시 허용 |
| `owner_only` | 소유자/관리자 | 소유자만 |

RLS 기준:

```txt
SELECT metadata:
  domain permission + visibility 조건

다운로드:
  RLS + API 권한 체크 + signed URL
```

민감 파일 다운로드는 audit log 대상이다.

## 18. Staging/Import 테이블

대상:

```txt
staging.import_batches
staging.*_import_rows
```

권한:

```txt
일반 사용자 접근 불가
마이그레이션 담당자 또는 master만 접근
운영 import script는 service role 가능
```

주의:

```txt
raw_payload에는 개인정보가 포함될 수 있다.
staging도 보안 대상이다.
```

## 19. 테스트 계정 기준

RLS 테스트에는 최소 다음 계정을 사용한다.

```txt
master_user
executive_user
management_office_user
investment_team_user
business_team_user
guest_expert_user
guest_startup_user
viewer_user
no_permission_user
expired_permission_user
```

각 계정에는 테스트 데이터 연결을 명확히 둔다.

```txt
guest_startup_user -> startup_id A
guest_expert_user -> expert_id E
business_team_user -> department D
```

## 20. 필수 테스트 케이스

권한 없는 접근:

```txt
no_permission_user는 모든 업무 테이블 SELECT 실패
권한 없는 도메인 앱 접근 실패
```

읽기/쓰기 분리:

```txt
viewer는 hub SELECT 가능
viewer는 hub UPDATE 실패
executive는 fund SELECT 가능
executive는 fund UPDATE 실패
```

외부 사용자:

```txt
guest_startup은 자기 startup_id 신청만 조회
guest_startup은 타 startup_id 신청 조회 실패
guest_expert는 자기 evaluation만 조회
guest_expert는 타 evaluation 조회 실패
```

병합:

```txt
business_team은 merge_candidates 승인 실패
hub merge 권한자는 승인 가능
병합 후 source master는 merged 상태
업무 FK는 target master로 변경
```

파일:

```txt
restricted 파일은 권한자만 signed URL 발급
민감 파일 다운로드 audit log 생성
```

Work activity/회의록:

```txt
work:read 사용자는 scope 밖 program activity 조회 실패
work:write 사용자는 scope 내 activity와 meeting_minutes 작성 가능
guest_startup은 타 회사가 참여하는 activity 조회 실패
guest_expert는 배정되지 않은 activity 조회 실패
회의록 첨부파일은 회의록 접근권 없으면 signed URL 발급 실패
```

## 21. RLS 작성 체크리스트

새 테이블에 RLS를 만들 때 확인한다.

```txt
RLS가 enable 되었는가?
SELECT/INSERT/UPDATE/DELETE 정책을 분리했는가?
기본 deny가 유지되는가?
domain permission을 확인하는가?
scope 조건이 필요한가?
외부 사용자 접근 가능성이 있는가?
민감 필드는 view/API 분리가 필요한가?
service role 없이 일반 요청이 차단되는가?
테스트 계정별 통과/실패 케이스가 있는가?
```

## 22. 최종 요약

Y&A Suite RLS는 다음 기준을 따른다.

```txt
내부 사용자는 domain permission + scope로 제한한다.
외부 사용자는 self/company scope로 강하게 제한한다.
Hub 마스터 전체 접근은 내부 권한자 중심이다.
병합 후보와 audit log는 관리자 영역이다.
파일과 export는 별도 권한과 audit log를 둔다.
RLS 테스트는 production 배포 전 필수 gate이다.
```

RLS 정책은 한 번 작성하고 잊는 SQL이 아니라, 권한 모델과 데이터 모델이 바뀔 때마다 함께 검증해야 하는 보안 계약이다.
