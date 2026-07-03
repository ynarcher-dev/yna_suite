-- Phase 1.3 — hub 마스터 부속 테이블 (별칭/식별자/필드 이력)
-- 근거: yna_suite_data_model.md §4.5~4.7
--
-- 목적: 마스터의 과거명·약칭·영문명(별칭), 사업자번호·이메일·전화 등 식별자,
--       대표값 변경 이력을 보존한다. entity_type + entity_id 로 마스터를 가리키는
--       다형(polymorphic) 참조이므로 FK 대신 (entity_type, entity_id) 인덱스를 둔다.

-- 4.5 별칭: 기업명 변경/약칭/과거명/영문명/오탈자명 보존
CREATE TABLE hub.master_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- alias 레코드 ID
    entity_type VARCHAR(50) NOT NULL,                          -- startup/expert/partner 등 대상 종류
    entity_id UUID NOT NULL,                                   -- 대상 마스터 ID
    alias_value TEXT NOT NULL,                                 -- 과거명, 약칭, 영문명, 오탈자명 등
    normalized_value TEXT NOT NULL,                            -- 검색/비교용 정규화 값
    alias_type VARCHAR(50) NOT NULL,                           -- previous_name/short_name/english_name 등
    source_domain VARCHAR(50) NULL,                            -- alias 가 유입된 서비스 또는 import 출처
    created_at TIMESTAMPTZ DEFAULT now(),                      -- 등록 시각
    created_by UUID REFERENCES auth.users(id)                  -- 등록자
);
COMMENT ON TABLE hub.master_aliases IS '마스터 별칭(과거명/약칭/영문명 등) 보존';

CREATE INDEX master_aliases_entity_idx ON hub.master_aliases (entity_type, entity_id);
CREATE INDEX master_aliases_normalized_idx ON hub.master_aliases (normalized_value); -- 별칭 기반 검색용

-- 4.6 식별자: 사업자번호/법인번호/이메일/전화/외부 ID 통합 관리
CREATE TABLE hub.master_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 식별자 레코드 ID
    entity_type VARCHAR(50) NOT NULL,                          -- startup/expert/partner 등 대상 종류
    entity_id UUID NOT NULL,                                   -- 대상 마스터 ID
    identifier_type VARCHAR(50) NOT NULL,                      -- business_number/email/phone/external_id 등
    identifier_value TEXT NOT NULL,                            -- 원본 식별자 값
    normalized_value TEXT NOT NULL,                            -- 비교/중복 판단용 정규화 값
    confidence_score NUMERIC(5, 2) NULL,                       -- 식별자 자체의 신뢰도
    source_domain VARCHAR(50) NULL,                            -- work/fund/mna/import 등 유입 출처
    source_label TEXT NULL,                                    -- 행사명, 엑셀 파일명, 프로그램명 등 출처 설명
    is_primary BOOLEAN DEFAULT FALSE,                          -- 대표 식별자 여부
    verified_status VARCHAR(50) DEFAULT 'unverified',         -- unverified/verified/rejected
    verified_by UUID REFERENCES auth.users(id),               -- 검증자
    verified_at TIMESTAMPTZ NULL,                             -- 검증 완료 시각
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 등록 시각
    created_by UUID REFERENCES auth.users(id)                  -- 등록자
);
COMMENT ON TABLE hub.master_identifiers IS '마스터 식별자(사업자번호/이메일/전화/외부 ID 등) 통합 관리';

CREATE UNIQUE INDEX master_identifiers_unique_idx
  ON hub.master_identifiers (entity_type, identifier_type, normalized_value); -- 같은 종류 식별자 중복 등록 방지
CREATE INDEX master_identifiers_entity_idx ON hub.master_identifiers (entity_type, entity_id);

-- 4.7 필드 변경 이력: 대표값 변경 전/후, 출처, 사유 보존
CREATE TABLE hub.master_field_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 필드 변경 이력 ID
    entity_type VARCHAR(50) NOT NULL,                          -- startup/expert/partner
    entity_id UUID NOT NULL,                                   -- 대상 마스터 ID
    field_name VARCHAR(100) NOT NULL,                          -- 변경된 필드명
    old_value TEXT NULL,                                       -- 이전 값
    new_value TEXT NULL,                                       -- 새 값
    source_domain VARCHAR(50) NULL,                            -- 변경 출처
    changed_by UUID REFERENCES auth.users(id),                -- 변경자
    changed_at TIMESTAMPTZ DEFAULT now(),                     -- 변경 시각
    change_reason TEXT NULL                                    -- 변경 사유
);
COMMENT ON TABLE hub.master_field_history IS '마스터 대표값 변경 이력';

CREATE INDEX master_field_history_entity_idx ON hub.master_field_history (entity_type, entity_id);
