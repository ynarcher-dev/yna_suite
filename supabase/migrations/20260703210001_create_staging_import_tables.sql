-- Phase 1.12 — staging 이관(import) 테이블
-- 근거: yna_suite_data_model.md §11, yna_suite_migration_strategy.md §5~6·15~16,
--       yna_suite_hub_dev_functional_spec.md §14
--
-- 목적: 기존 스타트업 DB/엑셀/시트를 Hub 마스터로 이관하기 전 원본값·매핑값·정규화값과
--       처리 결과(연결/생성/후보/실패)를 batch 단위로 보존한다.
-- 원칙: 원본은 훼손하지 않고 raw_payload 로 보존, 실패 row 는 버리지 않고 재처리 가능하게 기록,
--       rollback 은 물리 삭제 대신 status='archived' / import_batch_id 기준 비활성화(마이그레이션 §15).
-- 참고: staging 스키마는 20260703171001 에서 생성됨. staging 도 개인정보 보안/RLS 대상(data_model §11).

-- 11.1 import 작업 단위(batch)
CREATE TABLE staging.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- import batch ID
    source_type VARCHAR(50) NOT NULL,                          -- db/csv/xlsx/google_sheet/manual
    source_name TEXT NOT NULL,                                 -- 원본 이름(파일명/시스템명)
    entity_type VARCHAR(50) NOT NULL,                          -- startup/expert/partner/application 등
    is_dry_run BOOLEAN NOT NULL DEFAULT FALSE,                 -- dry-run(운영 미반영) 여부
    total_rows INTEGER DEFAULT 0,                              -- 전체 row 수
    processed_rows INTEGER DEFAULT 0,                          -- 처리 완료 row 수
    failed_rows INTEGER DEFAULT 0,                             -- 실패 row 수
    status VARCHAR(50) DEFAULT 'pending',                      -- pending/running/completed/failed/partial/archived
    started_by UUID REFERENCES auth.users(id),                 -- 실행자
    started_at TIMESTAMPTZ DEFAULT now(),                      -- 시작 시각
    finished_at TIMESTAMPTZ NULL,                              -- 종료 시각
    archived_at TIMESTAMPTZ NULL,                              -- rollback(비활성화) 시각
    summary JSONB DEFAULT '{}'::jsonb                          -- 결과 요약(신규/연결/후보/실패 수)
);
COMMENT ON TABLE staging.import_batches IS 'import 작업 단위(원본/실행자/상태/검증 리포트). rollback 은 status=archived';

CREATE INDEX import_batches_entity_status_idx ON staging.import_batches (entity_type, status);
CREATE INDEX import_batches_started_at_idx ON staging.import_batches (started_at DESC);

-- 11.2 스타트업 import row(원본·매핑·정규화·처리결과 보존)
CREATE TABLE staging.startup_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- import row ID
    import_batch_id UUID NOT NULL REFERENCES staging.import_batches(id), -- 같은 파일/작업을 묶는 batch ID
    source_name TEXT NOT NULL,                                 -- 원본 파일명/시스템명
    source_row_number INTEGER NULL,                            -- 원본 row 번호
    raw_payload JSONB NOT NULL,                                -- 원본 row 전체(매핑 안 된 컬럼 포함 보존)
    mapped_payload JSONB NULL,                                 -- 표준 컬럼으로 매핑한 값
    normalized_payload JSONB NULL,                             -- 검색/비교용 정규화 값
    import_status VARCHAR(50) DEFAULT 'pending',               -- pending/processed/failed/skipped
    decision_kind VARCHAR(50) NULL,                            -- connect/new_master/candidate/failed
    error_message TEXT NULL,                                   -- 실패 사유
    hub_entity_id UUID NULL REFERENCES hub.startups(id),       -- 연결/생성된 hub.startups.id
    created_at TIMESTAMPTZ DEFAULT now(),                      -- 생성 시각
    processed_at TIMESTAMPTZ NULL                              -- 처리 시각
);
COMMENT ON TABLE staging.startup_import_rows IS '스타트업 import row(raw/mapped/normalized/처리결과). raw_payload 는 개인정보 보안 대상';

CREATE INDEX startup_import_rows_batch_idx ON staging.startup_import_rows (import_batch_id);
CREATE INDEX startup_import_rows_status_idx ON staging.startup_import_rows (import_status);
CREATE INDEX startup_import_rows_hub_entity_idx ON staging.startup_import_rows (hub_entity_id);

-- =============================================================================
-- RLS — staging 도 개인정보 보안 대상(data_model §11). import 는 hub 관리자 작업이므로
--   SELECT: hub 읽기 / INSERT·UPDATE: hub 쓰기 / DELETE: 금지(rollback = status=archived UPDATE).
--   service_role 은 BYPASSRLS 로 batch 처리에서 통과(api_contracts §3 — service role 은 batch 전용).
-- =============================================================================
ALTER TABLE staging.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.startup_import_rows ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA staging TO authenticated;

CREATE POLICY "import batches read"   ON staging.import_batches FOR SELECT TO authenticated USING (dev.can_read_domain('hub'));
CREATE POLICY "import batches insert" ON staging.import_batches FOR INSERT TO authenticated WITH CHECK (dev.can_write_domain('hub'));
CREATE POLICY "import batches update" ON staging.import_batches FOR UPDATE TO authenticated USING (dev.can_write_domain('hub')) WITH CHECK (dev.can_write_domain('hub'));

CREATE POLICY "import rows read"   ON staging.startup_import_rows FOR SELECT TO authenticated USING (dev.can_read_domain('hub'));
CREATE POLICY "import rows insert" ON staging.startup_import_rows FOR INSERT TO authenticated WITH CHECK (dev.can_write_domain('hub'));
CREATE POLICY "import rows update" ON staging.startup_import_rows FOR UPDATE TO authenticated USING (dev.can_write_domain('hub')) WITH CHECK (dev.can_write_domain('hub'));
