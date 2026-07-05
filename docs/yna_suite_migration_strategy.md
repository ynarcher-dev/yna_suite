# Y&ARCHER WORKS 데이터 마이그레이션 전략 가이드

> 2026-07-04 아키텍처 개편: 서비스별 7개 앱 구조를 **WORKS 단일 내부 앱(apps/works) + GUEST 외부 포털(apps/guest)** 2앱 구조로 변경했다(권한 도메인/스키마 키: dev→admin, work→ac). 본 문서는 명칭 참조만 개편 기준으로 갱신되었다.

본 문서는 기존 스타트업 DB, 엑셀/시트, 업무별 산재 데이터를 Hub 마스터(hub 스키마) 중심의 통합 데이터 구조로 이관하기 위한 전략을 정의한다.

Y&ARCHER WORKS의 마이그레이션은 단순한 데이터 복사가 아니다. 기존 데이터를 Hub 마스터로 옮기면서 **출처, 식별 단서, 중복 후보, 변경 이력, 실패 이력**을 함께 남기는 과정이다.

## 1. 기본 원칙

마이그레이션은 다음 원칙을 따른다.

```txt
원본 데이터는 훼손하지 않는다.
이관 데이터의 출처를 반드시 남긴다.
사업자등록번호/법인번호가 없어도 정상 데이터로 수용한다.
공식 식별자가 없으면 자동 병합하지 않는다.
이름/연락처/이메일/도메인 등 식별 단서를 함께 저장한다.
중복 의심 데이터는 merge_candidates로 보낸다.
실패한 row는 버리지 않고 재처리 가능하게 기록한다.
```

## 2. 마이그레이션 대상

1차 마이그레이션 대상은 다음이다.

```txt
기존 스타트업 DB
기존 전문가/멘토 명단
기존 협력사/기관 명단
기존 프로그램 신청 이력
기존 멘토링/평가 이력
기존 엑셀/구글시트 자료
```

우선순위:

```txt
1. 스타트업 마스터
2. 전문가 마스터
3. 협력사 마스터
4. AC 프로그램/신청 이력 (ac 스키마, 구 work)
5. 멘토링/평가 이력
6. FUND/M&A/PROJECT 관련 이력
```

## 3. 마이그레이션 단계

전체 흐름은 다음과 같다.

```txt
1. 원본 수집
2. 원본 백업
3. 컬럼 매핑
4. 데이터 정규화
5. 임시 staging 적재
6. Hub 마스터 생성/연결
7. 식별자 및 alias 생성
8. 중복 후보 생성
9. 업무 이력 연결
10. 검증 리포트 생성
11. 운영자 검토 및 보정
```

## 4. 원본 보존

마이그레이션 전 원본 파일/DB dump는 반드시 보존한다.

보존 대상:

```txt
원본 DB dump
원본 엑셀 파일
원본 CSV
원본 구글시트 export
컬럼 매핑표
이관 실행 로그
실패 row 로그
```

원본은 수정하지 않고, 모든 변환은 staging 또는 import script에서 수행한다.

## 5. Staging 테이블

마이그레이션 중간 단계에는 staging 테이블을 둔다. staging은 원본값과 정규화값을 함께 보존한다.

예시:

```sql
CREATE SCHEMA staging;

CREATE TABLE staging.startup_import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- import row ID
    import_batch_id UUID NOT NULL REFERENCES staging.import_batches(id), -- 같은 파일/작업을 묶는 batch ID
    source_name TEXT NOT NULL,                                 -- 원본 파일명/시스템명
    source_row_number INTEGER NULL,                            -- 원본 row 번호
    raw_payload JSONB NOT NULL,                                -- 원본 row 전체
    mapped_payload JSONB NULL,                                 -- 표준 컬럼으로 매핑한 값
    normalized_payload JSONB NULL,                             -- 검색/비교용 정규화 값
    import_status VARCHAR(50) DEFAULT 'pending',               -- pending/processed/failed/skipped
    decision_kind VARCHAR(50) NULL,                            -- connect/new_master/candidate/failed(판정 결과)
    error_message TEXT NULL,                                   -- 실패 사유
    hub_entity_id UUID NULL REFERENCES hub.startups(id),        -- 생성/연결된 hub.startups.id
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ NULL
);
```

> DDL 기준 문서는 `yna_suite_data_model.md` §11이다. 이 문서의 DDL은 그 사본이며, 변경 시 두 문서를 함께 갱신한다. (Phase 1.12에서 `decision_kind` 추가)

staging 테이블은 운영 DB에 오래 남길 수도 있고, 별도 보관 정책에 따라 archive할 수도 있다.

## 6. Import Batch

마이그레이션 작업 단위는 batch로 관리한다.

```sql
CREATE TABLE staging.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),             -- import batch ID
    source_type VARCHAR(50) NOT NULL,                         -- db/csv/xlsx/google_sheet/manual
    source_name TEXT NOT NULL,                                -- 원본 이름
    entity_type VARCHAR(50) NOT NULL,                         -- startup/expert/partner/application 등
    is_dry_run BOOLEAN NOT NULL DEFAULT FALSE,                 -- dry-run(운영 미반영) 여부
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',                     -- pending/running/completed/failed/partial/archived
    started_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ NULL,
    archived_at TIMESTAMPTZ NULL,                              -- rollback(비활성화) 시각
    summary JSONB DEFAULT '{}'::jsonb
);
```

