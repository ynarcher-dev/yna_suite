-- Phase 1.11 — 감사 로그 request_id 컬럼 추가
-- 근거: yna_suite_api_contracts.md §5, yna_suite_security_policy.md §15 (감사 로그 필드에 request_id 포함)
--
-- 목적: 감사 표준(§5·§15)은 request_id 를 필수 기록 항목으로 규정하나
--       1.3 마이그레이션(171005·171006)의 audit 테이블 DDL 에는 누락되어 있었다.
--       하나의 요청에서 발생한 여러 감사 항목을 상호 연관(correlate)할 수 있도록 컬럼을 보강한다.
--       기존 행은 request_id 가 없으므로 NULL 허용으로 추가한다(스키마 변경만, backfill 없음).

ALTER TABLE hub.audit_logs
    ADD COLUMN IF NOT EXISTS request_id TEXT NULL;                 -- 요청 상관관계 ID (req_<uuid>)
COMMENT ON COLUMN hub.audit_logs.request_id IS '동일 요청에서 발생한 감사 항목 상관관계 ID (audit 표준 §5)';

ALTER TABLE admin.permission_audit_logs
    ADD COLUMN IF NOT EXISTS request_id TEXT NULL;                 -- 요청 상관관계 ID (req_<uuid>)
COMMENT ON COLUMN admin.permission_audit_logs.request_id IS '동일 요청에서 발생한 감사 항목 상관관계 ID (audit 표준 §5)';
