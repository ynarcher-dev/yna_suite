# Y&A Suite 데이터 모델 설계 가이드

본 문서는 Y&A Suite의 주요 데이터 모델과 테이블 설계 기준을 정의한다. 상위 기획서의 논리 스키마 구조를 실제 구현 가능한 수준으로 구체화하는 것을 목표로 한다.

Y&A Suite는 하나의 Supabase Postgres를 사용하되, 서비스 도메인별 논리 스키마와 이관용 `staging` 스키마를 분리한다.

```txt
hub
dev
staging
work
mna
project
fund
management
```

## 1. 설계 원칙

데이터 모델은 다음 원칙을 따른다.

1. 내부 PK는 UUID를 사용한다.
2. 사람이 보는 코드는 `master_code`, `display_code` 같은 별도 unique 필드로 둔다.
3. 스타트업, 전문가, 협력사 같은 전사 공통 자원은 `hub` 스키마가 소유한다.
4. 각 업무 스키마는 Hub 마스터를 FK로 참조한다.
5. 삭제보다 상태 변경과 이력 보존을 우선한다.
6. 병합, 승인, 권한 변경, 삭제성 액션은 감사 로그를 남긴다.
7. 모든 업무 테이블은 RLS 적용을 전제로 설계한다.

## 2. 공통 컬럼 규칙

대부분의 업무 테이블은 아래 공통 컬럼을 가진다.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 내부 시스템 식별자. 외부 노출용 코드와 분리한다.
created_at TIMESTAMPTZ DEFAULT now(),          -- 최초 생성 시각
updated_at TIMESTAMPTZ DEFAULT now(),          -- 마지막 수정 시각
created_by UUID REFERENCES auth.users(id),     -- 생성 사용자. 감사/RLS 판단에 사용한다.
updated_by UUID REFERENCES auth.users(id),     -- 마지막 수정 사용자
status VARCHAR(50) DEFAULT 'active'            -- soft delete, 보관, 병합 상태 등을 표현한다.
```

권장 상태값:

```txt
draft
pending
active
inactive
archived
rejected
deleted
merged
```

주의:

```txt
물리 삭제는 최소화한다.
사용자에게 삭제처럼 보이는 동작도 status='deleted' 또는 archived_at으로 처리한다.
법적/보안상 완전 삭제가 필요한 데이터는 별도 정책을 둔다.
```

## 3. ID와 코드 정책

DB 내부 식별자는 UUID를 사용한다.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid() -- 내부 FK 연결에 사용하는 안정적인 식별자
```

사람이 보는 코드는 별도 필드로 둔다.

```sql
master_code VARCHAR(50) UNIQUE NOT NULL -- 사용자/보고서/엑셀에서 보는 업무 식별 코드
```

예시:

```txt
YNA-ST-2026-0001  스타트업
YNA-EX-2026-0042  전문가
YNA-PT-2026-0012  협력사
TEMP-ST-2026-0092 임시 스타트업
```

이렇게 분리하는 이유:

```txt
UUID는 안정적인 내부 PK로 사용한다.
master_code는 보고서, 검색, 엑셀 다운로드, 사용자 커뮤니케이션에 사용한다.
코드 체계가 바뀌어도 내부 FK를 흔들지 않는다.
병합 시에도 참조 무결성을 유지하기 쉽다.
```

## 4. `hub` 스키마

`hub`는 전사 마스터 데이터와 통합 검색의 중심이다.

주요 자원:

```txt
스타트업
전문가
협력사
심사역/내부 사용자 프로필
마스터 코드
별칭/식별자
병합 후보
병합 이력
```

### 4.1 `hub.startups`

스타트업/기업 마스터 원장이다.

```sql
CREATE TABLE hub.startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 PK. 다른 업무 테이블이 참조하는 기준 ID
    master_code VARCHAR(50) UNIQUE NOT NULL,                  -- 사람이 보는 전사 스타트업 코드
    name TEXT NOT NULL,                                       -- 현재 표시명. 예비창업팀명도 여기에 저장 가능
    legal_name TEXT NULL,                                     -- 법인 설립 후 공식 법인명
    normalized_name TEXT NOT NULL,                            -- 검색/중복 판단용 정규화 이름
    business_number VARCHAR(50) NULL,                         -- 사업자등록번호. 예비창업자는 NULL 가능
    corporation_number VARCHAR(50) NULL,                      -- 법인등록번호
    representative_name TEXT NULL,                            -- 대표자명. 예비창업 단계 중복 판단에 중요
    phone TEXT NULL,                                          -- 대표 연락처
    email TEXT NULL,                                          -- 대표 이메일 또는 회사 이메일
    website_url TEXT NULL,                                    -- 홈페이지 URL
    address TEXT NULL,                                        -- 본점/사업장 주소
    industry TEXT NULL,                                       -- 산업 분류 또는 내부 태그
    stage VARCHAR(50) NULL,                                   -- 예비창업, Seed, Series A 등 성장 단계
    source_domain VARCHAR(50) NULL,                           -- 최초 유입 서비스(work, fund, mna 등)
    source_record_id UUID NULL,                               -- 최초 유입 서비스의 원본 레코드 ID
    verification_status VARCHAR(50) DEFAULT 'pending',         -- pending/verified/rejected/needs_review/temporary 등 마스터 검증 상태
    status VARCHAR(50) DEFAULT 'active',                       -- active/merged/archived/deleted 등 생명주기 상태
    merged_into_id UUID REFERENCES hub.startups(id),           -- 병합된 경우 최종 마스터 ID
    created_by UUID REFERENCES auth.users(id),                 -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                 -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                      -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                       -- 수정 시각
);
```

권장 인덱스:

