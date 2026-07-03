-- Phase 1.3 — RLS 기본 활성화 (default deny)
-- 근거: yna_suite_data_model.md §14, yna_suite_database_operations.md §5, 0_CLAUDE.md §4
--
-- 목적: 모든 hub/dev 업무 테이블에 RLS 를 활성화한다.
--       정책(policy) 없이 RLS 만 켜면 authenticated/anon 역할에는 기본 deny 가 되어,
--       Phase 1.4 에서 명시 허용 정책을 붙이기 전까지 테이블이 열려 있지 않다.
--       (service_role 은 BYPASSRLS 로 서버 전용 관리/마이그레이션 작업에서만 사용)
--
-- 실제 read/write 분리 정책, scope(self/company/global) 제한, 외부 사용자 격리는
-- Phase 1.4 인증/권한 기반에서 별도 migration 으로 추가한다.

ALTER TABLE hub.startups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.experts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.partners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.managers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.master_aliases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.master_identifiers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.master_field_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.merge_candidates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.merge_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.attachments          ENABLE ROW LEVEL SECURITY;

ALTER TABLE dev.user_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.permission_audit_logs ENABLE ROW LEVEL SECURITY;
