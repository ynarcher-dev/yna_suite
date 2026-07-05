# Y&ARCHER WORKS API 및 도메인 계약 가이드

본 문서는 Y&ARCHER WORKS Phase 1에서 Hub, Dev, 공통 패키지, 향후 Work 도메인 앱이 서로 같은 방식으로 통신하기 위한 API/RPC 계약을 정의한다.

이 문서의 목적은 화면 구현보다 먼저 **도메인 간 연결 방식**을 고정하는 것이다. 특히 Hub 마스터 검색, 임시 마스터 생성, 중복 후보 생성, 병합 승인, 권한 조회는 여러 앱이 반복해서 사용하므로 구현 전에 계약을 명확히 둔다.

관련 문서:

```txt
1차 범위: yna_suite_phase1_scope.md
데이터 모델: yna_suite_data_model.md
권한/RLS: yna_suite_auth_permissions.md
마스터 정책: yna_suite_master_data_policy.md
DB 운영: yna_suite_database_operations.md
기존 소스 반영: yna_suite_existing_source_alignment.md
```

## 1. 기본 원칙

API 계약은 다음 원칙을 따른다.

```txt
앱은 서로 직접 import하지 않는다.
공통 도메인 로직은 packages/*에 둔다.
DB 최종 권한은 RLS가 판단한다.
서버 API는 RLS를 우회하지 않는 anon/authenticated client를 기본으로 사용한다.
service role은 승인된 관리자 작업과 batch에만 사용한다.
응답 형식, 에러 코드, audit log 기준을 통일한다.
```

Phase 1의 핵심 API 범위:

```txt
Hub 마스터 검색
Hub 임시 마스터 생성
Hub 식별자/별칭 관리
Hub 중복 후보 생성/조회
Hub 병합 승인/반려
Dev 사용자/권한 조회
Dev 권한 변경
Work Program First 연결 mock/test flow
```

## 2. 구현 위치

API/RPC 관련 코드는 다음 위치에 둔다.

```txt
apps/{service}/src/app/api/
  Next.js Route Handler

packages/database/
  Supabase client
  DB response helper

packages/master-data/
  검색, 정규화, 임시 생성, 병합 후보 로직

packages/permissions/
  권한 조회 helper
  UI 권한 helper

supabase/functions 또는 RPC
  트랜잭션이 필요한 DB 작업
  RLS helper function
```

권장 기준:

```txt
단순 조회:
  app route 또는 Supabase query helper

트랜잭션이 필요한 변경:
  Postgres RPC 또는 서버 전용 service function

병합 승인:
  RPC 우선

대량 import/batch:
  script 또는 Edge Function
```

## 3. 공통 요청 규칙

모든 API는 인증된 세션을 기준으로 동작한다.

요청 원칙:

```txt
Authorization은 Supabase Auth 세션을 사용한다.
클라이언트에서 service role key를 보내지 않는다.
도메인 이름은 hub/admin/ac/mna/project/fund/management 중 하나만 사용한다.
entity_type은 startup/expert/partner/manager 중 하나를 우선 사용한다.
UUID는 문자열로 전달한다.
날짜/시간은 ISO 8601 문자열을 사용한다.
```

공통 query parameter:

| 이름 | 의미 |
| :--- | :--- |
| `limit` | 결과 수. 기본 20, 최대 100 |
| `cursor` | cursor 기반 페이지네이션 |
| `q` | 검색어 |
| `status` | 상태 필터 |
| `entity_type` | startup/expert/partner 등 |
| `domain_name` | hub/work/fund 등 |

## 4. 공통 응답 형식

