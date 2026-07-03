-- Phase 1.3 — hub 공통 테이블 (감사 로그/첨부)
-- 근거: yna_suite_data_model.md §12·§13, yna_suite_database_operations.md §11
--
-- 목적: 도메인 공통 민감 액션 감사 로그와 파일 첨부 메타데이터를 저장한다.
--       파일 본체는 Supabase Storage 에 두고 DB 에는 메타데이터만 저장한다.

-- §12 공통 감사 로그 (권한 변경 외 민감 액션 전반)
CREATE TABLE hub.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 감사 로그 ID
    actor_user_id UUID REFERENCES auth.users(id),             -- 액션 수행자
    domain_name VARCHAR(50) NOT NULL,                          -- 액션이 발생한 서비스 도메인
    entity_type VARCHAR(50) NOT NULL,                          -- 대상 엔티티 종류
    entity_id UUID NULL,                                       -- 대상 엔티티 ID
    action VARCHAR(50) NOT NULL,                               -- create/update/delete/approve/merge/download 등
    before_value JSONB NULL,                                   -- 변경 전 값
    after_value JSONB NULL,                                    -- 변경 후 값
    reason TEXT NULL,                                          -- 액션 사유
    created_at TIMESTAMPTZ DEFAULT now()                      -- 기록 시각
);
COMMENT ON TABLE hub.audit_logs IS '공통 민감 액션 감사 로그 (수정/삭제 불가 전제)';

CREATE INDEX audit_logs_entity_idx ON hub.audit_logs (domain_name, entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx ON hub.audit_logs (actor_user_id);
CREATE INDEX audit_logs_created_at_idx ON hub.audit_logs (created_at DESC);

-- §13 첨부파일 메타데이터 (본체는 Storage)
CREATE TABLE hub.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 첨부파일 메타데이터 ID
    domain_name VARCHAR(50) NOT NULL,                          -- 파일이 속한 서비스 도메인
    entity_type VARCHAR(50) NOT NULL,                          -- 파일이 연결된 엔티티 종류
    entity_id UUID NOT NULL,                                   -- 파일이 연결된 엔티티 ID
    bucket_name TEXT NOT NULL,                                 -- Supabase Storage bucket
    file_path TEXT NOT NULL,                                   -- Storage 내부 경로
    file_name TEXT NOT NULL,                                   -- 원본 파일명
    file_size BIGINT NULL,                                     -- 파일 크기
    mime_type TEXT NULL,                                       -- MIME type
    visibility VARCHAR(50) DEFAULT 'internal',                -- public/internal/restricted/owner_only
    uploaded_by UUID REFERENCES auth.users(id),               -- 업로드 사용자
    created_at TIMESTAMPTZ DEFAULT now()                      -- 업로드 시각
);
COMMENT ON TABLE hub.attachments IS '첨부파일 메타데이터 (본체는 Supabase Storage)';

CREATE INDEX attachments_entity_idx ON hub.attachments (domain_name, entity_type, entity_id);
