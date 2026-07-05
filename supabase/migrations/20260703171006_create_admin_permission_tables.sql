-- Phase 1.3 — admin 권한/계정 테이블
-- 근거: yna_suite_data_model.md §5.1~5.3, §15(우선순위1),
--       yna_suite_auth_permissions.md(JWT app_metadata.permissions + expires_at)
--
-- 목적: 사용자별 도메인 권한, 권한 템플릿, 권한 변경 감사 로그를 생성한다.
--       실제 권한 판단/RLS helper 는 Phase 1.4 에서 이 테이블을 근거로 구현한다.
-- 참고: permission_templates 는 data_model §15 우선순위1 이며 user_permissions.role_key 의
--       근거이므로 Phase 1.3 에 함께 생성한다(4_memo.md 결정 기록 참고).

-- 5.1 사용자별 도메인 권한
CREATE TABLE admin.user_permissions (
    user_id UUID REFERENCES auth.users(id),                   -- 권한 대상 사용자
    domain_name VARCHAR(50) NOT NULL,                          -- hub/ac/fund 등 섹션 도메인
    role_key VARCHAR(50) NOT NULL,                             -- master/business_team 등 역할 템플릿
    can_read BOOLEAN DEFAULT FALSE,                            -- 해당 도메인 조회 가능 여부
    can_write BOOLEAN DEFAULT FALSE,                           -- 해당 도메인 생성/수정 가능 여부
    scope_type VARCHAR(50) DEFAULT 'none',                    -- global/self/company/program 등 데이터 범위
    scope_id UUID NULL,                                        -- scope 가 특정 자원을 가리킬 때의 대상 ID
    expires_at TIMESTAMPTZ NULL,                              -- 임시 권한 만료 시각
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 권한 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now(),                     -- 권한 수정 시각
    PRIMARY KEY (user_id, domain_name)
);
COMMENT ON TABLE admin.user_permissions IS '사용자×도메인 권한(No-Join JWT 캐싱의 원본)';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON admin.user_permissions
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- 5.2 권한 템플릿 (기본 도메인 권한 + scope 기본값)
CREATE TABLE admin.permission_templates (
    role_key VARCHAR(50) PRIMARY KEY,                          -- master/business_team/viewer 등 템플릿 키
    display_name TEXT NOT NULL,                                -- 화면 표시명
    description TEXT NULL,                                     -- 템플릿 설명
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,            -- 도메인별 read/write/scope 기본값
    is_system BOOLEAN DEFAULT TRUE,                            -- 시스템 기본 템플릿 여부
    status VARCHAR(50) DEFAULT 'active',                      -- active/inactive/archived
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
COMMENT ON TABLE admin.permission_templates IS '권한 템플릿(역할별 도메인 권한/scope 기본값)';

CREATE TRIGGER set_updated_at BEFORE UPDATE ON admin.permission_templates
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- 5.3 권한 변경 감사 로그
CREATE TABLE admin.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 감사 로그 ID
    actor_user_id UUID REFERENCES auth.users(id),             -- 권한을 변경한 관리자
    target_user_id UUID REFERENCES auth.users(id),            -- 권한이 변경된 사용자
    action VARCHAR(50) NOT NULL,                               -- grant/revoke/update/expire 등
    domain_name VARCHAR(50) NULL,                             -- 변경 대상 서비스 도메인
    before_value JSONB NULL,                                   -- 변경 전 권한 값
    after_value JSONB NULL,                                    -- 변경 후 권한 값
    reason TEXT NULL,                                          -- 변경 사유
    created_at TIMESTAMPTZ DEFAULT now()                      -- 기록 시각
);
COMMENT ON TABLE admin.permission_audit_logs IS '권한 변경 감사 로그 (수정/삭제 불가 전제)';

CREATE INDEX permission_audit_logs_target_idx ON admin.permission_audit_logs (target_user_id);
CREATE INDEX permission_audit_logs_actor_idx ON admin.permission_audit_logs (actor_user_id);
CREATE INDEX permission_audit_logs_created_at_idx ON admin.permission_audit_logs (created_at DESC);