성공 응답:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "req_...",
    "next_cursor": null
  }
}
```

실패 응답:

```json
{
  "ok": false,
  "error": {
    "code": "permission_denied",
    "message": "이 작업을 수행할 권한이 없습니다.",
    "details": {}
  },
  "meta": {
    "request_id": "req_..."
  }
}
```

공통 에러 코드:

| 코드 | 의미 |
| :--- | :--- |
| `unauthenticated` | 로그인 세션 없음 |
| `permission_denied` | 권한 없음 또는 RLS 차단 |
| `validation_failed` | 요청값 검증 실패 |
| `not_found` | 대상 없음 |
| `conflict` | 중복, 상태 충돌, 동시 수정 충돌 |
| `merge_conflict` | 병합 불가 조건 존재 |
| `rate_limited` | 과도한 요청 |
| `internal_error` | 서버 오류 |

## 5. 감사 로그 기준

다음 API는 반드시 audit log를 남긴다.

```txt
권한 변경
관리자 권한 부여/회수
마스터 대표값 변경
임시 마스터 생성
중복 후보 승인/반려
마스터 병합 승인
민감 파일 다운로드
대량 export
service role 기반 작업
```

감사 로그에 남길 항목:

```txt
actor_user_id
domain_name
entity_type
entity_id
action
before_value
after_value
reason
request_id
created_at
```

## 6. Hub 마스터 검색

마스터 검색은 모든 도메인 앱에서 사용할 공통 계약이다.

Endpoint:

```txt
GET /api/hub/master-search
```

Query:

| 이름 | 필수 | 설명 |
| :--- | :--- | :--- |
| `entity_type` | Y | `startup`, `expert`, `partner` |
| `q` | Y | 검색어 |
| `limit` | N | 기본 20 |
| `include_merged` | N | 병합된 source 포함 여부. 기본 false |

응답:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "entity_type": "startup",
        "master_code": "YNA-ST-2026-0001",
        "name": "알파테크",
        "display_label": "알파테크 / 홍길동",
        "verification_status": "verified",
        "status": "active",
        "matched_fields": ["name", "representative_name"],
        "score": 92.5
      }
    ]
  }
}
```

권한:

```txt
내부 사용자:
  hub read 또는 호출 도메인의 read 권한 필요

외부 사용자:
  원칙적으로 전체 Hub 검색 불가
  Work 신청/배정 흐름에서 제한된 검색 API만 허용 가능
```

권장 RPC:

```sql
hub.search_master_candidates(
  target_entity_type text,
  search_query text,
  max_results integer
)
```

## 7. 임시 마스터 생성

검색 결과가 없거나 사용자가 신규 입력을 선택하면 임시 마스터를 생성한다.

Endpoint:

```txt
POST /api/hub/masters/{entity_type}/temporary
```

요청 예시:

```json
{
  "source_domain": "work",
  "source_record_id": "uuid-or-null",
  "name": "알파",
  "legal_name": null,
  "representative_name": "홍길동",
  "phone": "010-1234-5678",
  "email": "hong@example.com",
  "website_url": null,
  "identifiers": [
    {
      "identifier_type": "founder_phone",
      "identifier_value": "010-1234-5678"
    }
  ],
  "aliases": [
    {
      "alias_type": "team_name",
      "alias_value": "알파"
    }
  ]
}
```

