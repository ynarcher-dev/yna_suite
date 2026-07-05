-- Phase 1.3 — hub 마스터 원장 테이블
-- 근거: yna_suite_data_model.md §4.1~4.4, §3(ID/코드), §2(공통 컬럼)
--
-- 목적: 전사 마스터(스타트업/전문가/협력사/내부 임직원) 원장을 생성한다.
-- 규칙: 내부 PK 는 UUID, 사람이 보는 값은 master_code 등 별도 unique.
--       soft delete 는 status 로 표현하고 물리 삭제는 최소화한다.

-- 4.1 스타트업/기업 마스터 원장
CREATE TABLE hub.startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 PK. 다른 업무 테이블이 참조하는 기준 ID
    master_code VARCHAR(50) UNIQUE NOT NULL,                   -- 사람이 보는 전사 스타트업 코드
    name TEXT NOT NULL,                                        -- 현재 표시명. 예비창업팀명도 여기에 저장 가능
    legal_name TEXT NULL,                                      -- 법인 설립 후 공식 법인명
    normalized_name TEXT NOT NULL,                             -- 검색/중복 판단용 정규화 이름
    business_number VARCHAR(50) NULL,                          -- 사업자등록번호. 예비창업자는 NULL 가능
    corporation_number VARCHAR(50) NULL,                       -- 법인등록번호
    representative_name TEXT NULL,                             -- 대표자명. 예비창업 단계 중복 판단에 중요
    phone TEXT NULL,                                           -- 대표 연락처
    email TEXT NULL,                                           -- 대표 이메일 또는 회사 이메일
    website_url TEXT NULL,                                     -- 홈페이지 URL
    address TEXT NULL,                                         -- 본점/사업장 주소
    industry TEXT NULL,                                        -- 산업 분류 또는 내부 태그
    stage VARCHAR(50) NULL,                                    -- 예비창업, Seed, Series A 등 성장 단계
    source_domain VARCHAR(50) NULL,                            -- 최초 유입 서비스(ac, fund, mna 등)
    source_record_id UUID NULL,                               -- 최초 유입 서비스의 원본 레코드 ID
    verification_status VARCHAR(50) DEFAULT 'pending',        -- pending/verified/rejected/needs_review/temporary 등 마스터 검증 상태
    status VARCHAR(50) DEFAULT 'active',                      -- active/merged/archived/deleted 등 생명주기 상태
    merged_into_id UUID REFERENCES hub.startups(id),          -- 병합된 경우 최종 마스터 ID
    created_by UUID REFERENCES auth.users(id),                -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
COMMENT ON TABLE hub.startups IS '스타트업/기업 마스터 원장';

CREATE UNIQUE INDEX startups_business_number_uq
  ON hub.startups (business_number)
  WHERE business_number IS NOT NULL;                          -- 사업자번호가 있는 법인은 중복 생성을 방지
CREATE INDEX startups_normalized_name_idx ON hub.startups (normalized_name); -- 자동완성/유사도 검색용
CREATE INDEX startups_status_idx ON hub.startups (status);    -- active/merged/archived 목록 필터링용

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hub.startups
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- 4.2 전문가/멘토/평가위원 마스터 원장
CREATE TABLE hub.experts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 전문가 ID
    master_code VARCHAR(50) UNIQUE NOT NULL,                   -- 사람이 보는 전사 전문가 코드
    name TEXT NOT NULL,                                        -- 전문가 이름
    normalized_name TEXT NOT NULL,                             -- 검색/중복 판단용 이름
    email TEXT NULL,                                           -- 전문가 이메일. 중복 판단 보조 식별자
    phone TEXT NULL,                                           -- 전문가 연락처
    organization TEXT NULL,                                    -- 소속 기관/회사
    position TEXT NULL,                                        -- 직책/직함
    expertise_tags TEXT[] DEFAULT '{}',                        -- 전문 분야 태그
    source_domain VARCHAR(50) NULL,                            -- 최초 유입 서비스
    source_record_id UUID NULL,                               -- 최초 유입 원본 레코드 ID
    verification_status VARCHAR(50) DEFAULT 'pending',        -- pending/verified/rejected/needs_review/temporary 등 Hub 검증 상태
    status VARCHAR(50) DEFAULT 'active',                      -- active/merged/archived 등
    merged_into_id UUID REFERENCES hub.experts(id),           -- 병합된 경우 최종 전문가 ID
    created_by UUID REFERENCES auth.users(id),                -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
