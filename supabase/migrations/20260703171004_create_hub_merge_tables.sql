-- Phase 1.3 — hub 병합 테이블 (중복 후보/병합 이벤트)
-- 근거: yna_suite_data_model.md §4.8~4.9, yna_suite_database_operations.md §12
--
-- 목적: 중복 의심 후보와 실제 병합 이력을 저장한다.
--       병합은 삭제/덮어쓰기가 아니라 이력 기반이며, 타 도메인 FK 반영은
--       merge_events.sync_status / affected_records 를 근거로 비동기 워커가 처리한다.

-- 4.8 중복 의심 후보
CREATE TABLE hub.merge_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 병합 후보 ID
    entity_type VARCHAR(50) NOT NULL,                          -- startup/expert/partner
    source_entity_id UUID NOT NULL,                            -- 병합될 가능성이 있는 신규/임시 레코드
    target_entity_id UUID NOT NULL,                            -- 기존 최종 마스터 후보
    score NUMERIC(5, 2) NOT NULL,                              -- 유사도 점수
    reasons JSONB DEFAULT '[]'::jsonb,                         -- 매칭 사유: 이름 유사, 연락처 일치 등
    status VARCHAR(50) DEFAULT 'pending',                     -- pending/approved/rejected/ignored/expired/on_hold
    reviewed_by UUID REFERENCES auth.users(id),               -- 검토자
    reviewed_at TIMESTAMPTZ NULL,                             -- 검토 시각
    created_at TIMESTAMPTZ DEFAULT now()                      -- 후보 생성 시각
);
COMMENT ON TABLE hub.merge_candidates IS '중복 의심 병합 후보';

CREATE INDEX merge_candidates_type_status_idx ON hub.merge_candidates (entity_type, status);
CREATE INDEX merge_candidates_source_idx ON hub.merge_candidates (source_entity_id);
CREATE INDEX merge_candidates_target_idx ON hub.merge_candidates (target_entity_id);

-- 4.9 실제 병합 이벤트
CREATE TABLE hub.merge_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 실제 병합 이벤트 ID
    entity_type VARCHAR(50) NOT NULL,                          -- startup/expert/partner
    source_entity_id UUID NOT NULL,                            -- 병합되어 비활성화되는 레코드
    target_entity_id UUID NOT NULL,                            -- 최종으로 남는 마스터 레코드
    merge_policy JSONB DEFAULT '{}'::jsonb,                    -- 필드별 우선순위/승계 정책
    affected_records JSONB DEFAULT '[]'::jsonb,                -- 비동기적으로 업데이트될/된 도메인 FK 목록
    sync_status VARCHAR(50) DEFAULT 'pending',                -- 비동기 동기화 상태: pending/processing/completed/failed
    before_snapshot JSONB NOT NULL,                            -- 병합 전 데이터 스냅샷
    after_snapshot JSONB NOT NULL,                             -- 병합 후 데이터 스냅샷
    reason TEXT NULL,                                          -- 병합 사유
    approved_by UUID REFERENCES auth.users(id),               -- 병합 승인자
    created_at TIMESTAMPTZ DEFAULT now()                      -- 병합 시각
);
COMMENT ON TABLE hub.merge_events IS '실제 병합 이벤트(스냅샷/비동기 반영 상태 포함)';

CREATE INDEX merge_events_type_idx ON hub.merge_events (entity_type);
CREATE INDEX merge_events_sync_status_idx ON hub.merge_events (sync_status); -- 비동기 워커 폴링용
CREATE INDEX merge_events_target_idx ON hub.merge_events (target_entity_id);
CREATE INDEX merge_events_source_idx ON hub.merge_events (source_entity_id);