```sql
CREATE UNIQUE INDEX startups_business_number_uq
ON hub.startups (business_number)
WHERE business_number IS NOT NULL; -- 사업자번호가 있는 법인은 중복 생성을 방지한다.

CREATE INDEX startups_normalized_name_idx
ON hub.startups (normalized_name); -- 자동완성/유사도 검색 성능을 위한 인덱스

CREATE INDEX startups_status_idx
ON hub.startups (status); -- active/merged/archived 목록 필터링용
```

### 4.2 `hub.experts`

전문가, 멘토, 평가위원 마스터 원장이다.

```sql
CREATE TABLE hub.experts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 전문가 ID
    master_code VARCHAR(50) UNIQUE NOT NULL,                  -- 사람이 보는 전사 전문가 코드
    name TEXT NOT NULL,                                       -- 전문가 이름
    normalized_name TEXT NOT NULL,                            -- 검색/중복 판단용 이름
    email TEXT NULL,                                          -- 전문가 이메일. 중복 판단 보조 식별자
    phone TEXT NULL,                                          -- 전문가 연락처
    organization TEXT NULL,                                   -- 소속 기관/회사
    position TEXT NULL,                                       -- 직책/직함
    expertise_tags TEXT[] DEFAULT '{}',                       -- 전문 분야 태그
    source_domain VARCHAR(50) NULL,                           -- 최초 유입 서비스
    source_record_id UUID NULL,                               -- 최초 유입 원본 레코드 ID
    verification_status VARCHAR(50) DEFAULT 'pending',         -- pending/verified/rejected/needs_review/temporary 등 Hub 검증 상태
    status VARCHAR(50) DEFAULT 'active',                       -- active/merged/archived 등
    merged_into_id UUID REFERENCES hub.experts(id),            -- 병합된 경우 최종 전문가 ID
    created_by UUID REFERENCES auth.users(id),                 -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                 -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                      -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                       -- 수정 시각
);
```

### 4.3 `hub.partners`

협력사, 자문사, LP, 기관 파트너 등 조직 단위 자원이다.

```sql
CREATE TABLE hub.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 협력사 ID
    master_code VARCHAR(50) UNIQUE NOT NULL,                  -- 사람이 보는 전사 협력사 코드
    name TEXT NOT NULL,                                       -- 협력사/기관명
    normalized_name TEXT NOT NULL,                            -- 검색/중복 판단용 이름
    partner_type VARCHAR(50) NULL,                            -- LP, 자문사, 수행기관, 컨소시엄 파트너 등
    business_number VARCHAR(50) NULL,                         -- 사업자등록번호
    representative_name TEXT NULL,                            -- 대표자명
    phone TEXT NULL,                                          -- 대표 연락처
    email TEXT NULL,                                          -- 대표 이메일
    website_url TEXT NULL,                                    -- 홈페이지 URL
    address TEXT NULL,                                        -- 주소
    source_domain VARCHAR(50) NULL,                           -- 최초 유입 서비스
    source_record_id UUID NULL,                               -- 최초 유입 원본 레코드 ID
    verification_status VARCHAR(50) DEFAULT 'pending',         -- pending/verified/rejected/needs_review/temporary 등 Hub 검증 상태
    status VARCHAR(50) DEFAULT 'active',                       -- active/merged/archived 등
    merged_into_id UUID REFERENCES hub.partners(id),           -- 병합된 경우 최종 협력사 ID
    created_by UUID REFERENCES auth.users(id),                 -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                 -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                      -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                       -- 수정 시각
);
```

### 4.4 `hub.managers`

내부 임직원/심사역 프로필이다. Supabase Auth 계정과 연결된다.

```sql
CREATE TABLE hub.managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 임직원/심사역 프로필 ID
    user_id UUID UNIQUE REFERENCES auth.users(id),             -- Supabase Auth 계정과 1:1 연결
    employee_code VARCHAR(50) UNIQUE NULL,                    -- 사번 또는 내부 직원 코드
    name TEXT NOT NULL,                                       -- 이름
    email TEXT NOT NULL,                                      -- 업무 이메일
    department TEXT NULL,                                     -- 부서
    position TEXT NULL,                                       -- 직급
    role_title TEXT NULL,                                     -- 직책/역할명
    interest_areas TEXT[] DEFAULT '{}',                       -- 관심 투자 분야 또는 담당 분야
    status VARCHAR(50) DEFAULT 'active',                       -- 재직/휴직/퇴사/비활성 등
    created_by UUID REFERENCES auth.users(id),                 -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                 -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                      -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                       -- 수정 시각
);
```

### 4.5 `hub.master_aliases`

기업명 변경, 약칭, 과거명, 영문명 등을 보존한다.

```sql
CREATE TABLE hub.master_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- alias 레코드 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner 등 대상 종류
    entity_id UUID NOT NULL,                                  -- 대상 마스터 ID
    alias_value TEXT NOT NULL,                                -- 과거명, 약칭, 영문명, 오탈자명 등
    normalized_value TEXT NOT NULL,                           -- 검색/비교용 정규화 값
    alias_type VARCHAR(50) NOT NULL,                          -- previous_name/short_name/english_name 등
    source_domain VARCHAR(50) NULL,                           -- alias가 유입된 서비스 또는 import 출처
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 등록 시각
    created_by UUID REFERENCES auth.users(id)                  -- 등록자
);
```

예시:

```txt
entity_type = startup
alias_type = previous_name, short_name, english_name, typo, brand_name
```

### 4.6 `hub.master_identifiers`

사업자번호, 법인번호, 이메일, 전화번호, 외부 시스템 ID 같은 식별자를 통합 관리한다.

