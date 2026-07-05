-- Phase 1.3 — 논리 스키마 및 공통 helper
-- 근거: yna_suite_data_model.md §(스키마 목록), yna_suite_database_operations.md §2·§3
--
-- 목적: Y&A Suite 전용 논리 스키마를 생성하고, 업무 테이블에서 공통으로 사용할
--       updated_at 자동 갱신 트리거 함수를 등록한다.
--
-- hub/admin/staging 을 우선 사용하고, ac/mna/project/fund/management 는 이후 Phase에서
-- 테이블을 붙일 수 있도록 스키마 뼈대만 미리 준비한다(구조만 준비).

-- 우선 사용 스키마
CREATE SCHEMA IF NOT EXISTS hub;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS staging;

-- 도메인 앱 스키마 (Phase 2+ 에서 테이블 추가, 지금은 뼈대만)
CREATE SCHEMA IF NOT EXISTS ac;
CREATE SCHEMA IF NOT EXISTS mna;
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS fund;
CREATE SCHEMA IF NOT EXISTS management;

-- 공통 updated_at 자동 갱신 트리거 함수.
-- admin 스키마(계정·권한·시스템 담당)에 두어, 모든 업무 테이블의 BEFORE UPDATE 트리거에서 재사용한다.
CREATE OR REPLACE FUNCTION admin.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION admin.set_updated_at() IS
  '업무 테이블 공통 트리거: UPDATE 시 updated_at 을 now() 로 자동 갱신';
