-- Phase 1.4 — Custom Access Token Hook (JWT 권한 주입)
-- 근거: yna_suite_auth_permissions.md §9·§13, 0_CLAUDE.md §4
--       (로그인/토큰 갱신 시 app_metadata.permissions 를 실어 발급 → RLS No-Join 판정)
--
-- 목적: access token 발급/갱신 시점마다 dev.user_permissions 를 읽어
--       claims.app_metadata.permissions(도메인별 read/write/scope/expires_at)와
--       claims.app_metadata.roles(역할 배열)를 주입한다.
--       권한 변경 후 토큰이 갱신되면 새 권한이 자동 반영된다.
--
-- config.toml [auth.hook.custom_access_token] 에
--   uri = "pg-functions://postgres/dev/custom_access_token_hook" 로 등록한다.
-- 훅은 supabase_auth_admin 역할로 실행되므로 해당 역할에 실행/조회 권한을 부여한다.

CREATE OR REPLACE FUNCTION dev.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    claims JSONB;
    perms JSONB;
    roles JSONB;
    uid UUID;
BEGIN
    uid := (event ->> 'user_id')::UUID;
    claims := event -> 'claims';

    -- 접근 권한이 하나라도 있는(read 또는 write) 도메인만 claim 에 싣는다.
    SELECT COALESCE(
        jsonb_object_agg(
            domain_name,
            jsonb_build_object(
                'can_read', (can_read OR can_write),  -- can_write ⇒ can_read 강제
                'can_write', can_write,
                'scope_type', scope_type,
                'scope_id', scope_id,
                'expires_at', expires_at
            )
        ),
        '{}'::jsonb
    )
    INTO perms
    FROM dev.user_permissions
    WHERE user_id = uid AND (can_read OR can_write);

    SELECT COALESCE(jsonb_agg(DISTINCT role_key), '[]'::jsonb)
    INTO roles
    FROM dev.user_permissions
    WHERE user_id = uid AND (can_read OR can_write);

    IF claims ? 'app_metadata' THEN
        claims := jsonb_set(claims, '{app_metadata,permissions}', perms);
        claims := jsonb_set(claims, '{app_metadata,roles}', roles);
    ELSE
        claims := jsonb_set(
            claims,
            '{app_metadata}',
            jsonb_build_object('permissions', perms, 'roles', roles)
        );
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;
COMMENT ON FUNCTION dev.custom_access_token_hook(JSONB) IS
  'Auth Hook: 토큰 발급/갱신 시 dev.user_permissions 를 app_metadata.permissions/roles 로 주입';

-- 훅 실행 주체(supabase_auth_admin)에 권한 부여, 일반 역할에는 노출 금지.
GRANT USAGE ON SCHEMA dev TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION dev.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION dev.custom_access_token_hook(JSONB) FROM authenticated, anon, public;

-- 훅이 RLS(기본 deny) 하에서도 권한 원장을 읽을 수 있도록 조회 권한 + 전용 정책.
GRANT SELECT ON dev.user_permissions TO supabase_auth_admin;
CREATE POLICY "auth admin reads permissions"
    ON dev.user_permissions
    AS PERMISSIVE
    FOR SELECT
    TO supabase_auth_admin
    USING (TRUE);