```sql
CREATE TABLE hub.master_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 식별자 레코드 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner 등 대상 종류
    entity_id UUID NOT NULL,                                  -- 대상 마스터 ID
    identifier_type VARCHAR(50) NOT NULL,                     -- business_number/email/phone/external_id 등
    identifier_value TEXT NOT NULL,                           -- 원본 식별자 값
    normalized_value TEXT NOT NULL,                           -- 비교/중복 판단용 정규화 값
    confidence_score NUMERIC(5, 2) NULL,                      -- 식별자 자체의 신뢰도
    source_domain VARCHAR(50) NULL,                           -- work/fund/mna/import 등 유입 출처
    source_label TEXT NULL,                                   -- 행사명, 엑셀 파일명, 프로그램명 등 출처 설명
    is_primary BOOLEAN DEFAULT FALSE,                         -- 대표 식별자 여부
    verified_status VARCHAR(50) DEFAULT 'unverified',          -- unverified/verified/rejected
    verified_by UUID REFERENCES auth.users(id),                -- 검증자
    verified_at TIMESTAMPTZ NULL,                             -- 검증 완료 시각
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 등록 시각
    created_by UUID REFERENCES auth.users(id)                  -- 등록자
);
```

권장 unique:

```sql
CREATE UNIQUE INDEX master_identifiers_unique_idx
ON hub.master_identifiers (entity_type, identifier_type, normalized_value); -- 같은 종류의 식별자 중복 등록 방지
```

### 4.7 `hub.master_field_history`

마스터의 대표값이 변경될 때 변경 전후 값, 변경 출처, 사유를 보존한다.

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
사업자번호 없음 -> 사업자번호 생김
대표자 변경
주소 변경
```

### 4.8 `hub.merge_candidates`

중복 의심 후보를 저장한다.

```sql
CREATE TABLE hub.merge_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 병합 후보 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner
    source_entity_id UUID NOT NULL,                           -- 병합될 가능성이 있는 신규/임시 레코드
    target_entity_id UUID NOT NULL,                           -- 기존 최종 마스터 후보
    score NUMERIC(5, 2) NOT NULL,                             -- 유사도 점수
    reasons JSONB DEFAULT '[]'::jsonb,                        -- 매칭 사유: 이름 유사, 연락처 일치 등
    status VARCHAR(50) DEFAULT 'pending',                      -- pending/approved/rejected/ignored/expired/on_hold
    reviewed_by UUID REFERENCES auth.users(id),                -- 검토자
    reviewed_at TIMESTAMPTZ NULL,                              -- 검토 시각
    created_at TIMESTAMPTZ DEFAULT now()                       -- 후보 생성 시각
);
```

상태:

```txt
pending
approved
rejected
ignored
expired
on_hold
```

### 4.9 `hub.merge_events`

실제 병합 이력을 저장한다.

```sql
CREATE TABLE hub.merge_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 실제 병합 이벤트 ID
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner
    source_entity_id UUID NOT NULL,                           -- 병합되어 비활성화되는 레코드
    target_entity_id UUID NOT NULL,                           -- 최종으로 남는 마스터 레코드
    merge_policy JSONB DEFAULT '{}'::jsonb,                   -- 필드별 우선순위/승계 정책
    affected_records JSONB DEFAULT '[]'::jsonb,               -- 비동기적으로 업데이트될/된 도메인 FK 목록
    sync_status VARCHAR(50) DEFAULT 'pending',                -- 비동기 동기화 상태: pending/processing/completed/failed
    before_snapshot JSONB NOT NULL,                           -- 병합 전 데이터 스냅샷
    after_snapshot JSONB NOT NULL,                            -- 병합 후 데이터 스냅샷
    reason TEXT NULL,                                         -- 병합 사유
    approved_by UUID REFERENCES auth.users(id),                -- 병합 승인자
    created_at TIMESTAMPTZ DEFAULT now()                       -- 병합 시각
);
```

중요:

```txt
병합은 단순 덮어쓰기가 아니다.
과거 값은 alias, identifier, snapshot, event로 보존한다.
source record는 status='merged'로 바꾸고 merged_into_id를 설정한다.
DB 락 최소화를 위해, 타 도메인 스키마의 FK 업데이트는 sync_status 및 affected_records 필드를 기반으로 백그라운드 비동기 워커에서 실행한다.
```

### 4.10 `hub.resolved_startups` / `hub.resolved_experts` / `hub.resolved_partners` (view)

2단계 비동기 병합(정책 §10.3)에서 타 도메인 FK 반영이 진행 중이어도, 업무 도메인 조회가 항상 최종 마스터를 가리키도록 표준 resolve view 를 제공한다. (마이그레이션 `20260703190001_create_resolved_master_views.sql`)

```sql
CREATE OR REPLACE VIEW hub.resolved_startups AS
SELECT
    source.id                                  AS source_startup_id,   -- 업무 FK 가 참조 중인(병합 전) id
    COALESCE(source.merged_into_id, source.id) AS resolved_startup_id, -- 조회 시 사용할 최종 마스터 id
    target.master_code                         AS resolved_master_code,
    target.name                                AS resolved_name,
    target.status                              AS resolved_status
FROM hub.startups source
JOIN hub.startups target
  ON target.id = COALESCE(source.merged_into_id, source.id);
