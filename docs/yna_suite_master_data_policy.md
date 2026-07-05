# Y&ARCHER WORKS 마스터 데이터 및 병합 정책 가이드

> 2026-07-04 아키텍처 개편: 다중 앱 → WORKS 단일 내부 앱 + GUEST 외부 앱. 도메인/스키마 키 work→ac. Hub는 WORKS의 HUB 섹션.

본 문서는 HUB 섹션의 마스터 데이터 생성, 식별, 중복 후보 판단, 병합, 이력 관리 정책을 정의한다.

Y&ARCHER WORKS에서 HUB 섹션은 단순한 통합 목록이 아니라 전사 공통 자원에 대한 **신뢰 가능한 마스터 원장**이다. AC, M&A, Project, Fund, Management 섹션은 각자의 업무 데이터를 관리하지만, 스타트업/전문가/협력사 같은 공통 자원은 Hub 마스터를 참조한다.

## 1. 핵심 전제

Y&A 업무 특성상 스타트업, 전문가, 협력사는 사업자등록번호나 법인번호 같은 공식 식별자가 없는 상태로 유입되는 경우가 많다.

따라서 Y&ARCHER WORKS의 식별 정책은 다음 전제를 따른다.

```txt
식별자는 공식 번호 하나가 아니라, 동일 대상을 추정하거나 확정하는 여러 단서의 집합이다.
공식 번호가 없는 상태를 예외가 아니라 정상 케이스로 본다.
자동 생성은 허용하되, 자동 병합은 보수적으로 운영한다.
최신 대표값과 과거 이력값을 분리해서 관리한다.
병합은 삭제가 아니라 관계 정리와 이력 보존이다.
```

## 2. 마스터 데이터의 정의

마스터 데이터는 여러 서비스에서 공통으로 참조하는 전사 핵심 자원이다.

1차 마스터 자원:

```txt
스타트업 / 기업
전문가 / 멘토 / 평가위원
협력사 / 기관 / LP / 자문사
심사역 / 내부 사용자 프로필
```

마스터 데이터는 `hub` 스키마가 소유한다.

```txt
hub.startups
hub.experts
hub.partners
hub.managers
```

각 업무 앱은 자체 스타트업/전문가/협력사 테이블을 별도로 만들지 않고 Hub 마스터를 참조한다.

예시:

```sql
ac.applications.startup_id -> hub.startups.id
mna.deals.startup_id -> hub.startups.id
fund.investments.startup_id -> hub.startups.id
fund.limited_partners.partner_id -> hub.partners.id
```

## 3. 식별자의 개념

Y&ARCHER WORKS에서 식별자는 공식 번호만을 의미하지 않는다.

```txt
식별자(identifier)
= 어떤 대상을 같은 사람/기업/기관으로 추정하거나 확정하는 데 쓰는 모든 단서
```

### 3.1 스타트업 식별 단서

```txt
사업자등록번호
법인등록번호
팀명
법인명
브랜드명
대표자명
대표자 휴대폰
대표자 이메일
신청자 이메일
웹사이트 도메인
IR 자료에 적힌 회사명
담당 심사역이 알고 있는 별칭
과거 예비창업팀명
외부 엑셀/시트 row ID
```

### 3.2 전문가 식별 단서

```txt
이름
이메일
휴대폰 번호
소속 기관
직함
전문 분야
프로그램 배정 이력
외부 명단 row ID
```

### 3.3 협력사 식별 단서

```txt
사업자등록번호
법인등록번호
기관명
약칭
대표자명
주소
웹사이트 도메인
담당자 이메일
LP 등록 이력
자문/컨소시엄 참여 이력
```

## 4. 식별자 강도

식별자는 신뢰도에 따라 강도를 나눈다.

### 4.1 강한 식별자

```txt
사업자등록번호
법인등록번호
검증된 공식 웹사이트 도메인
검증된 대표 이메일
검증된 대표 휴대폰
```

