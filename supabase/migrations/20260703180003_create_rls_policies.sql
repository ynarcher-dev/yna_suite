-- Phase 1.4 — 기본 RLS 정책 (명시 허용)
-- 근거: yna_suite_rls_policy_matrix.md §6~11·§17, yna_suite_auth_permissions.md §9
--
-- 전제: Phase 1.3 에서 hub/admin 14개 테이블에 RLS 를 default deny 로 켜 두었다(이슈12).
--       여기서 도메인 권한 helper(admin.can_*_domain 등) 기반 명시 허용 정책을 붙인다.
--
-- 원칙:
--   - read/write 분리(SELECT vs INSERT/UPDATE).
--   - 물리 삭제 금지 → DELETE 정책을 두지 않아 authenticated 는 항상 차단(soft delete = UPDATE).
--   - 감사/권한/병합 이벤트의 INSERT 는 정책 없음 = service_role(서버 전용)만 기록.
--   - 외부 사용자(self/company)용 제한 view/정책은 Work 테이블이 생기는 Phase 1.13/2 에서 추가.
--
-- 모든 정책은 TO authenticated. service_role 은 BYPASSRLS 로 정책과 무관하게 통과.

-- =============================================================================
-- Hub 마스터 원장 (startups/experts/partners/managers) — §6·§7
--   SELECT: hub 읽기 / INSERT·UPDATE: hub 쓰기 / DELETE: 금지
-- =============================================================================
CREATE POLICY "startups read"   ON hub.startups FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));
CREATE POLICY "startups insert" ON hub.startups FOR INSERT TO authenticated WITH CHECK (admin.can_write_domain('hub'));
CREATE POLICY "startups update" ON hub.startups FOR UPDATE TO authenticated USING (admin.can_write_domain('hub')) WITH CHECK (admin.can_write_domain('hub'));

CREATE POLICY "experts read"   ON hub.experts FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));
CREATE POLICY "experts insert" ON hub.experts FOR INSERT TO authenticated WITH CHECK (admin.can_write_domain('hub'));
CREATE POLICY "experts update" ON hub.experts FOR UPDATE TO authenticated USING (admin.can_write_domain('hub')) WITH CHECK (admin.can_write_domain('hub'));

CREATE POLICY "partners read"   ON hub.partners FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));
CREATE POLICY "partners insert" ON hub.partners FOR INSERT TO authenticated WITH CHECK (admin.can_write_domain('hub'));
CREATE POLICY "partners update" ON hub.partners FOR UPDATE TO authenticated USING (admin.can_write_domain('hub')) WITH CHECK (admin.can_write_domain('hub'));

CREATE POLICY "managers read"   ON hub.managers FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));
CREATE POLICY "managers insert" ON hub.managers FOR INSERT TO authenticated WITH CHECK (admin.can_write_domain('hub'));
CREATE POLICY "managers update" ON hub.managers FOR UPDATE TO authenticated USING (admin.can_write_domain('hub')) WITH CHECK (admin.can_write_domain('hub'));

-- =============================================================================
-- Hub 마스터 부속 (aliases/identifiers/field_history) — §8
--   상위 마스터와 동일한 hub read/write 기준. 원문 마스킹은 API/view 계층에서 처리.
-- =============================================================================
CREATE POLICY "aliases read"   ON hub.master_aliases FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));
CREATE POLICY "aliases insert" ON hub.master_aliases FOR INSERT TO authenticated WITH CHECK (admin.can_write_domain('hub'));
CREATE POLICY "aliases update" ON hub.master_aliases FOR UPDATE TO authenticated USING (admin.can_write_domain('hub')) WITH CHECK (admin.can_write_domain('hub'));

CREATE POLICY "identifiers read"   ON hub.master_identifiers FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));
CREATE POLICY "identifiers insert" ON hub.master_identifiers FOR INSERT TO authenticated WITH CHECK (admin.can_write_domain('hub'));
CREATE POLICY "identifiers update" ON hub.master_identifiers FOR UPDATE TO authenticated USING (admin.can_write_domain('hub')) WITH CHECK (admin.can_write_domain('hub'));

CREATE POLICY "field history read"   ON hub.master_field_history FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));
CREATE POLICY "field history insert" ON hub.master_field_history FOR INSERT TO authenticated WITH CHECK (admin.can_write_domain('hub'));

-- =============================================================================
-- Hub 병합 (merge_candidates/merge_events) — §9
--   후보 조회/승인은 병합 권한자만. 병합 이벤트 조회는 hub 읽기, 기록은 service_role.
-- =============================================================================
CREATE POLICY "merge candidates read"   ON hub.merge_candidates FOR SELECT TO authenticated USING (admin.can_merge_master());
CREATE POLICY "merge candidates insert" ON hub.merge_candidates FOR INSERT TO authenticated WITH CHECK (admin.can_merge_master());
CREATE POLICY "merge candidates update" ON hub.merge_candidates FOR UPDATE TO authenticated USING (admin.can_merge_master()) WITH CHECK (admin.can_merge_master());

CREATE POLICY "merge events read" ON hub.merge_events FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));

-- =============================================================================
-- Hub 공통 (audit_logs/attachments) — §10·§17
--   감사 로그는 hub 읽기로 조회, 기록은 service_role 만(정책 없음), 수정/삭제 불가.
--   첨부는 행의 domain_name 기준 도메인 권한으로 조회/기록.
-- =============================================================================
CREATE POLICY "audit logs read" ON hub.audit_logs FOR SELECT TO authenticated USING (admin.can_read_domain('hub'));

CREATE POLICY "attachments read"
    ON hub.attachments FOR SELECT TO authenticated
    USING (admin.can_read_domain(domain_name));
CREATE POLICY "attachments insert"
    ON hub.attachments FOR INSERT TO authenticated
    WITH CHECK (admin.can_write_domain(domain_name));
CREATE POLICY "attachments update"
    ON hub.attachments FOR UPDATE TO authenticated
    USING (admin.can_write_domain(domain_name))
    WITH CHECK (admin.can_write_domain(domain_name));

-- =============================================================================
-- Dev 권한 테이블 (user_permissions/permission_templates/permission_audit_logs) — §11
--   본인 권한은 본인이 조회 가능, 그 외는 admin 권한자. 변경은 admin 쓰기.
--   (supabase_auth_admin 의 user_permissions 조회 정책은 access token hook 마이그레이션에서 부여)
-- =============================================================================
CREATE POLICY "user permissions read"
    ON admin.user_permissions FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR admin.can_read_domain('admin'));
CREATE POLICY "user permissions insert"
    ON admin.user_permissions FOR INSERT TO authenticated
    WITH CHECK (admin.can_write_domain('admin'));
CREATE POLICY "user permissions update"
    ON admin.user_permissions FOR UPDATE TO authenticated
    USING (admin.can_write_domain('admin'))
    WITH CHECK (admin.can_write_domain('admin'));

CREATE POLICY "permission templates read"
    ON admin.permission_templates FOR SELECT TO authenticated
    USING (admin.can_read_domain('admin'));
CREATE POLICY "permission templates insert"
    ON admin.permission_templates FOR INSERT TO authenticated
    WITH CHECK (admin.can_write_domain('admin'));
CREATE POLICY "permission templates update"
    ON admin.permission_templates FOR UPDATE TO authenticated
    USING (admin.can_write_domain('admin'))
    WITH CHECK (admin.can_write_domain('admin'));

CREATE POLICY "permission audit logs read"
    ON admin.permission_audit_logs FOR SELECT TO authenticated
    USING (admin.can_read_domain('admin'));