COMMENT ON TABLE hub.experts IS '전문가/멘토/평가위원 마스터 원장';

CREATE INDEX experts_normalized_name_idx ON hub.experts (normalized_name);
CREATE INDEX experts_status_idx ON hub.experts (status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hub.experts
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- 4.3 협력사/자문사/LP/기관 파트너 마스터 원장
CREATE TABLE hub.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 협력사 ID
    master_code VARCHAR(50) UNIQUE NOT NULL,                   -- 사람이 보는 전사 협력사 코드
    name TEXT NOT NULL,                                        -- 협력사/기관명
    normalized_name TEXT NOT NULL,                             -- 검색/중복 판단용 이름
    partner_type VARCHAR(50) NULL,                             -- LP, 자문사, 수행기관, 컨소시엄 파트너 등
    business_number VARCHAR(50) NULL,                          -- 사업자등록번호
    representative_name TEXT NULL,                             -- 대표자명
    phone TEXT NULL,                                           -- 대표 연락처
    email TEXT NULL,                                           -- 대표 이메일
    website_url TEXT NULL,                                     -- 홈페이지 URL
    address TEXT NULL,                                         -- 주소
    source_domain VARCHAR(50) NULL,                            -- 최초 유입 서비스
    source_record_id UUID NULL,                               -- 최초 유입 원본 레코드 ID
    verification_status VARCHAR(50) DEFAULT 'pending',        -- pending/verified/rejected/needs_review/temporary 등 Hub 검증 상태
    status VARCHAR(50) DEFAULT 'active',                      -- active/merged/archived 등
    merged_into_id UUID REFERENCES hub.partners(id),          -- 병합된 경우 최종 협력사 ID
    created_by UUID REFERENCES auth.users(id),                -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
COMMENT ON TABLE hub.partners IS '협력사/자문사/LP/기관 파트너 마스터 원장';

CREATE INDEX partners_normalized_name_idx ON hub.partners (normalized_name);
CREATE INDEX partners_status_idx ON hub.partners (status);
CREATE INDEX partners_business_number_idx
  ON hub.partners (business_number)
  WHERE business_number IS NOT NULL;                          -- 사업자번호는 중복 후보 판단에 강하게 반영(unique 아님)

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hub.partners
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();

-- 4.4 내부 임직원/심사역 프로필 (Supabase Auth 계정과 1:1)
CREATE TABLE hub.managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- 내부 임직원/심사역 프로필 ID
    user_id UUID UNIQUE REFERENCES auth.users(id),            -- Supabase Auth 계정과 1:1 연결
    employee_code VARCHAR(50) UNIQUE NULL,                    -- 사번 또는 내부 직원 코드
    name TEXT NOT NULL,                                        -- 이름
    email TEXT NOT NULL,                                       -- 업무 이메일
    department TEXT NULL,                                      -- 부서
    position TEXT NULL,                                        -- 직급
    role_title TEXT NULL,                                      -- 직책/역할명
    interest_areas TEXT[] DEFAULT '{}',                        -- 관심 투자 분야 또는 담당 분야
    status VARCHAR(50) DEFAULT 'active',                      -- 재직/휴직/퇴사/비활성 등
    created_by UUID REFERENCES auth.users(id),                -- 최초 등록자
    updated_by UUID REFERENCES auth.users(id),                -- 마지막 수정자
    created_at TIMESTAMPTZ DEFAULT now(),                     -- 생성 시각
    updated_at TIMESTAMPTZ DEFAULT now()                      -- 수정 시각
);
COMMENT ON TABLE hub.managers IS '내부 임직원/심사역 프로필 (auth.users 1:1)';

CREATE INDEX managers_status_idx ON hub.managers (status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON hub.managers
  FOR EACH ROW EXECUTE FUNCTION admin.set_updated_at();