강한 식별자가 일치하면 동일 대상일 가능성이 높다. 단, 전화번호/이메일은 개인용인지, 회사 대표용인지에 따라 신뢰도가 달라질 수 있다.

### 4.2 중간 식별자

```txt
대표자명 + 전화번호
대표자명 + 이메일
팀명 + 대표자명
회사명 + 웹사이트 도메인
IR 자료 내 회사명 + 대표자명
이름 + 소속 + 직함
기관명 + 주소
기관명 + 대표자명
```

중간 식별자는 단독으로 확정하지 않고, 여러 단서를 조합해 후보 점수를 만든다.

### 4.3 약한 식별자

```txt
회사명/팀명 유사
브랜드명 유사
이름만 일치
담당자명 유사
신청자 이메일 도메인 유사
산업 분야 유사
```

약한 식별자는 자동 병합 근거로 쓰지 않는다. 후보 추천 또는 검색 보조에만 사용한다.

## 5. 식별자 저장 정책

식별 단서는 `hub.master_identifiers`에 저장한다.

```sql
CREATE TABLE hub.master_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 식별자 레코드 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner 등 대상 종류
    entity_id UUID NOT NULL,                                  -- 대상 마스터 ID
    identifier_type VARCHAR(50) NOT NULL,                     -- business_number/email/phone/domain 등
    identifier_value TEXT NOT NULL,                           -- 원본 식별자 값
    normalized_value TEXT NOT NULL,                           -- 비교/중복 판단용 정규화 값
    confidence_score NUMERIC(5, 2) NULL,                      -- 식별자 자체의 신뢰도
    source_domain VARCHAR(50) NULL,                           -- work/fund/mna/import 등 유입 출처
    source_label TEXT NULL,                                   -- 행사명, 엑셀 파일명, 프로그램명 등 출처 설명
    is_primary BOOLEAN DEFAULT FALSE,                         -- 대표 식별자 여부
    verified_status VARCHAR(50) DEFAULT 'unverified',          -- unverified/verified/rejected
    verified_by UUID REFERENCES auth.users(id),                -- 검증자
    verified_at TIMESTAMPTZ NULL,                              -- 검증 시각
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 등록 시각
    created_by UUID REFERENCES auth.users(id)                  -- 등록자
);
```

식별자 타입 예시:

```txt
business_number
corporation_number
founder_phone
founder_email
applicant_email
website_domain
brand_name
team_name
previous_name
external_sheet_id
source_row_hash
```

주의:

```txt
identifier_value는 원본 보존용이다.
normalized_value는 비교용이다.
전화번호, 이메일, 도메인은 반드시 정규화한다.
사업자번호/법인번호가 없어도 master_identifiers는 충분히 의미가 있다.
```

## 6. 이름과 별칭 관리

이름 변경, 과거명, 약칭, 오탈자, 브랜드명은 `hub.master_aliases`에 저장한다.

```sql
CREATE TABLE hub.master_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- alias 레코드 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner
    entity_id UUID NOT NULL,                                  -- 대상 마스터 ID
    alias_value TEXT NOT NULL,                                -- 과거명, 약칭, 영문명, 브랜드명 등
    normalized_value TEXT NOT NULL,                           -- 검색/비교용 정규화 값
    alias_type VARCHAR(50) NOT NULL,                          -- previous_name/short_name/brand_name 등
    source_domain VARCHAR(50) NULL,                           -- alias가 유입된 서비스
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 등록 시각
    created_by UUID REFERENCES auth.users(id)                  -- 등록자
);
```

alias 타입 예시:

```txt
previous_name
short_name
english_name
brand_name
team_name
typo
legal_name
```

예시:

```txt
예비창업팀 알파
알파
알파테크
주식회사 알파테크
Alpha Tech
```

## 7. 마스터 생성 경로

스타트업/전문가/협력사는 여러 서비스에서 생성될 수 있다.