응답:

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "entity_type": "startup",
    "master_code": "TEMP-ST-2026-0092",
    "verification_status": "pending",
    "status": "active",
    "merge_candidate_count": 1
  }
}
```

처리 규칙:

```txt
1. 요청값 validation
2. normalized 값 생성
3. hub.{entity} 임시 마스터 생성
4. identifiers/aliases 저장
5. 중복 후보 생성
6. audit log 기록
```

권장 RPC:

```sql
hub.create_temporary_master(
  target_entity_type text,
  payload jsonb
)
```

## 8. 마스터 상세 조회

Endpoint:

```txt
GET /api/hub/masters/{entity_type}/{id}
```

응답 구성:

```txt
master
identifiers
aliases
field_history
related_counts
merge_status
audit_summary
```

권한:

```txt
hub read 필요
외부 사용자는 자기 회사/자기 배정 데이터에 연결된 최소 필드만 별도 endpoint로 제공
```

주의:

```txt
민감 식별자 원본값은 권한에 따라 마스킹한다.
목록과 상세의 노출 필드를 분리한다.
```

## 9. 마스터 수정

Endpoint:

```txt
PATCH /api/hub/masters/{entity_type}/{id}
```

요청 예시:

```json
{
  "name": "알파테크",
  "legal_name": "주식회사 알파테크",
  "representative_name": "홍길동",
  "change_reason": "법인 설립 정보 반영"
}
```

처리 규칙:

```txt
hub write 권한 필요
변경 전후 값을 master_field_history에 기록
민감 필드 변경은 audit log 기록
식별자/별칭은 별도 API로 관리
```

## 10. 식별자 관리

Endpoint:

```txt
POST /api/hub/masters/{entity_type}/{id}/identifiers
PATCH /api/hub/identifiers/{identifier_id}
DELETE /api/hub/identifiers/{identifier_id}
```

식별자 생성 요청:

```json
{
  "identifier_type": "business_number",
  "identifier_value": "123-45-67890",
  "source_domain": "hub",
  "source_label": "관리자 직접 검증",
  "is_primary": true
}
```

규칙:

```txt
identifier_value는 원본 보존
normalized_value는 서버에서 생성
공식 번호와 약한 식별자의 unique 정책은 다르게 적용
primary 변경은 기존 primary 해제를 포함해 트랜잭션으로 처리
```

## 11. 별칭 관리

Endpoint:

```txt
POST /api/hub/masters/{entity_type}/{id}/aliases
DELETE /api/hub/aliases/{alias_id}
```

별칭 생성 요청:

```json
{
  "alias_type": "previous_name",
  "alias_value": "예비창업팀 알파",
  "source_domain": "work"
}
```

규칙:

```txt
alias는 경량 부속 레코드로서 물리 삭제(DELETE)를 허용한다
(soft delete 우선 원칙의 예외 — yna_suite_data_model.md §4.5 삭제 정책 참고).
검색에는 normalized_value를 사용한다.
대표값에서 밀려난 이름은 alias로 보존한다(보존이 목적이면 삭제하지 않는다).
```

## 12. 중복 후보 조회

Endpoint:

```txt
GET /api/hub/merge-candidates
GET /api/hub/merge-candidates/{candidate_id}
```

Query:

| 이름 | 설명 |
| :--- | :--- |
| `entity_type` | startup/expert/partner |
| `status` | pending/approved/rejected/ignored/expired/on_hold |
| `min_score` | 최소 점수 |

목록 응답 item:

```json
{
  "id": "uuid",
  "entity_type": "startup",
  "source_entity": {
    "id": "uuid",
    "master_code": "TEMP-ST-2026-0092",
    "name": "알파"
  },
  "target_entity": {
    "id": "uuid",
    "master_code": "YNA-ST-2026-0001",
    "name": "알파테크"
  },
  "score": 86.0,
  "reasons": ["normalized_name_similar", "representative_name_match"],
  "status": "pending",
  "created_at": "2026-07-03T00:00:00Z"
}
```

권한:

```txt
hub write + master_data_merge 권한
또는 master role
```

## 13. 병합 미리보기

병합 전에는 영향을 받는 업무 레코드를 미리 계산해야 한다.

Endpoint:

```txt
POST /api/hub/merge-candidates/{candidate_id}/preview
```

응답:

```json
{
  "ok": true,
  "data": {
    "source_entity_id": "uuid",
    "target_entity_id": "uuid",
    "field_resolution": {
      "name": {
        "selected": "알파테크",
        "source": "알파",
        "target": "알파테크"
      }
    },
    "affected_records": [
      {
        "table": "ac.applications",
        "record_id": "uuid",
        "field": "startup_id",
        "before": "source-id",
        "after": "target-id"
      }
    ],
    "warnings": []
  }
}
```

## 14. 병합 승인

Endpoint:

```txt
POST /api/hub/merge-candidates/{candidate_id}/approve
```

요청:

```json
{
  "target_entity_id": "uuid",
  "source_entity_id": "uuid",
  "field_policy": {
    "name": "target",
    "legal_name": "source_if_verified",
    "industry": "union"
  },
  "reason": "동일 대표자 및 유사명 확인"
}
```

처리 규칙:

```txt
1. 권한 확인
2. source/target lock
3. 병합 가능 조건 검증
4. before snapshot 생성
5. target 대표값 갱신
6. alias/identifier/history 보존
7. source status='merged', merged_into_id 설정
8. merge_events 기록(sync_status='pending', affected_records 예정값 포함)
9. audit_logs 기록
10. candidate status='approved'
11. 동기 트랜잭션 commit
12. 백그라운드 워커에서 타 도메인 업무 FK를 순차 업데이트
13. FK 업데이트 결과를 merge_events.affected_records/sync_status에 반영
```

권장 RPC:

```sql
hub.approve_merge_candidate(
  candidate_id uuid,
  merge_payload jsonb
)
```

주의:

```txt
병합 승인의 1단계는 반드시 짧은 트랜잭션으로 처리한다.
무거운 업무 FK 업데이트는 동기 트랜잭션에 포함하지 않는다.
비동기 FK 반영 중 조회는 공통 resolved view 또는 resolve helper로 최종 마스터를 보장한다.
업무 도메인 API는 hub 마스터를 직접 조인하며 COALESCE를 반복 작성하지 않고, packages/database의 표준 query helper 또는 DB view를 사용한다.
백그라운드 FK 업데이트가 일부 실패하면 merge_events.sync_status='failed'와 실패 상세를 남기고 재처리 가능해야 한다.
service role 사용 시에도 actor_user_id를 명시적으로 기록한다.
```

## 15. 병합 반려/무시

Endpoint:

```txt
POST /api/hub/merge-candidates/{candidate_id}/reject
POST /api/hub/merge-candidates/{candidate_id}/ignore
```

> 보류(on_hold)는 HTTP 엔드포인트를 두지 않는다 — Hub 검토 화면의 서버 액션 전용이다(Phase 1.10 결정, 이슈27). 외부/도메인 앱이 후보를 보류시킬 일은 없고, 조회는 §12의 `status=on_hold` 필터로 가능하다.

요청:

```json
{
  "reason": "대표자명이 다르고 별도 법인으로 확인"
}
```

규칙:

```txt
반려는 검토 이력으로 남긴다.
무시는 낮은 품질 후보나 반복 노이즈에 사용한다.
반려/무시도 audit log 대상이다.
```

## 16. Dev 권한 조회

Endpoint:

```txt
GET /api/dev/users/{user_id}/permissions
GET /api/dev/me/permissions
```

응답:

```json
{
  "ok": true,
  "data": {
    "user_id": "uuid",
    "domains": {
      "hub": {
        "role_key": "business_team",
        "can_read": true,
        "can_write": false,
        "scope_type": "global",
        "scope_id": null
      },
      "work": {
        "role_key": "business_team",
        "can_read": true,
        "can_write": true,
        "scope_type": "department",
        "scope_id": "uuid"
      }
    }
  }
}
```

> `role_key`는 `admin.user_permissions`의 PK가 (user_id, domain_name)이므로 **도메인별 값**이다. 템플릿을 일괄 적용하면 전 도메인이 같은 값을 갖지만, 개별 override가 가능하므로 응답에서도 도메인 단위로 내려준다.

권한:

```txt
본인 권한 조회:
  authenticated

