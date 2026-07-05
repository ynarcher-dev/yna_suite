-- Phase 1.4 — 공통 RLS Helper (No-Join JWT 파싱)
-- 근거: yna_suite_auth_permissions.md §9, yna_suite_rls_policy_matrix.md §5, 0_CLAUDE.md §4
--
-- 목적: 매 쿼리마다 admin.user_permissions 를 조인하는 성능 병목을 피하기 위해,
--       auth.jwt() 의 app_metadata.permissions(Custom Access Token Hook 로 주입)를
--       무조인(No-Join)으로 파싱해 도메인 read/write/scope 를 판정한다.
--
-- 핵심 규칙:
--   - can_write=true 이면 can_read=true (템플릿/RLS 양쪽에서 동일).
--   - expires_at <= now() 인 임시 권한은 access token 이 유효해도 즉시 차단.
--   - auth.uid() 가 NULL(미인증)이면 claim 이 없어 false 로 떨어진다.
--
-- 모든 함수는 STABLE + LANGUAGE SQL. RLS 정책 표현식에서 호출되므로
-- authenticated/anon 역할에 EXECUTE 권한을 부여한다(service_role 은 BYPASSRLS).

-- 도메인 읽기 권한. 임시 권한 만료는 즉시 차단.
CREATE OR REPLACE FUNCTION admin.can_read_domain(target_domain TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'can_read')::BOOLEAN,
        FALSE
    ) AND COALESCE(
        (auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'expires_at')::TIMESTAMPTZ > now(),
        TRUE
    );
$$;
COMMENT ON FUNCTION admin.can_read_domain(TEXT) IS
  'JWT app_metadata.permissions 무조인 파싱 — 도메인 읽기 권한(만료 임시 권한 차단)';

-- 도메인 쓰기 권한. 읽기 권한을 전제로 한다(can_write ⇒ can_read).
CREATE OR REPLACE FUNCTION admin.can_write_domain(target_domain TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT admin.can_read_domain(target_domain)
    AND COALESCE(
        (auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'can_write')::BOOLEAN,
        FALSE
    );
$$;
COMMENT ON FUNCTION admin.can_write_domain(TEXT) IS
  'JWT 무조인 파싱 — 도메인 쓰기 권한(can_read 를 전제로 강제)';

-- 도메인 scope_type. 읽기 권한이 없으면 'none'.
CREATE OR REPLACE FUNCTION admin.get_scope_type(target_domain TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT CASE
        WHEN admin.can_read_domain(target_domain) THEN COALESCE(
            auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'scope_type',
            'none'
        )
        ELSE 'none'
    END;
$$;
COMMENT ON FUNCTION admin.get_scope_type(TEXT) IS
  'JWT 무조인 파싱 — 도메인 데이터 scope_type(권한 없으면 none)';

-- 도메인 scope_id(company_id 등). scope 가 global/self 이거나 미지정이면 NULL.
CREATE OR REPLACE FUNCTION admin.get_scope_id(target_domain TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT CASE
        WHEN admin.can_read_domain(target_domain) THEN
            NULLIF(auth.jwt() -> 'app_metadata' -> 'permissions' -> target_domain ->> 'scope_id', '')::UUID
        ELSE NULL
    END;
$$;
COMMENT ON FUNCTION admin.get_scope_id(TEXT) IS
  'JWT 무조인 파싱 — 도메인 scope 대상 식별자(없으면 NULL)';

-- 역할 보유 여부. hook 이 app_metadata.roles 배열에 사용자 role_key 들을 싣는다.
CREATE OR REPLACE FUNCTION admin.has_role(target_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' -> 'roles') ? target_role,
        FALSE
    );
$$;
COMMENT ON FUNCTION admin.has_role(TEXT) IS
  'JWT app_metadata.roles 배열에 대상 역할 포함 여부(No-Join)';

-- 최고 관리자 여부. master 템플릿만 admin 접근을 받으므로 role 로 판정.
CREATE OR REPLACE FUNCTION admin.is_master()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT admin.has_role('master');
$$;
COMMENT ON FUNCTION admin.is_master() IS 'master 역할 보유 여부';

-- 마스터 병합 권한. Phase 1 은 hub 쓰기 권한자를 병합 가능자로 본다.
-- (rls_policy_matrix §9 "hub:write + merge 권한" — 세분화된 merge 플래그는 후속 Phase)
CREATE OR REPLACE FUNCTION admin.can_merge_master()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT admin.can_write_domain('hub');
$$;
COMMENT ON FUNCTION admin.can_merge_master() IS
  'Hub 마스터 병합 승인 권한(Phase 1 = hub:write)';

-- RLS 정책 표현식에서 호출 가능하도록 EXECUTE 부여.
GRANT USAGE ON SCHEMA admin TO authenticated, anon;
GRANT EXECUTE ON FUNCTION
    admin.can_read_domain(TEXT),
    admin.can_write_domain(TEXT),
    admin.get_scope_type(TEXT),
    admin.get_scope_id(TEXT),
    admin.has_role(TEXT),
    admin.is_master(),
    admin.can_merge_master()
TO authenticated, anon;