```txt
HUB 섹션
AC 섹션 (구 Y&A Work)
M&A 섹션
PROJECT 섹션
FUND 섹션
대량 엑셀/시트 import
```

하지만 실제 마스터 생성 위치는 항상 Hub이다.

```txt
AC 섹션 화면에서 신규 스타트업 입력
-> hub.startups에 pending/temporary 마스터 생성
-> ac.applications.startup_id가 해당 hub.startups.id 참조
-> Hub 병합 후보 큐에 올라감
```

업무 앱은 자체 마스터 테이블을 만들지 않는다.

피해야 할 구조:

```txt
ac.startups 별도 생성
hub.startups 별도 생성
나중에 두 DB 동기화
```

권장 구조:

```txt
ac.applications.startup_id -> hub.startups.id
```

## 8. 기존 DB와 AC 신청 연결 시나리오

기존 스타트업 DB에 이미 회사가 있는 경우:

```txt
hub.startups
- id: A
- master_code: YNA-ST-2026-0001
- name: 알파테크
- representative_name: 홍길동
- business_number: NULL
- status: active
```

AC 프로그램 신청에서 같은 스타트업이 신청한다.

```txt
신청 입력값:
- 회사명: 알파테크
- 대표자명: 홍길동
- 신청자 이메일: hong@example.com
- 연락처: 010-1234-5678
- 사업자번호: 없음
```

정상 흐름:

```txt
1. AC 신청 화면에서 회사명 입력
2. Hub 마스터를 먼저 검색
3. 기존 스타트업 후보를 추천
4. 사용자가 기존 스타트업을 선택
5. ac.applications.startup_id = hub.startups.id 로 연결
6. AC 신청 이력이 기존 Hub 마스터의 생애 이력으로 쌓임
```

SQL 관점:

```sql
INSERT INTO ac.applications (
    program_id,
    startup_id,
    applicant_user_id,
    application_status
) VALUES (
    '{program_id}',
    '{existing_hub_startup_id}', -- 기존 Hub 마스터 ID
    '{applicant_user_id}',
    'submitted'
);
```

이 경우 신규 마스터를 생성하지 않는다.

## 9. 기존 대상인지 애매한 경우

사용자가 추천 후보를 놓치거나 이름이 다르게 들어올 수 있다.

예시:

```txt
기존 DB:
알파테크

AC 신청:
주식회사 알파테크
알파테크 주식회사
알파 Tech
알파
```

처리 흐름:

```txt
1. AC 섹션에서 신청 데이터 입력
2. Hub 검색에서 명확한 일치가 없으면 임시 Hub 마스터 생성
3. ac.applications는 일단 임시 startup_id에 연결
4. Hub가 기존 스타트업과 유사도 후보를 생성
5. Hub 관리자에게 병합 후보로 표시
6. 관리자가 확인 후 병합 승인
7. AC 신청 이력은 최종 Hub 마스터에 귀속
```

임시 마스터 예시:

```txt
hub.startups
- id: TEMP_ID
- master_code: TEMP-ST-2026-0092
- name: 알파
- source_domain: ac
- verification_status: pending
- status: active
```

## 10. 병합 처리 방식

병합 처리에는 두 가지 방식이 있다.

### 10.1 FK 직접 업데이트 방식

```txt
병합 전:
ac.applications.startup_id = TEMP_ID

병합 후:
ac.applications.startup_id = MASTER_ID
```

장점:

```txt
조회가 단순하다.
업무 테이블이 항상 최종 마스터를 직접 참조한다.
```

단점:

```txt
병합 시 관련 테이블의 FK를 모두 업데이트해야 한다.
어떤 레코드가 원래 TEMP_ID를 참조했는지 별도 이력이 필요하다.
```

### 10.2 merged_into_id 추적 방식

```txt
hub.startups TEMP_ID
- status = merged
- merged_into_id = MASTER_ID

ac.applications.startup_id = TEMP_ID 유지
```