타인 권한 조회:
  dev read 권한
```

## 17. Dev 권한 변경

Endpoint:

```txt
PUT /api/dev/users/{user_id}/permissions/{domain_name}
```

요청:

```json
{
  "role_key": "business_team",
  "can_read": true,
  "can_write": true,
  "scope_type": "department",
  "scope_id": "uuid",
  "expires_at": null,
  "reason": "사업부 기본 권한 부여"
}
```

처리 규칙:

```txt
dev write 권한 필요
master 권한 변경은 추가 보호를 둔다.
can_write=true이면 can_read=true를 강제한다.
expires_at이 과거이면 거부한다.
JWT app_metadata.permissions.{domain} claim에는 can_read/can_write/scope_type/scope_id/expires_at을 함께 반영한다.
expires_at이 있는 임시 권한은 RLS helper에서 now()와 비교해 만료 즉시 false가 되어야 한다.
권한 변경 후 대상 사용자의 클라이언트가 새 access token을 받도록 세션 갱신을 유도한다.
즉시 회수가 필요한 권한은 짧은 access token TTL, 권한 버전 claim, 세션 무효화 정책 중 하나 이상을 적용한다.
before/after를 permission_audit_logs에 기록한다.
```

## 18. 사용자 초대

Endpoint:

```txt
POST /api/dev/users/invite
```

요청:

```json
{
  "email": "user@example.com",
  "name": "홍길동",
  "role_key": "business_team",
  "permissions": [
    {
      "domain_name": "work",
      "can_read": true,
      "can_write": true,
      "scope_type": "department",
      "scope_id": "uuid"
    }
  ],
  "reason": "신규 사업부 직원 초대"
}
```

규칙:

```txt
Auth 계정 생성/초대와 권한 부여를 하나의 운영 작업으로 기록한다.
실패 시 계정만 생성되고 권한이 누락되지 않게 처리한다.
외부 사용자는 반드시 연결 대상 startup/expert를 함께 지정한다.
```

## 19. Work 연결 Mock/Test Flow 계약

Phase 1에서는 실제 Work 앱을 완성하지 않더라도 도메인 연결 계약을 검증해야 한다. Mock Work는 단순 신청 API가 아니라 Program First 구조를 얇게 재현한다.

Mock flow:

```txt
1. work 권한 사용자 생성
2. Mock Work 프로그램 생성
3. Mock Work 프로그램 모듈 생성
4. Hub 기존 스타트업 생성
5. Mock Work 신청 생성
6. 기존 스타트업 검색 후 연결
7. 유사 신규 스타트업 임시 생성
8. merge_candidates 생성
9. 병합 승인
10. Mock Work 신청 FK가 target master로 변경되는지 확인
11. Mock Work custom activity 생성
12. Mock Work 회의록과 첨부파일 연결 확인
13. merge_events/audit_logs 확인
```

권장 script:

```txt
scripts/mock-domain/work-application-flow
```

Mock API:

```txt
POST /api/mock/work/programs
GET  /api/mock/work/programs
POST /api/mock/work/programs/{program_id}/modules
POST /api/mock/work/applications
GET  /api/mock/work/applications
GET  /api/mock/work/applications/{application_id}   병합 후 resolved_startup_id 확인(step 10)
POST /api/mock/work/activities
POST /api/mock/work/meeting-minutes
```

신청 응답의 병합 반영(핵심 확인점):

```txt
연결한 startup_id 는 병합 후에도 그대로 보존한다(Hub 마스터 직접 수정 금지).
최종 마스터는 resolved_startup_id 로 조회 시 실시간 resolve 한다
(resolveMasterId = COALESCE(merged_into_id, id), master_data_policy §10.3).
GET .../applications/{id} 응답: { startup_id, resolved_startup_id, resolved_master_code, merged, ... }
```

구현(Phase 1.13): Hub 내부 "도메인 연결 테스트" 기능으로 제공한다.
Mock 스토어·API·화면(`/domain-test`)은 `apps/works` 안에 두고 Hub mock 마스터/병합/resolved 를 재사용한다.
ac.* DB 테이블·마이그레이션은 만들지 않는다(in-memory mock, 실제 AC(work) 스키마는 Phase 2 에서 교체).

Mock program 요청 핵심 필드:

```json
{
  "name": "2026 Y&A 테스트 프로그램",
  "start_date": "2026-07-01",
  "end_date": "2026-12-31"
}
```

Mock module 요청 핵심 필드:

```json
{
  "module_type": "recruitment",
  "name": "모집"
}
```

Mock activity 요청 핵심 필드:

```json
{
  "program_id": "uuid",
  "module_id": "uuid-or-null",
  "activity_type": "custom_event",
  "title": "IR 리허설",
  "starts_at": "2026-07-10T10:00:00+09:00"
}
```

Mock meeting minutes 요청 핵심 필드:

```json
{
  "program_id": "uuid",
  "module_id": "uuid-or-null",
  "activity_id": "uuid-or-null",
  "title": "선정위원 사전회의",
  "agenda": "평가 기준 확인",
  "discussion": "운영 방식과 평가표 적용 기준을 논의함",
  "decisions": "동점자는 사업화 가능성 항목을 우선 적용함",
  "attachment_ids": ["uuid"]
}
```

주의:

```txt
이 API는 production에서 비활성화한다.
staging/dev에서만 사용한다.
Mock API도 Dev 권한과 RLS 정책을 우회하지 않는다.
회의록은 안건/논의 내용/결정사항/첨부파일 중심의 가벼운 기록으로 제한한다.
```

## 20. 파일 다운로드 계약

민감 파일 다운로드는 별도 권한 체크와 audit log가 필요하다.

Endpoint:

```txt
POST /api/files/{attachment_id}/download-url
```

응답:

```json
{
  "ok": true,
  "data": {
    "signed_url": "https://...",
    "expires_in_seconds": 300
  }
}
```

규칙:

```txt
영구 public URL 금지
restricted/owner_only 파일은 signed URL 사용
민감 파일 다운로드는 audit log 기록
외부 사용자는 자기 제출 파일 또는 명시 허용 파일만 접근
```

## 21. Export 계약

Export는 데이터 유출 위험이 있으므로 별도 권한으로 관리한다.

Endpoint:

```txt
POST /api/{domain_name}/exports
```

요청:

```json
{
  "entity_type": "startup",
  "filters": {},
  "fields": ["master_code", "name", "representative_name"],
  "mask_personal_data": true,
  "reason": "월간 보고서 작성"
}
```

규칙:

```txt
대량 export는 audit log 필수
개인정보 필드는 기본 마스킹
외부 사용자 전체 목록 export 금지
row 수와 필드 목록을 기록
```

## 22. 버전 관리

API는 breaking change를 피한다.

원칙:

```txt
응답 필드 추가는 허용
필드 제거/이름 변경은 breaking change
새 필드 도입 후 기존 필드는 deprecated 기간을 둔다.
앱 간 계약 변경은 문서와 테스트를 먼저 갱신한다.
```

필요 시 버전 prefix를 사용한다.

```txt
/api/v1/hub/master-search
```

Phase 1에서는 내부 앱 중심이므로 `/api/...`를 기본으로 하되, 외부 공개 API가 생기면 버전 prefix를 도입한다.

## 23. 체크리스트

새 API를 만들 때 확인한다.

```txt
요청/응답 schema가 문서화되었는가?
Zod 또는 서버 validation이 있는가?
필요한 domain permission을 확인하는가?
scope 조건이 필요한가?
RLS가 최종 차단하는가?
service role 사용 여부가 정당한가?
audit log 대상인가?
민감 필드는 마스킹되는가?
에러 코드가 공통 규칙을 따르는가?
테스트 계정으로 접근 테스트를 했는가?
```

## 24. 최종 요약

Y&ARCHER WORKS의 Phase 1 API 계약은 다음을 핵심으로 한다.

```txt
Hub 검색/임시 생성/병합은 모든 도메인 앱의 공통 계약이다.
Dev 권한 조회/변경은 앱 접근의 기준 계약이다.
병합 승인은 짧은 트랜잭션, 비동기 FK 반영, audit log를 필수로 한다.
민감 파일 다운로드와 export는 별도 권한과 로그를 둔다.
실제 보안은 RLS가 최종 보장한다.
```

API는 화면의 편의를 위해 만드는 것이 아니라, Hub/Dev 중심 구조가 Phase 2 이후 도메인 앱까지 흔들리지 않게 만드는 연결 계약이다.