-- experts/partners 도 동형.
```

규칙:

```txt
업무 도메인 앱(work, fund, mna 등)은 hub 마스터를 직접 조인하며 COALESCE 를 반복 작성하지 않는다.
이 view(또는 packages/database 의 resolveMasterId/isMerged/RESOLVED_MASTER_VIEW helper)를 경유해 source_id 와 resolved_id 를 함께 얻는다.
COALESCE(merged_into_id, id) 는 view/helper 내부 구현으로 숨긴다.
```

## 5. `dev` 스키마

`dev`는 계정, 권한, 관리자 기능을 담당한다.

주요 테이블:

```txt
user_permissions
permission_templates
permission_audit_logs
system_settings
```

### 5.1 `dev.user_permissions`

사용자별 서비스 권한이다.

```sql
CREATE TABLE dev.user_permissions (
    user_id UUID REFERENCES auth.users(id),                  -- 권한 대상 사용자
    domain_name VARCHAR(50) NOT NULL,                        -- hub/work/fund 등 서비스 도메인
    role_key VARCHAR(50) NOT NULL,                           -- master/business_team 등 역할 템플릿
    can_read BOOLEAN DEFAULT FALSE,                          -- 해당 도메인 조회 가능 여부
    can_write BOOLEAN DEFAULT FALSE,                         -- 해당 도메인 생성/수정 가능 여부
    scope_type VARCHAR(50) DEFAULT 'none',                   -- global/self/company/program 등 데이터 범위
    scope_id UUID NULL,                                      -- scope가 특정 자원을 가리킬 때의 대상 ID
    expires_at TIMESTAMPTZ NULL,                             -- 임시 권한 만료 시각
    created_at TIMESTAMPTZ DEFAULT now(),                    -- 권한 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now(),                    -- 권한 수정 시각
    PRIMARY KEY (user_id, domain_name)
);
```

`expires_at`은 임시 권한의 최종 만료 기준이다. JWT `app_metadata.permissions`에 권한을 캐싱할 때도 도메인별 `expires_at`을 함께 포함하고, RLS helper에서 `now()`와 비교해 만료된 권한을 차단한다.

### 5.2 `dev.permission_templates`

권한 템플릿의 기본 도메인 권한과 scope 기본값을 저장한다. Phase 1에서는 복잡한 템플릿 편집기보다 템플릿 조회와 사용자 적용을 우선한다.

```sql
CREATE TABLE dev.permission_templates (
    role_key VARCHAR(50) PRIMARY KEY,                         -- master/business_team/viewer 등 템플릿 키
    display_name TEXT NOT NULL,                               -- 화면 표시명
    description TEXT NULL,                                    -- 템플릿 설명
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,            -- 도메인별 read/write/scope 기본값
    is_system BOOLEAN DEFAULT TRUE,                           -- 시스템 기본 템플릿 여부
    status VARCHAR(50) DEFAULT 'active',                      -- active/inactive/archived
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

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

### 5.3 `dev.permission_audit_logs`

권한 변경 이력이다.

```sql
CREATE TABLE dev.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),            -- 감사 로그 ID
    actor_user_id UUID REFERENCES auth.users(id),             -- 권한을 변경한 관리자
    target_user_id UUID REFERENCES auth.users(id),            -- 권한이 변경된 사용자
    action VARCHAR(50) NOT NULL,                              -- grant/revoke/update/expire 등
    domain_name VARCHAR(50) NULL,                             -- 변경 대상 서비스 도메인
    before_value JSONB NULL,                                  -- 변경 전 권한 값
    after_value JSONB NULL,                                   -- 변경 후 권한 값
    reason TEXT NULL,                                        -- 변경 사유
    request_id TEXT NULL,                                     -- 동일 요청 상관관계 ID (req_<uuid>)
    created_at TIMESTAMPTZ DEFAULT now()                      -- 기록 시각
);
```

### 5.4 `dev.system_settings`

서비스 도메인, 기능 플래그, mock 기능 비활성화 같은 운영 설정의 확장 지점이다. Phase 1에서는 꼭 필요한 설정만 최소로 사용한다.

```sql
CREATE TABLE dev.system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,                     -- 설정 키
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,          -- 설정 값
    description TEXT NULL,                                    -- 설정 설명
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

## 6. `work` 스키마

`work`는 프로그램 실행과 운영 기록을 담당한다. `yna-matching`의 Program First 구조를 기준으로 하되, Hub 마스터와 Dev 권한 정책은 새 Suite 기준을 따른다.

Work의 기본 구조:

```txt
Program
  -> Program Module
  -> Program Activity
  -> Record
```

Work가 다루는 주요 업무:

```txt
모집
신청자/참여자 관리
서류평가
현장평가
오리엔테이션
멘토링
비즈니스 매칭
데모데이
성과관리
커스터마이즈 행사
회의록
```

### 6.1 `work.programs`

```sql
CREATE TABLE work.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 프로그램 내부 ID
    program_code VARCHAR(50) UNIQUE NOT NULL,                 -- 사용자/보고서용 프로그램 코드
    name TEXT NOT NULL,                                       -- 프로그램명
    description TEXT NULL,                                    -- 프로그램 설명
    start_date DATE NULL,                                     -- 운영 시작일
    end_date DATE NULL,                                       -- 운영 종료일
    manager_id UUID REFERENCES hub.managers(id),              -- 담당 내부 매니저
    status VARCHAR(50) DEFAULT 'draft',                       -- draft/open/closed/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 6.2 `work.program_modules`

프로그램 안의 기능 단위이다. 모집, 평가, 멘토링, 비즈니스 매칭, 데모데이 같은 정형 기능과 커스텀 행사를 같은 방식으로 다룬다.

권장 module_type:

```txt
recruitment
participant_management
document_review
onsite_evaluation
orientation
mentoring
business_matching
demo_day
outcome_management
custom_event
```

```sql
CREATE TABLE work.program_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 프로그램 모듈 ID
    program_id UUID REFERENCES work.programs(id),              -- 연결 프로그램
    module_type VARCHAR(50) NOT NULL,                         -- recruitment/document_review/custom_event 등
    name TEXT NOT NULL,                                       -- 모듈 표시명
    description TEXT NULL,                                    -- 모듈 설명
    sort_order INTEGER DEFAULT 0,                              -- 프로그램 내 표시 순서
    start_date DATE NULL,                                     -- 모듈 시작일
    end_date DATE NULL,                                       -- 모듈 종료일
    status VARCHAR(50) DEFAULT 'draft',                       -- draft/open/closed/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 6.3 `work.applications`

```sql
CREATE TABLE work.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 신청서 ID
    program_id UUID REFERENCES work.programs(id),             -- 신청 대상 프로그램
    startup_id UUID REFERENCES hub.startups(id),              -- 신청 기업. Hub 마스터를 참조한다.
    applicant_user_id UUID REFERENCES auth.users(id),         -- 신청을 작성한 스타트업 사용자
    application_status VARCHAR(50) DEFAULT 'draft',           -- draft/submitted/reviewing/selected/rejected 등
    submitted_at TIMESTAMPTZ NULL,                            -- 제출 완료 시각
    created_by UUID REFERENCES auth.users(id),                -- 최초 작성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 6.4 `work.program_participants`

프로그램에 참여하는 스타트업, 전문가, 내부 매니저, 협력사를 연결한다. 신청서에서 선발된 스타트업도 최종적으로는 참여자 관계를 가진다.

```sql
CREATE TABLE work.program_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 참여자 관계 ID
    program_id UUID REFERENCES work.programs(id),              -- 연결 프로그램
    startup_id UUID REFERENCES hub.startups(id),               -- 참여 스타트업. 해당 없으면 NULL
    expert_id UUID REFERENCES hub.experts(id),                 -- 참여 전문가. 해당 없으면 NULL
    partner_id UUID REFERENCES hub.partners(id),               -- 참여 협력사/기관. 해당 없으면 NULL
    manager_id UUID REFERENCES hub.managers(id),               -- 내부 담당자. 해당 없으면 NULL
    participant_type VARCHAR(50) NOT NULL,                    -- startup/expert/partner/manager/external
    display_name TEXT NULL,                                   -- 외부/임시 참여자 표시명
    source_application_id UUID REFERENCES work.applications(id), -- 신청에서 전환된 경우 원본 신청
    status VARCHAR(50) DEFAULT 'active',                       -- active/invited/withdrawn/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

주의:

```txt
스타트업/전문가/협력사는 가능한 Hub 마스터를 참조한다.
마스터가 불명확하면 Hub 임시 마스터 생성 후 연결한다.
```

### 6.5 `work.evaluations`

```sql
CREATE TABLE work.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 평가 ID
    application_id UUID REFERENCES work.applications(id),     -- 평가 대상 신청서
    expert_id UUID REFERENCES hub.experts(id),                -- 배정된 전문가 마스터
    evaluator_user_id UUID REFERENCES auth.users(id),         -- 실제 로그인 평가자 계정
    score NUMERIC(5, 2) NULL,                                 -- 평가 점수
    comment TEXT NULL,                                        -- 평가 의견
    status VARCHAR(50) DEFAULT 'assigned',                    -- assigned/draft/submitted/returned 등
    submitted_at TIMESTAMPTZ NULL,                            -- 평가 제출 시각
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 6.6 `work.mentoring_sessions`

```sql
CREATE TABLE work.mentoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 멘토링 세션 ID
    program_id UUID REFERENCES work.programs(id),             -- 연결 프로그램
    startup_id UUID REFERENCES hub.startups(id),              -- 참여 스타트업
    expert_id UUID REFERENCES hub.experts(id),                -- 멘토/전문가
    scheduled_at TIMESTAMPTZ NULL,                            -- 예정 일시
    duration_minutes INTEGER NULL,                            -- 예정/진행 시간
    status VARCHAR(50) DEFAULT 'scheduled',                   -- scheduled/completed/cancelled/no_show 등
    notes TEXT NULL,                                          -- 세션 기록 또는 내부 메모
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 6.7 `work.program_activities`

프로그램 또는 모듈 안에서 발생하는 실제 실행 단위이다. 정형 모듈로 표현하기 어려운 커스터마이즈 행사, 내부 회의, 외부 미팅, 워크숍, 리허설 등을 담는다.

```sql
CREATE TABLE work.program_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 활동/행사 ID
    program_id UUID REFERENCES work.programs(id),              -- 연결 프로그램
    module_id UUID REFERENCES work.program_modules(id),        -- 연결 모듈. 프로그램 공통 활동이면 NULL 가능
    activity_type VARCHAR(50) NOT NULL,                       -- session/meeting/workshop/custom_event 등
    title TEXT NOT NULL,                                      -- 활동명
    description TEXT NULL,                                    -- 활동 설명
    starts_at TIMESTAMPTZ NULL,                               -- 시작 일시
    ends_at TIMESTAMPTZ NULL,                                 -- 종료 일시
    location TEXT NULL,                                       -- 장소 또는 온라인 링크 설명
    status VARCHAR(50) DEFAULT 'scheduled',                   -- scheduled/completed/cancelled/archived 등
    metadata JSONB DEFAULT '{}'::jsonb,                       -- 커스텀 행사별 추가 설정
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

Activity 예시:

```txt
IR 리허설
선정위원 사전회의
기업 현장방문
기관 협의 미팅
네트워킹 행사
투자자 라운드테이블
중간점검 워크숍
내부 운영회의
```

### 6.8 `work.meeting_minutes`

회의록은 프로그램 운영 중 발생한 핵심 안건, 논의 내용, 결정사항을 남기는 가벼운 기록이다. 후속 조치, 담당자, 기한, 참석자 정교 관리는 초기 범위에서 제외한다.

```sql
CREATE TABLE work.meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 회의록 ID
    program_id UUID REFERENCES work.programs(id),              -- 연결 프로그램
    module_id UUID REFERENCES work.program_modules(id),        -- 연결 모듈. 없으면 NULL
    activity_id UUID REFERENCES work.program_activities(id),   -- 연결 활동. 없으면 NULL
    title TEXT NOT NULL,                                      -- 회의록 제목
    agenda TEXT NULL,                                         -- 안건
    discussion TEXT NULL,                                     -- 논의 내용
    decisions TEXT NULL,                                      -- 결정사항
    status VARCHAR(50) DEFAULT 'active',                       -- active/archived/deleted 등
    created_by UUID REFERENCES auth.users(id),                -- 작성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 작성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

회의록 첨부파일은 공통 `hub.attachments`를 사용한다.

```txt
hub.attachments.domain_name = work
hub.attachments.entity_type = meeting_minutes
hub.attachments.entity_id = work.meeting_minutes.id
```

주의:

```txt
회의록에서 Hub 마스터 변경 단서가 발견되어도 Work가 Hub 마스터를 직접 수정하지 않는다.
필요하면 Hub 임시 마스터, 병합 후보, correction request 흐름으로 연결한다.
```

## 7. `mna` 스키마

`mna`는 M&A 딜 소싱, 자문, 실사, 클로징 관리를 담당한다.

### 7.1 `mna.deals`

```sql
CREATE TABLE mna.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 딜 내부 ID
    deal_code VARCHAR(50) UNIQUE NOT NULL,                    -- 사용자/보고서용 딜 코드
    title TEXT NOT NULL,                                      -- 딜명
    startup_id UUID REFERENCES hub.startups(id),              -- 대상 기업. Hub 스타트업 마스터 참조
    deal_type VARCHAR(50) NULL,                               -- buy_side/sell_side/advisory 등
    deal_stage VARCHAR(50) DEFAULT 'sourcing',                -- sourcing/dd/negotiation/closing 등
    owner_manager_id UUID REFERENCES hub.managers(id),        -- 담당 심사역/매니저
    partner_id UUID REFERENCES hub.partners(id),              -- 자문사/협력사/관계 기관
    expected_value NUMERIC(18, 2) NULL,                       -- 예상 거래 금액
    closed_at DATE NULL,                                      -- 클로징 일자
    status VARCHAR(50) DEFAULT 'active',                      -- active/closed/dropped/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 7.2 `mna.due_diligence_files`

```sql
CREATE TABLE mna.due_diligence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 실사 파일 메타데이터 ID
    deal_id UUID REFERENCES mna.deals(id),                    -- 연결 딜
    file_path TEXT NOT NULL,                                  -- Supabase Storage 경로
    file_name TEXT NOT NULL,                                  -- 원본 파일명
    file_type VARCHAR(100) NULL,                              -- 파일 분류 또는 MIME 보조 정보
    visibility VARCHAR(50) DEFAULT 'internal',                -- internal/restricted 등 접근 범위
    uploaded_by UUID REFERENCES auth.users(id),               -- 업로드 사용자
    created_at TIMESTAMPTZ DEFAULT now()                      -- 업로드 시각
);
```

## 8. `project` 스키마

`project`는 공공/민간 수주 사업, R&D 프로젝트, 마일스톤, 투입 인력 관리를 담당한다.

### 8.1 `project.projects`

```sql
CREATE TABLE project.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 프로젝트 내부 ID
    project_code VARCHAR(50) UNIQUE NOT NULL,                 -- 사용자/보고서용 프로젝트 코드
    name TEXT NOT NULL,                                       -- 프로젝트명
    project_type VARCHAR(50) NULL,                            -- public/private/rnd/internal 등
    partner_id UUID REFERENCES hub.partners(id),              -- 발주처/협력기관/컨소시엄 파트너
    owner_manager_id UUID REFERENCES hub.managers(id),        -- 담당 매니저
    start_date DATE NULL,                                     -- 시작일
    end_date DATE NULL,                                       -- 종료일
    budget NUMERIC(18, 2) NULL,                               -- 예산 또는 계약금액
    status VARCHAR(50) DEFAULT 'active',                      -- active/completed/paused/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 8.2 `project.milestones`

```sql
CREATE TABLE project.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 마일스톤 ID
    project_id UUID REFERENCES project.projects(id),          -- 연결 프로젝트
    title TEXT NOT NULL,                                      -- 마일스톤명
    due_date DATE NULL,                                       -- 예정 완료일
    completed_at DATE NULL,                                   -- 실제 완료일
    status VARCHAR(50) DEFAULT 'pending',                     -- pending/in_progress/completed/delayed 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 8.3 `project.manpower_allocations`

```sql
CREATE TABLE project.manpower_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 투입 인력 기록 ID
    project_id UUID REFERENCES project.projects(id),          -- 연결 프로젝트
    manager_id UUID REFERENCES hub.managers(id),              -- 투입 인력
    month DATE NOT NULL,                                      -- 투입 월. 월 단위 집계 기준
    man_month NUMERIC(5, 2) NOT NULL,                         -- 투입 M/M
    role_description TEXT NULL,                               -- 수행 역할 설명
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

## 9. `fund` 스키마

`fund`는 펀드, LP, 캐피탈콜, 투자 내역, 지분율 관리를 담당한다.

### 9.1 `fund.funds`

```sql
CREATE TABLE fund.funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 펀드 내부 ID
    fund_code VARCHAR(50) UNIQUE NOT NULL,                    -- 사용자/보고서용 펀드 코드
    name TEXT NOT NULL,                                       -- 펀드명
    total_commitment NUMERIC(18, 2) NULL,                     -- 총 약정액
    start_date DATE NULL,                                     -- 결성/운용 시작일
    end_date DATE NULL,                                       -- 만기 또는 종료 예정일
    status VARCHAR(50) DEFAULT 'active',                      -- active/closed/liquidated/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 9.2 `fund.limited_partners`

LP는 `hub.partners`를 참조한다.

```sql
CREATE TABLE fund.limited_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- LP 참여 기록 ID
    fund_id UUID REFERENCES fund.funds(id),                   -- 연결 펀드
    partner_id UUID REFERENCES hub.partners(id),              -- LP 기관. Hub 협력사 마스터 참조
    commitment_amount NUMERIC(18, 2) NOT NULL,                -- 약정액
    ownership_ratio NUMERIC(8, 5) NULL,                       -- 출자 비율
    status VARCHAR(50) DEFAULT 'active',                      -- active/withdrawn/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 9.3 `fund.capital_calls`

```sql
CREATE TABLE fund.capital_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 캐피탈콜 ID
    fund_id UUID REFERENCES fund.funds(id),                   -- 연결 펀드
    call_round INTEGER NOT NULL,                              -- 캐피탈콜 차수
    due_date DATE NOT NULL,                                   -- 납입 기한
    total_call_amount NUMERIC(18, 2) NOT NULL,                -- 총 납입 요청 금액
    status VARCHAR(50) DEFAULT 'pending',                     -- pending/paid/overdue/cancelled 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 9.4 `fund.investments`

피투자사는 `hub.startups`를 참조한다.

```sql
CREATE TABLE fund.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 투자 기록 ID
    fund_id UUID REFERENCES fund.funds(id),                   -- 투자 집행 펀드
    startup_id UUID REFERENCES hub.startups(id),              -- 피투자사. Hub 스타트업 마스터 참조
    investment_date DATE NULL,                                -- 투자일
    invested_amount NUMERIC(18, 2) NOT NULL,                  -- 투자 금액
    ownership_ratio NUMERIC(8, 5) NULL,                       -- 지분율
    investment_stage VARCHAR(50) NULL,                        -- 투자 라운드/단계
    status VARCHAR(50) DEFAULT 'active',                      -- active/exited/written_off/archived 등
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

## 10. `management` 스키마

`management`는 HRM/HRD, 조직, 성과, 경영관리 데이터를 담당한다.

### 10.1 `management.hrm_records`

```sql
CREATE TABLE management.hrm_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- HR 기록 ID
    manager_id UUID REFERENCES hub.managers(id),              -- 대상 임직원/심사역
    record_type VARCHAR(50) NOT NULL,                         -- 평가/교육/면담/이력 등
    record_date DATE NOT NULL,                                -- 기록 기준일
    title TEXT NOT NULL,                                      -- 기록 제목
    content TEXT NULL,                                        -- 기록 내용
    visibility VARCHAR(50) DEFAULT 'restricted',              -- restricted/private 등 민감도
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

### 10.2 `management.performance_metrics`

```sql
CREATE TABLE management.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 성과 지표 ID
    metric_month DATE NOT NULL,                               -- 지표 기준 월
    department TEXT NULL,                                     -- 부서. NULL이면 전사 집계 가능
    revenue NUMERIC(18, 2) DEFAULT 0,                         -- 매출
    profit NUMERIC(18, 2) DEFAULT 0,                          -- 이익
    fixed_cost NUMERIC(18, 2) DEFAULT 0,                      -- 고정비
    variable_cost NUMERIC(18, 2) DEFAULT 0,                   -- 변동비
    efficiency_ratio NUMERIC(10, 4) NULL,                     -- 효율성 지표
    created_by UUID REFERENCES auth.users(id),                -- 생성자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
```

## 11. `staging` 스키마

`staging`은 기존 DB, 엑셀/시트, 외부 원본을 Hub 마스터로 이관하기 전 원본값과 정규화값을 보존하는 중간 영역이다.

### 11.1 `staging.import_batches`

마이그레이션 작업 단위를 관리한다.

```sql
CREATE TABLE staging.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- import batch ID
    source_type VARCHAR(50) NOT NULL,                         -- db/csv/xlsx/google_sheet/manual
    source_name TEXT NOT NULL,                                -- 원본 이름
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner/application 등
    is_dry_run BOOLEAN NOT NULL DEFAULT FALSE,                 -- dry-run(운영 미반영) 여부
    total_rows INTEGER DEFAULT 0,                              -- 전체 row 수
    processed_rows INTEGER DEFAULT 0,                          -- 처리 완료 row 수
    failed_rows INTEGER DEFAULT 0,                             -- 실패 row 수
    status VARCHAR(50) DEFAULT 'pending',                     -- pending/running/completed/failed/partial/archived
    started_by UUID REFERENCES auth.users(id),                 -- 실행자
    started_at TIMESTAMPTZ DEFAULT now(),                      -- 시작 시각
    finished_at TIMESTAMPTZ NULL,                              -- 종료 시각
    archived_at TIMESTAMPTZ NULL,                              -- rollback(비활성화) 시각
    summary JSONB DEFAULT '{}'::jsonb                          -- 결과 요약(신규/연결/후보/실패 수)
);
```

> Phase 1.12 에서 `is_dry_run`(운영 반영 전 dry-run 필수), `archived_at`(batch 단위 rollback = status='archived' 비활성화)을 추가했다. status 에 `archived` 를 포함한다.

### 11.2 `staging.startup_import_rows`

스타트업 import row의 원본, 매핑값, 정규화값, 처리 결과를 보존한다.

```sql
CREATE TABLE staging.startup_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- import row ID
    import_batch_id UUID NOT NULL REFERENCES staging.import_batches(id), -- 같은 파일/작업을 묶는 batch ID
    source_name TEXT NOT NULL,                                 -- 원본 파일명/시스템명
    source_row_number INTEGER NULL,                            -- 원본 row 번호
    raw_payload JSONB NOT NULL,                                -- 원본 row 전체
    mapped_payload JSONB NULL,                                 -- 표준 컬럼으로 매핑한 값
    normalized_payload JSONB NULL,                             -- 검색/비교용 정규화 값
    import_status VARCHAR(50) DEFAULT 'pending',               -- pending/processed/failed/skipped
    decision_kind VARCHAR(50) NULL,                            -- connect/new_master/candidate/failed(판정 결과)
    error_message TEXT NULL,                                   -- 실패 사유
    hub_entity_id UUID NULL REFERENCES hub.startups(id),        -- 생성/연결된 hub.startups.id
    created_at TIMESTAMPTZ DEFAULT now(),                      -- 생성 시각
    processed_at TIMESTAMPTZ NULL                              -- 처리 시각
);
```

> Phase 1.12 에서 `decision_kind`(연결/신규/후보/실패 판정)를 추가했다. 판정 기준은 migration_strategy §9(강한 식별자 일치→connect, 공식 번호 없이 단서 일치→candidate, 일치 없음→new_master, 필수값 누락→failed).

주의:

```txt
raw_payload에는 개인정보가 포함될 수 있으므로 staging도 보안/RLS 대상이다.
운영 검증 후 archive 또는 마스킹 기준을 적용한다.
```

## 12. 공통 감사 로그

권한 변경 외에도 민감 액션은 공통 감사 로그를 남긴다.

```sql
CREATE TABLE hub.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 감사 로그 ID
    actor_user_id UUID REFERENCES auth.users(id),             -- 액션 수행자
    domain_name VARCHAR(50) NOT NULL,                         -- 액션이 발생한 서비스 도메인
    entity_type VARCHAR(50) NOT NULL,                         -- 대상 엔티티 종류
    entity_id UUID NULL,                                      -- 대상 엔티티 ID
    action VARCHAR(50) NOT NULL,                              -- create/update/delete/approve/merge/download 등
    before_value JSONB NULL,                                  -- 변경 전 값
    after_value JSONB NULL,                                   -- 변경 후 값
    reason TEXT NULL,                                        -- 액션 사유
    request_id TEXT NULL,                                     -- 동일 요청 상관관계 ID (req_<uuid>)
    created_at TIMESTAMPTZ DEFAULT now()                      -- 기록 시각
);
```

기록 대상:

```txt
마스터 병합
마스터 정보 변경
권한 변경
삭제/복구
승인/반려
파일 다운로드
민감 정보 조회
```

## 13. 파일/첨부 모델

파일은 Supabase Storage에 저장하고, DB에는 메타데이터만 저장한다.

```sql
CREATE TABLE hub.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 첨부파일 메타데이터 ID
    domain_name VARCHAR(50) NOT NULL,                         -- 파일이 속한 서비스 도메인
    entity_type VARCHAR(50) NOT NULL,                         -- 파일이 연결된 엔티티 종류
    entity_id UUID NOT NULL,                                  -- 파일이 연결된 엔티티 ID
    bucket_name TEXT NOT NULL,                                -- Supabase Storage bucket
    file_path TEXT NOT NULL,                                  -- Storage 내부 경로
    file_name TEXT NOT NULL,                                  -- 원본 파일명
    file_size BIGINT NULL,                                    -- 파일 크기
    mime_type TEXT NULL,                                      -- MIME type
    visibility VARCHAR(50) DEFAULT 'internal',                -- public/internal/restricted/owner_only
    uploaded_by UUID REFERENCES auth.users(id),               -- 업로드 사용자
    created_at TIMESTAMPTZ DEFAULT now()                      -- 업로드 시각
);
```

권장 visibility:

```txt
public
internal
restricted
owner_only
```

## 14. RLS 설계 연결

모든 업무 테이블은 RLS 적용을 전제로 한다.

기본 규칙:

```txt
hub 마스터:
  내부 사용자는 권한에 따라 read/write
  외부 사용자는 자기 회사/자기 배정 데이터에 연결된 일부 정보만

work:
  내부 사용자는 work 권한과 scope 기준
  전문가/스타트업은 self/company scope 기준

mna/fund/management:
  외부 사용자는 접근 불가
  내부 사용자는 domain permission 기준
```

테이블에는 RLS 판단에 필요한 참조 컬럼을 둔다.

예시:

```txt
created_by
manager_id
owner_manager_id
startup_id
expert_id
partner_id
program_id
module_id
activity_id
fund_id
department
```

## 15. 구현 우선 테이블

1차 구축에서는 모든 테이블을 한 번에 구현하지 않는다.

우선순위 1:

```txt
hub.startups
hub.experts
hub.partners
hub.managers
hub.master_aliases
hub.master_identifiers
hub.master_field_history
hub.merge_candidates
hub.merge_events
dev.user_permissions
dev.permission_templates
dev.permission_audit_logs
hub.audit_logs
hub.attachments
staging.import_batches
staging.startup_import_rows
```

Phase 1 Work 연결 계약/mock 검증:

```txt
work.programs
work.program_modules
work.applications
work.program_activities
work.meeting_minutes
```

우선순위 2:

```txt
work.program_participants
work.evaluations
work.mentoring_sessions
project.projects
project.milestones
fund.funds
fund.investments
```

우선순위 3:

```txt
mna.deals
mna.due_diligence_files
fund.limited_partners
fund.capital_calls
project.manpower_allocations
management.hrm_records
management.performance_metrics
```

## 16. 체크리스트

새 테이블을 추가할 때 다음을 확인한다.

```txt
이 테이블의 소유 스키마가 명확한가?
Hub 마스터를 참조해야 하는가?
UUID PK와 사용자용 코드가 분리되어 있는가?
created_by, updated_by가 필요한가?
status로 soft delete를 처리할 수 있는가?
RLS 판단에 필요한 컬럼이 있는가?
민감 액션에 대한 audit log가 필요한가?
검색/중복 판단을 위한 normalized 컬럼이 필요한가?
파일은 DB가 아니라 Storage에 저장하는가?
```

## 17. 최종 요약

Y&A Suite 데이터 모델의 중심은 `hub`이다.

```txt
hub        = 전사 마스터와 감사 로그
dev        = 계정과 권한
staging    = import 원본/매핑/정규화/실패 이력
work       = Program First 기반 프로그램/모듈/신청/참여/활동/평가/멘토링/회의록
mna        = M&A 딜
project    = 프로젝트/마일스톤/M/M
fund       = 펀드/LP/투자
management = HR/성과/경영관리
```

각 업무 스키마는 Hub 마스터를 직접 참조하고, 마스터 병합은 삭제나 덮어쓰기가 아니라 이력 기반으로 처리한다. 내부 PK는 UUID, 사용자용 식별자는 코드로 분리해 장기적인 확장성과 데이터 정합성을 확보한다.