장점:

```txt
원래 입력 당시의 연결이 보존된다.
병합 이력 추적이 쉽다.
```

단점:

```txt
조회 시 항상 최종 마스터 resolve 로직이 필요하다.
보고서/검색 쿼리가 복잡해진다.
```

### 10.3 권장 방식: 혼합형 (최적화)

Y&ARCHER WORKS는 혼합형을 기본으로 하되, **DB 락 병목 완화 정책**을 적용한다.

```txt
1. [동기 처리] 병합 승인 시점에는 source 마스터의 status='merged' 변경과 merged_into_id = target_id 설정만 빠른 단일 트랜잭션으로 커밋하여 락 유발을 최소화한다.
2. [비동기 처리] 타 도메인 스키마(work, mna 등)의 무거운 외래키(FK) 일괄 업데이트는 pg_net 비동기 쿼리 또는 Supabase Edge Function의 백그라운드 워커를 통해 순차적(Eventual Consistency)으로 실행한다.
3. [실시간 Resolve] 비동기 동기화가 진행 중인 동안, 모든 비즈니스 조회 쿼리는 공통 resolved view 또는 resolve helper를 경유하여 최종 마스터 데이터를 보장한다.
4. [이력 보존] merge_events에 변경 전후 스냅샷과 비동기 업데이트 완료 상태를 기록하고, audit_logs에 병합 주체를 남긴다.
```

구현 표준:

```txt
업무 도메인 앱(work, mna, fund 등)은 hub.startups/hub.experts/hub.partners를 직접 조인하면서 COALESCE를 반복 작성하지 않는다.
packages/database 또는 DB schema에 resolved view/helper를 제공하고, 업무 조회는 이를 통해 source_id와 resolved_id를 함께 얻는다.
COALESCE(merged_into_id, id)는 공통 view/helper 내부 구현으로 숨긴다.
최종 마스터의 이름·식별자·상태 같은 필드가 필요하면 resolved_id로 target master row에 다시 조인한다.
```

예시:

```sql
CREATE OR REPLACE VIEW hub.resolved_startups AS
SELECT
    source.id AS source_startup_id,
    COALESCE(source.merged_into_id, source.id) AS resolved_startup_id,
    target.name AS resolved_name,
    target.status AS resolved_status
FROM hub.startups source
JOIN hub.startups target
  ON target.id = COALESCE(source.merged_into_id, source.id);
```

예시:

```txt
병합 전:
hub.startups TEMP_ID = "알파"
hub.startups MASTER_ID = "알파테크"
ac.applications.startup_id = TEMP_ID

병합 승인 후 (동기):
hub.startups TEMP_ID.status = merged
hub.startups TEMP_ID.merged_into_id = MASTER_ID

병합 반영 완료 후 (백그라운드 비동기):
ac.applications.startup_id = MASTER_ID
hub.merge_events에 affected_records 완료 상태 기록
```

## 11. 병합 이벤트 확장 모델

병합 이벤트에는 영향을 받은 업무 레코드도 함께 기록한다.

```sql
CREATE TABLE hub.merge_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 병합 이벤트 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner
    source_entity_id UUID NOT NULL,                           -- 병합되어 비활성화되는 레코드
    target_entity_id UUID NOT NULL,                           -- 최종으로 남는 마스터 레코드
    merge_policy JSONB DEFAULT '{}'::jsonb,                   -- 필드별 우선순위/승계 정책
    affected_records JSONB DEFAULT '[]'::jsonb,               -- FK가 변경된 업무 레코드 목록
    before_snapshot JSONB NOT NULL,                           -- 병합 전 데이터 스냅샷
    after_snapshot JSONB NOT NULL,                            -- 병합 후 데이터 스냅샷
    sync_status VARCHAR(50) DEFAULT 'pending',                 -- 비동기 동기화 상태: pending/processing/completed/failed
    reason TEXT NULL,                                         -- 병합 사유
    approved_by UUID REFERENCES auth.users(id),                -- 병합 승인자
    created_at TIMESTAMPTZ DEFAULT now()                       -- 병합 시각
);
```

