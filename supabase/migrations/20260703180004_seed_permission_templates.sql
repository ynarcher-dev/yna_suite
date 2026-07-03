-- Phase 1.4 — 권한 템플릿 seed (시스템 기본 8종)
-- 근거: yna_suite_auth_permissions.md §6, yna_suite_rls_policy_matrix.md §3
--       (이슈13: 템플릿 seed 는 Phase 1.4/1.5 에서 처리)
--
-- permissions JSONB 는 packages/permissions 의 ROLE_TEMPLATE_MATRIX/ROLE_DEFAULT_SCOPE 와
-- 동일한 값이어야 한다. 외부 사용자만 self/company scope, 내부 역할은 global(Phase 1).
-- 재실행 안전을 위해 ON CONFLICT DO UPDATE(멱등).

INSERT INTO dev.permission_templates (role_key, display_name, description, permissions, is_system, status)
VALUES
  ('master', '최고 관리자',
   '전 서비스와 권한 관리 가능',
   jsonb_build_object(
     'hub',        jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'dev',        jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'work',       jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'mna',        jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'project',    jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'fund',       jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'management', jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global')
   ), TRUE, 'active'),

  ('executive', '경영진',
   '주요 서비스 읽기 중심 접근',
   jsonb_build_object(
     'hub',        jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'work',       jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'mna',        jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'project',    jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'fund',       jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'management', jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global')
   ), TRUE, 'active'),

  ('management_office', '경영지원',
   '조직/HR/성과 관리 중심',
   jsonb_build_object(
     'hub',        jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'work',       jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'project',    jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'fund',       jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'management', jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global')
   ), TRUE, 'active'),

  ('investment_team', '투자실',
   'Fund/M&A/Project 업무 중심',
   jsonb_build_object(
     'hub',        jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'work',       jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'mna',        jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'project',    jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'fund',       jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'management', jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global')
   ), TRUE, 'active'),

  ('business_team', '사업부',
   'Work/Project 업무 중심',
   jsonb_build_object(
     'hub',        jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'work',       jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'project',    jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'global'),
     'management', jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global')
   ), TRUE, 'active'),

  ('guest_expert', '외부 전문가',
   '배정된 평가/멘토링 중심',
   jsonb_build_object(
     'work',       jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'self')
   ), TRUE, 'active'),

  ('guest_startup', '참가 스타트업',
   '자기 회사/신청 정보 중심',
   jsonb_build_object(
     'work',       jsonb_build_object('can_read', true, 'can_write', true,  'scope_type', 'company')
   ), TRUE, 'active'),

  ('viewer', '제한적 뷰어',
   '제한적 읽기 전용',
   jsonb_build_object(
     'hub',        jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global'),
     'work',       jsonb_build_object('can_read', true, 'can_write', false, 'scope_type', 'global')
   ), TRUE, 'active')
ON CONFLICT (role_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    permissions  = EXCLUDED.permissions,
    is_system    = EXCLUDED.is_system,
    status       = EXCLUDED.status;