> Phase 1.12에서 `is_dry_run`(§16 dry-run), `archived_at`·status `archived`(§15 rollback)를 추가했다. DDL 기준 문서는 `yna_suite_data_model.md` §11.

batch를 두는 이유:

```txt
어떤 파일에서 들어온 데이터인지 추적할 수 있다.
실패 row만 재처리할 수 있다.
이관 결과를 운영자에게 리포트할 수 있다.
```

## 7. 컬럼 매핑

기존 DB와 Hub 모델의 컬럼명이 다를 수 있으므로 매핑표를 먼저 만든다.

예시:

| 원본 컬럼 | 표준 필드 | 대상 |
| :--- | :--- | :--- |
| 회사명 | name | `hub.startups.name` |
| 법인명 | legal_name | `hub.startups.legal_name` |
| 대표자 | representative_name | `hub.startups.representative_name` |
| 사업자번호 | business_number | `hub.startups.business_number` |
| 연락처 | phone | `hub.startups.phone` |
| 이메일 | email | `hub.startups.email` |
| 홈페이지 | website_url | `hub.startups.website_url` |
| 산업분야 | industry | `hub.startups.industry` |
| 비고 | raw_payload.memo | staging 원본 보존 |

매핑되지 않는 원본 컬럼은 버리지 않고 `raw_payload`에 보존한다.

## 8. 정규화 규칙

중복 후보 생성을 위해 비교용 값을 정규화한다.

정규화 대상:

```txt
회사명/팀명
대표자명
전화번호
이메일
웹사이트 도메인
사업자등록번호
법인등록번호
```

정규화 예시:

```txt
주식회사 알파테크 -> 알파테크
(주)알파테크 -> 알파테크
알파 Tech -> 알파tech
010-1234-5678 -> 01012345678
HTTPS://www.alpha.co.kr/about -> alpha.co.kr
```

주의:

```txt
정규화값은 비교용이다.
사용자에게 표시할 원본값은 보존한다.
정규화 과정에서 원본 의미를 훼손하지 않는다.
```

## 9. Hub 마스터 생성/연결 정책

각 import row는 다음 중 하나로 처리된다.

```txt
기존 Hub 마스터에 연결
신규 정식 Hub 마스터 생성
신규 임시 Hub 마스터 생성
중복 후보로 보류
실패 row로 기록
```

판정 기준:

```txt
강한 식별자 일치:
  기존 Hub 마스터에 연결 가능

공식 번호 없음 + 여러 단서 일치:
  merge_candidates 생성 후 운영자 검토

일치 후보 없음:
  신규 임시 또는 정식 마스터 생성

필수값 누락:
  failed 처리 (error_message에 누락 항목 기록, 검토 후 재처리)
```

스타트업의 경우 사업자번호가 없어도 생성 가능해야 한다.

```txt
name 또는 team_name이 있으면 최소 임시 마스터 생성 가능
representative_name, phone, email은 식별 단서로 저장
```

## 10. 식별자/별칭 생성

마이그레이션 과정에서 원본값은 Hub 마스터의 식별 단서로 저장한다.

저장 위치:

```txt
hub.master_identifiers
hub.master_aliases
hub.master_field_history
```

예시:

```txt
회사명 -> hub.startups.name
과거명/팀명/브랜드명 -> hub.master_aliases
사업자번호/전화번호/이메일/도메인 -> hub.master_identifiers
원본 row 전체 -> staging.raw_payload
```

## 11. 중복 후보 생성

import row가 기존 Hub 마스터와 유사하면 `hub.merge_candidates`를 생성한다.

후보 생성 예시:

```txt
기존 Hub:
알파테크 / 홍길동

Import row:
주식회사 알파테크 / 홍길동 / 사업자번호 없음

처리:
merge_candidates 생성
score = 86
reasons = ["normalized_name_similar", "representative_name_match"]
```

자동 병합 금지 조건:

```txt
사업자번호/법인번호가 없음
대표자명이 충돌함
검증된 이메일이 다름
검증된 전화번호가 다름
동명이인 가능성이 높음
```

## 12. 업무 이력 연결

기존 프로그램 신청/평가/멘토링 이력을 이관할 때는 먼저 대상 스타트업/전문가 마스터를 resolve한다.

예시:

```txt
기존 신청 row
- 프로그램명: 2025 액셀러레이팅
- 회사명: 알파테크
- 대표자: 홍길동

처리:
1. hub.startups 후보 검색
2. 기존 마스터가 명확하면 startup_id 연결
3. 불명확하면 임시 startup 생성 후 application 연결
4. merge_candidates 생성
```

중요:

```txt
업무 이력은 유실하지 않는다.
마스터가 애매해도 이력은 임시 마스터에 연결한다.
이후 병합 승인 시 최종 마스터로 귀속한다.
```