> `sync_status`는 2단계 비동기 병합(§"병합 실행")에서 백그라운드 FK 동기화 진행 상태를 추적한다. DDL 기준 문서는 `yna_suite_data_model.md` §4.9.

`affected_records` 예시:

```json
[
  {
    "table": "ac.applications",
    "record_id": "application-id",
    "field": "startup_id",
    "before": "TEMP_ID",
    "after": "MASTER_ID"
  },
  {
    "table": "ac.mentoring_sessions",
    "record_id": "session-id",
    "field": "startup_id",
    "before": "TEMP_ID",
    "after": "MASTER_ID"
  },
  {
    "table": "ac.program_participants",
    "record_id": "participant-id",
    "field": "startup_id",
    "before": "TEMP_ID",
    "after": "MASTER_ID"
  }
]
```

## 12. 필드 이력 관리

마스터의 대표값이 변경될 때는 변경 이력을 남긴다.

```sql
CREATE TABLE hub.master_field_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 필드 변경 이력 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner
    entity_id UUID NOT NULL,                                  -- 대상 마스터 ID
    field_name VARCHAR(100) NOT NULL,                         -- 변경된 필드명
    old_value TEXT NULL,                                      -- 이전 값
    new_value TEXT NULL,                                      -- 새 값
    source_domain VARCHAR(50) NULL,                           -- 변경 출처
    changed_by UUID REFERENCES auth.users(id),                 -- 변경자
    changed_at TIMESTAMPTZ DEFAULT now(),                     -- 변경 시각
    change_reason TEXT NULL                                   -- 변경 사유
);
```

이력 관리가 필요한 변경:

```txt
예비창업팀명 -> 법인명
대표자 개인번호 -> 회사 대표번호
개인 이메일 -> 회사 도메인 이메일
IR 자료명 -> 브랜드명 -> 법인명
사업자번호 없음 -> 사업자번호 생김
대표자 변경
주소 변경
```

## 13. 중복 후보 점수 정책

공식 번호가 없는 경우 자동 병합하지 않고 후보로 제안한다.

기본 점수 기준:

| 점수 | 의미 | 처리 |
| :--- | :--- | :--- |
| 95 이상 | 강한 식별자 일치 | 자동 연결 가능, 병합은 관리자 승인 권장 |
| 80-94 | 여러 중간 단서 일치 | 병합 후보 생성, 운영자 검토 필수 |
| 60-79 | 약한 후보 | 후보로 표시, 자동 병합 금지 |
| 60 미만 | 낮은 유사도 | 신규 마스터 유지 |

보수적 원칙:

```txt
공식 번호가 없으면 자동 병합하지 않는다.
높은 점수라도 운영자 승인 큐로 보낸다.
이름만 유사하면 자동 병합하지 않는다.
충돌 정보가 있으면 자동 병합하지 않는다.
```

충돌 정보 예시:

```txt
대표자명이 명확히 다름
이메일 도메인이 명확히 다름
사업자번호가 서로 다름
법인번호가 서로 다름
검증된 전화번호가 서로 다름
```

## 14. 병합 시 필드 우선순위

병합은 단순 덮어쓰기가 아니다. 대표값은 우선순위에 따라 정하고, 밀려난 값은 alias, identifier, field_history로 보존한다.

### 14.1 스타트업

```txt
사업자번호:
  공식 법인 정보 우선

법인명:
  verified 상태의 Hub 마스터 우선
  없으면 최신 공식 입력값

대표자명:
  공식 법인 정보 우선
  과거 대표자명은 history로 보존

연락처:
  검증된 값 우선
  충돌 시 primary 하나만 지정하고 나머지는 identifiers에 보존

산업/태그:
  덮어쓰기보다 union 병합

과거 팀명/브랜드명:
  aliases로 보존
```

