-- Phase 1.10 — 병합 최종 마스터 resolve view
-- 근거: yna_suite_master_data_policy.md §10.3, yna_suite_api_contracts.md §14
--
-- 목적: 2단계 비동기 병합에서 타 도메인 FK 반영이 진행 중이어도, 업무 도메인 조회가
--       항상 최종 마스터를 가리키도록 표준 resolve view 를 제공한다.
-- 규칙: 업무 도메인 앱(work, fund, mna 등)은 hub 마스터를 직접 조인하며 COALESCE 를 반복 작성하지 않고,
--       이 view(또는 packages/database 의 resolveMasterId helper)를 경유한다.

-- 스타트업 resolve view
CREATE OR REPLACE VIEW hub.resolved_startups AS
SELECT
    source.id                                          AS source_startup_id,   -- 업무 FK 가 참조 중인(병합 전) id
    COALESCE(source.merged_into_id, source.id)         AS resolved_startup_id,  -- 조회 시 사용할 최종 마스터 id
    target.master_code                                 AS resolved_master_code,
    target.name                                        AS resolved_name,
    target.status                                      AS resolved_status
FROM hub.startups source
JOIN hub.startups target
  ON target.id = COALESCE(source.merged_into_id, source.id);
COMMENT ON VIEW hub.resolved_startups IS '병합 반영 중에도 최종 스타트업 마스터를 보장하는 resolve view';

-- 전문가 resolve view
CREATE OR REPLACE VIEW hub.resolved_experts AS
SELECT
    source.id                                          AS source_expert_id,
    COALESCE(source.merged_into_id, source.id)         AS resolved_expert_id,
    target.master_code                                 AS resolved_master_code,
    target.name                                        AS resolved_name,
    target.status                                      AS resolved_status
FROM hub.experts source
JOIN hub.experts target
  ON target.id = COALESCE(source.merged_into_id, source.id);
COMMENT ON VIEW hub.resolved_experts IS '병합 반영 중에도 최종 전문가 마스터를 보장하는 resolve view';

-- 협력사 resolve view
CREATE OR REPLACE VIEW hub.resolved_partners AS
SELECT
    source.id                                          AS source_partner_id,
    COALESCE(source.merged_into_id, source.id)         AS resolved_partner_id,
    target.master_code                                 AS resolved_master_code,
    target.name                                        AS resolved_name,
    target.status                                      AS resolved_status
FROM hub.partners source
JOIN hub.partners target
  ON target.id = COALESCE(source.merged_into_id, source.id);
COMMENT ON VIEW hub.resolved_partners IS '병합 반영 중에도 최종 협력사 마스터를 보장하는 resolve view';