## 13. 실패 처리

마이그레이션 중 실패한 row는 버리지 않는다.

상태 컬럼(`import_status`)은 스키마 기준 4종만 사용한다:

```txt
pending / processed / failed / skipped
```

세부 실패 유형은 상태값이 아니라 `error_message`(실패 사유)에 기록한다:

```txt
필수값 누락 (needs review)
형식 오류 (invalid format)
동일한 강한 식별자가 여러 마스터에 존재 (duplicate blocked)
```

실패 row에는 다음을 남긴다.

```txt
원본 row
실패 사유
실패 단계
재처리 가능 여부
처리 시각
```

예시:

```txt
회사명 없음
전화번호 형식 오류
필수 프로그램 코드 없음
연결 대상 프로그램 없음
동일한 강한 식별자가 여러 마스터에 존재
```

## 14. 검증 리포트

마이그레이션 후 batch별 검증 리포트를 생성한다.

리포트 항목:

```txt
총 row 수
성공 row 수
실패 row 수
신규 마스터 생성 수
기존 마스터 연결 수
임시 마스터 생성 수
중복 후보 생성 수
필수값 누락 수
수동 검토 필요 row 수
```

운영자가 확인할 질문:

```txt
예상보다 신규 마스터가 너무 많이 생성되지 않았는가?
중복 후보가 과도하게 많지 않은가?
필수값 누락 패턴이 반복되지 않는가?
특정 원본 컬럼 매핑이 잘못되지 않았는가?
```

## 15. Rollback 전략

마이그레이션은 batch 단위로 되돌릴 수 있어야 한다.

Rollback 대상:

```txt
해당 batch에서 생성된 Hub 마스터
해당 batch에서 생성된 identifiers
해당 batch에서 생성된 aliases
해당 batch에서 생성된 merge_candidates
해당 batch에서 생성된 업무 이력
```

권장:

```txt
물리 삭제보다 status='archived' 또는 import_batch_id 기준 비활성화를 우선한다.
운영 반영 전 dry-run을 수행한다.
운영 반영 후 rollback은 감사 로그를 남긴다.
```

## 16. Dry Run

운영 DB에 실제 반영하기 전에 dry-run을 수행한다.

dry-run 결과:

```txt
생성될 마스터 수
연결될 기존 마스터 수
생성될 중복 후보 수
실패 예상 row 수
컬럼 매핑 오류
필수값 누락
```

dry-run에서 통과해야 실제 import를 실행한다.

## 17. 구현 위치

마이그레이션 관련 코드는 다음 위치에 둔다.

```txt
scripts/import/
  startups/
  experts/
  partners/
  ac-applications/

packages/master-data/
  normalize/
  identifiers/
  match/
  merge-candidate/

supabase/migrations/
  20260703210001_staging_import_tables.sql 등
  (staging 테이블도 다른 스키마와 동일하게 migration 파일로만 관리 —
   yna_suite_database_operations.md §2 Migration Only 원칙)
```

주의:

```txt
일회성 스크립트라도 로직을 막 작성하지 않는다.
정규화, 식별자 생성, 후보 점수 계산은 packages/master-data의 공통 함수를 사용한다.
```

## 18. 1차 마이그레이션 권장 순서

```txt
1. 기존 스타트업 DB dry-run
2. 스타트업 Hub 마스터 import
3. identifiers/aliases 생성
4. merge_candidates 생성
5. 운영자 검토
6. AC 프로그램 import
7. AC 신청 이력 import
8. 전문가 import
9. 평가/멘토링 이력 import
10. 협력사/기관 import
```

## 19. 체크리스트

마이그레이션 전 확인:

```txt
원본 백업을 보존했는가?
컬럼 매핑표가 있는가?
필수값 기준을 정했는가?
정규화 규칙을 정했는가?
dry-run 결과를 확인했는가?
실패 row 재처리 방식을 정했는가?
rollback 기준을 정했는가?
```

마이그레이션 후 확인:

```txt
신규 마스터 생성 수가 예상 범위인가?
기존 마스터 연결이 정상인가?
중복 후보가 생성되었는가?
업무 이력이 Hub 마스터와 연결되었는가?
실패 row가 기록되었는가?
감사 로그가 남았는가?
```

## 20. 최종 요약

Y&ARCHER WORKS의 데이터 마이그레이션은 다음 목적을 가진다.

```txt
기존 데이터를 Hub 중심 구조로 옮긴다.
공식 번호가 없는 데이터를 정상적으로 수용한다.
식별 단서를 누적해 향후 병합 판단에 활용한다.
중복 가능성은 자동 병합보다 운영자 검토 큐로 보낸다.
업무 이력은 임시 마스터라도 반드시 연결해 유실하지 않는다.
모든 import는 batch, source, raw_payload, 실패 이력을 남긴다.
```

좋은 마이그레이션은 데이터를 한 번에 깨끗하게 만드는 작업이 아니라, 앞으로 깨끗하게 운영할 수 있는 출발선을 만드는 작업이다.