### 14.2 전문가

```txt
이름:
  검증된 최신 이름 우선

이메일/전화번호:
  검증된 primary 우선
  과거 연락처는 identifiers에 보존

소속/직함:
  최신 검증값 우선
  과거 소속은 field_history에 보존

전문 분야:
  union 병합 후 중복 제거
```

### 14.3 협력사

```txt
기관명:
  공식명 우선

사업자번호/법인번호:
  검증된 값 우선

대표자명/주소:
  최신 공식 정보 우선

기관 약칭/브랜드명:
  aliases로 보존

LP/자문사/수행기관 역할:
  partner_type 또는 관계 테이블에서 보존
```

## 15. Hub 병합 후보 운영 화면

Hub에는 병합 후보 검토 화면이 필요하다.

필수 기능:

```txt
후보 목록
유사도 점수
매칭 사유
좌우 비교
필드별 대표값 선택
관련 업무 이력 표시
승인 / 반려 / 보류 / 무시
병합 후 미리보기
감사 로그 기록
```

검토 화면에서 보여야 할 정보:

```txt
마스터 코드
현재 이름
과거 이름/별칭
대표자명
연락처
이메일
웹사이트
유입 출처
관련 AC 신청 수
관련 M&A 딜 수
관련 Fund 투자 수
관련 Project 수
최근 수정일
```

## 16. UX 원칙

AC, M&A, Project, Fund 섹션에서 새로운 자원을 입력할 때는 항상 Hub 검색을 먼저 수행한다.

```txt
1. 자동완성 검색 우선
2. 기존 마스터 선택
3. 없으면 신규 임시 마스터 생성
4. 생성 즉시 업무 레코드와 연결
5. Hub 검증/병합 큐로 전송
```

사용자의 업무 흐름은 막지 않는다.

```txt
중복 여부가 확실하지 않아도 신청/등록은 완료 가능해야 한다.
단, 데이터는 pending/temporary 상태로 Hub에 들어간다.
Hub 운영자가 나중에 정제한다.
```

AC 회의록/활동 기록 주의:

```txt
program_activities와 meeting_minutes는 AC 실행 기록이다.
회의록에 스타트업/전문가/협력사 변경 단서가 적혀도 Hub 마스터를 직접 수정하지 않는다.
필요하면 Hub 임시 마스터, 병합 후보, correction request 흐름으로 연결한다.
```

## 17. RLS 및 권한

마스터 병합은 권한이 높은 사용자만 수행한다.

권장 권한:

```txt
Hub write 권한 + master_data_merge 권한
또는 master role
```

외부 사용자는 마스터 병합 후보를 볼 수 없다.

```txt
guest_expert: 병합 후보 접근 불가
guest_startup: 병합 후보 접근 불가
viewer: 병합 후보 접근 불가
```

## 18. 최종 요약

Y&ARCHER WORKS의 마스터 데이터 정책은 다음을 기준으로 한다.

```txt
식별자는 공식 번호가 아니라 식별 단서의 집합이다.
사업자번호/법인번호가 없는 상태를 정상 케이스로 본다.
모든 업무 앱은 Hub 마스터를 참조한다.
신규 입력은 Hub 임시 마스터로 생성한다.
자동 병합은 보수적으로 제한한다.
공식 번호가 없으면 운영자 승인 중심으로 병합한다.
병합은 삭제가 아니라 이력 있는 연결 정리다.
주요 업무 FK는 최종 마스터로 업데이트하되, merge_events에 변경 이력을 남긴다.
대표값에서 밀려난 값은 aliases, identifiers, field_history에 보존한다.
```

이 정책의 목적은 데이터 입력을 막는 것이 아니라, 실무 편의와 전사 데이터 신뢰도를 동시에 확보하는 것이다.
