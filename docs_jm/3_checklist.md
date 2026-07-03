# 3. Y&A 서비스 개발 체크리스트

이 문서는 플랫폼 개발의 **현재 진행 상태와 앞으로 만들어야 할 개발 단위**를 가시적으로 관리하기 위한 체크리스트입니다.

기획자와 개발팀이 함께 봅니다. 개발팀은 "다음에 무엇을 만들지"를 단위로 집어들 수 있고, 기획자는 "지금 어디까지 됐는지"를 한눈에 확인할 수 있도록 작성했습니다.

각 항목은 `docs/` 폴더의 상세 설계 문서에 근거합니다. 항목 옆 괄호는 근거 문서를 가리킵니다.

표기:

```txt
[x] = 완료
[ ] = 예정 / 진행 중
```

---

## 1. 현재 완료된 항목 (Completed)

여기까지는 코드 구현이 아니라 **아키텍처와 정책 결정**이 끝난 부분입니다. 앞으로의 모든 개발은 이 결정을 전제로 진행합니다.

*   **[x] 아키텍처 및 기획 정책 수립**
    *   Y&A Hub(중앙 창고)와 개별 도메인 서비스들의 결합도를 낮추는 기획 승인 완료.
*   **[x] SSO 통합 세션 공유 구조 설계**
    *   기존 보유 도메인인 `ynarcher.co.kr`을 활용하여, 추가 도메인 구매 없이 `hub.ynarcher.co.kr`, `work.ynarcher.co.kr` 등 서브도메인 간 로그인 세션을 자동으로 공유하는 구조 확정.
*   **[x] RLS(데이터 조회 권한) 성능 병목 최적화**
    *   데이터를 조회할 때마다 권한 테이블을 매번 조인하여 속도가 느려지던 구조를, 로그인 JWT(토큰)의 `app_metadata` 정보를 활용해 무조인(No-Join)으로 즉시 판정하는 빠른 아키텍처로 변경 확정.
*   **[x] 데이터 병합 시 DB 락(Lock) 병목 해소 설계**
    *   중복 스타트업 병합 승인 시 전체 스키마에 락이 걸리던 문제를 해결하기 위해, 병합은 즉시 처리하고 외래키(관계) 동기화는 백그라운드에서 비동기 처리하는 2단계 병합 구조 설계 완료.
*   **[x] UI/비즈니스 의존성 결합도 격리**
    *   공통 UI 창고가 무거워지거나 순환 참조 오류가 나지 않도록, 순수 화면용 UI(`packages/ui`)와 API 결합형 Picker류 컴포넌트(`packages/master-data` 또는 개별 앱)를 분리 보관하는 규칙 정립 완료.
*   **[x] 전체 22개 아키텍처 및 정책 문서 일괄 갱신 완료**
    *   위 개선안들을 토대로 전사 설계 문서 업데이트 완료. 본 체크리스트의 모든 항목은 이 문서들을 근거로 한다.

---

## 2. 개발 진행 방식 개요

Y&A Suite는 한 번에 모든 앱을 만들지 않습니다. **전사 공통 기반(Hub + Dev)을 먼저 단단히 만든 뒤, 도메인 앱을 하나씩 같은 방식으로 연결**합니다. 각 도메인 앱은 예외 없이 "Hub 마스터를 참조하고, Dev 권한 체계를 따르고, 새 대상이 유입되면 임시 마스터·병합 후보 흐름을 탄다"는 동일 계약으로 붙습니다.

권장 Phase 순서:

```txt
Phase 1: Core Foundation   Hub + Dev + 공통 기반   (지금 집중)
Phase 2: Y&A Work 연결
Phase 3: Y&A Fund 연결
Phase 4: Y&A Project 연결
Phase 5: Y&A M&A 연결
Phase 6: Y&A Management 연결
```

아래 체크리스트는 이 철학에 따라 **Phase 1은 화면·API·스키마·권한 단위까지 아주 상세히**, Phase 2는 중간 수준, Phase 3~6은 요약 수준으로 작성했습니다. 또한 어떤 Phase든 배포 전에 반드시 통과해야 하는 항목은 마지막 **공통 게이트** 섹션에 모았습니다.

---

## 3. Phase 1: Core Foundation 개발 (초정밀)

Phase 1의 목표는 화면 수를 늘리는 것이 아니라, **이후 Work/Fund/M&A/Project/Management가 같은 계약으로 붙을 수 있는 기반**을 실제로 검증하는 것입니다. 아래 순서는 권장 구현 순서이기도 합니다.

### [ ] Phase 1.1 모노레포 및 공통 패키지 스캐폴딩
*(근거: yna_suite_tech_stack.md, yna_suite_foldering.md)*

*   **[ ] 모노레포 뼈대 생성**
    *   `pnpm workspace` + `Turborepo` 기반 루트 구성(`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`).
*   **[ ] 배포 단위 앱 폴더 생성**
    *   `apps/hub`, `apps/dev`를 우선 생성하고, `work/mna/project/fund/management`는 빈 뼈대만 준비.
*   **[ ] 공통 패키지 뼈대 생성**
    *   `packages/auth`(세션·로그인), `packages/permissions`(권한 판단), `packages/master-data`(마스터 검색·병합), `packages/database`(Supabase client·query helper), `packages/ui`(공통 UI), `packages/core`(타입·상수), `packages/config`(도메인·env), `packages/utils`(정규화·포맷).
*   **[ ] 의존성 방향 규칙 적용**
    *   `apps/* → packages/*`만 허용. 앱 간 직접 import 금지, `packages/ui`의 비즈니스 로직·API 호출 금지 규칙을 lint/리뷰 기준으로 반영.

### [ ] Phase 1.2 공통 디자인 시스템 · UI · AppShell
*(근거: yna_suite_design_system.md, yna_suite_information_architecture.md)*

*   **[ ] 디자인 토큰 정의**
    *   그레이스케일 중심 팔레트 + CI Red(`#E22213`) 제한 사용, 타이포(Pretendard), spacing(4px grid), radius/shadow 토큰을 `packages/ui/tokens`에 등록.
*   **[ ] 핵심 공통 컴포넌트 구현**
    *   Button/IconButton, Input/Select/SearchCombobox/DatePicker, Dialog/Sheet/ConfirmDialog, DataTable/FilterBar/BulkActionBar, StatusBadge/PermissionBadge/MasterCodeBadge, PageHeader/EmptyState.
*   **[ ] AppShell 레이아웃 구현**
    *   Sidebar(240px) + Topbar + Content, 현재 서비스명/사용자 표시, **권한 기반 메뉴 노출**, 모바일 drawer navigation.
*   **[ ] 공통 상태 화면**
    *   No-Permission(접근 불가), Read-Only 배지 처리, System Error, Not Found, 세션 만료 처리.
*   **[ ] 완료 기준**
    *   Hub/Dev가 동일 레이아웃 사용, 권한 없는 메뉴 미노출, 키보드 포커스 표시, 모바일에서 주요 화면 깨짐 없음.

### [ ] Phase 1.3 Supabase 스키마 및 마이그레이션 기반
*(근거: yna_suite_data_model.md, yna_suite_database_operations.md)*

*   **[ ] 논리 스키마 생성**
    *   `hub`, `dev`, `staging` 우선 생성(`work` 등 나머지는 구조만 준비).
*   **[ ] 우선순위 1 테이블 마이그레이션 작성**
    *   `hub.startups`, `hub.experts`, `hub.partners`, `hub.managers`, `hub.master_aliases`, `hub.master_identifiers`, `hub.master_field_history`, `hub.merge_candidates`, `hub.merge_events`, `hub.audit_logs`, `hub.attachments`, `dev.user_permissions`, `dev.permission_audit_logs`.
*   **[ ] 공통 컬럼/코드 정책 반영**
    *   내부 PK는 UUID, 사람이 보는 값은 `master_code` 등 별도 unique. `created_by/updated_by/status` 공통 컬럼, soft delete 전제.
*   **[ ] 인덱스/제약 반영**
    *   `business_number` 부분 unique(NULL 허용), `normalized_name` 검색 인덱스, `master_identifiers` 중복 방지 unique.
*   **[ ] Migration Only 원칙 확립**
    *   운영 DB 직접 수정 금지, 모든 변경은 `supabase/migrations` 파일로만. `YYYYMMDDHHMMSS_*.sql` 명명 규칙.

### [ ] Phase 1.4 인증 및 권한 기반
*(근거: yna_suite_auth_permissions.md, yna_suite_rls_policy_matrix.md)*

*   **[ ] Supabase Auth 로그인 연동**
    *   이메일 기반 로그인/로그아웃, auth callback 처리, 세션 유지, 서브도메인 세션 공유 확인.
*   **[ ] 권한 모델 구현 (`packages/permissions`)**
    *   `User Role + Domain Permission + Data Scope` 조합 판단 helper. 도메인별 `none/read/write`, scope(`global/self/company` 우선, `department/program/fund/project`는 구조만).
*   **[ ] JWT 권한 주입 (No-Join 최적화)**
    *   로그인 시 `app_metadata.permissions`에 도메인별 권한 JSON을 실어 발급. RLS helper(`dev.can_read_domain`, `dev.can_write_domain` 등)가 조인 없이 JWT를 파싱하도록 구현.
    *   JWT 권한 claim에는 `expires_at`을 포함하고, RLS helper는 access token 유효 여부와 별개로 `expires_at <= now()`인 임시 권한을 즉시 차단.
*   **[ ] 기본 RLS 정책**
    *   업무 테이블 기본 deny + 명시 허용, read/write 분리, 외부 사용자 self/company 제한. Hub 마스터·감사 로그·권한 테이블 정책.
*   **[ ] UI 권한 처리**
    *   권한 없음 → 접근 불가 페이지, 읽기 전용 → 쓰기 버튼 숨김/비활성, 만료 권한 자동 차단.

### [ ] Phase 1.5 Y&A Dev — 사용자 및 권한 관리
*(근거: yna_suite_hub_dev_functional_spec.md §15~19, yna_suite_api_contracts.md §16~18)*

*   **[ ] 사용자 목록/상세**
    *   이름·이메일·역할·상태·마지막 로그인 컬럼, 검색/역할·상태 필터.
*   **[ ] 사용자 초대/생성**
    *   Auth 계정 생성/초대와 권한 부여를 하나의 작업으로 처리(계정만 생기고 권한 누락되지 않게).
*   **[ ] 도메인별 권한 관리**
    *   7개 도메인 read/write 토글, scope_type/scope_id, expires_at, 권한 템플릿(master/executive/management_office/investment_team/business_team/guest_expert/guest_startup/viewer) 적용 + 개별 override.
*   **[ ] 권한 매트릭스 화면**
    *   사용자×도메인 한눈에 관리(복잡하면 사용자 상세 중심으로 축소), 변경 전/후 diff 표시.
*   **[ ] 권한 변경 안전장치 + 감사 로그**
    *   `can_write=true`면 `can_read=true` 강제, master 권한 변경은 확인 dialog, 변경 사유 입력, `dev.permission_audit_logs`에 before/after 기록.
*   **[ ] 외부 사용자 연결**
    *   guest_startup(→startup_id, scope=company), guest_expert(→expert_id, scope=self) 연결. 외부 사용자는 Hub/Dev 직접 접근 불가.

### [ ] Phase 1.6 Y&A Hub — 스타트업 마스터
*(근거: yna_suite_hub_dev_functional_spec.md §4~7)*

*   **[ ] Hub 대시보드**
    *   스타트업/전문가/협력사 마스터 수, pending 마스터·pending 병합 후보 수, 최근 병합 이벤트, 최근 import batch 상태 위젯.
*   **[ ] 통합 검색**
    *   name/legal_name/alias/식별자/대표자명 대상 검색, entity_type·상태 필터, 마스터 코드·검증 상태 표시, merged 기본 제외.
*   **[ ] 스타트업 마스터 목록**
    *   master_code·name·legal_name·대표자·사업자번호·검증상태·상태·유입출처·수정일 컬럼, 검색/필터/정렬/페이지네이션, 민감 필드 마스킹.
*   **[ ] 스타트업 마스터 상세/수정**
    *   기본정보·식별자·별칭·필드 변경 이력·관련 업무 이력 요약·중복 후보·감사 로그 요약 섹션. 수정 시 field_history 기록, 민감 변경 audit log, merged source 수정 제한.

### [ ] Phase 1.7 Y&A Hub — 전문가 · 협력사 마스터
*(근거: yna_suite_hub_dev_functional_spec.md §8~9)*

*   **[ ] 전문가 마스터 목록/상세**
    *   이름·이메일·전화·소속·직함·전문분야·검증상태 컬럼. 이메일/전화 정규화, **동명이인 고려하여 이름만으로 자동 병합 금지**.
*   **[ ] 협력사 마스터 목록/상세**
    *   partner_type(LP/자문사/수행기관 등), 사업자번호·대표자·검증상태. 사업자번호 있으면 중복 후보에 강하게 반영.

### [ ] Phase 1.8 마스터 검색/자동완성 API + 임시 마스터 생성
*(근거: yna_suite_api_contracts.md §6~7, yna_suite_master_data_policy.md §7~9)*

*   **[ ] 마스터 검색 API**
    *   `GET /api/hub/master-search`(entity_type·q·limit·include_merged), 매칭 필드·점수 반환. 모든 도메인 앱이 재사용할 공통 계약.
*   **[ ] 임시 마스터 생성 API**
    *   `POST /api/hub/masters/{entity_type}/temporary`. validation → normalized 생성 → TEMP 마스터 생성 → 식별자/별칭 저장 → 중복 후보 생성 → audit log.
*   **[ ] 로컬 입력 UX 원칙 구현**
    *   자동완성 우선 → 기존 선택 시 FK 연계 → 없으면 즉시 임시 생성(업무 흐름 막지 않음, pending 상태로 Hub 큐 전송).

### [ ] Phase 1.9 식별자 · 별칭 · 필드 이력
*(근거: yna_suite_master_data_policy.md §3~6·12, yna_suite_api_contracts.md §10~11)*

*   **[ ] 식별자 관리**
    *   `master_identifiers` 저장(business_number/founder_phone/founder_email/website_domain 등). 원본값 보존 + normalized_value 생성, primary 전환은 트랜잭션 처리.
*   **[ ] 별칭 관리**
    *   `master_aliases` 저장(previous_name/short_name/brand_name/team_name 등), 대표값에서 밀려난 이름 보존, 검색에 normalized 사용.
*   **[ ] 필드 변경 이력**
    *   `master_field_history`에 대표값 변경 전/후·출처·사유 기록.
*   **[ ] 개인정보 마스킹**
    *   목록에서 전화/이메일 마스킹, 원본 조회는 권한자 + audit log.

### [ ] Phase 1.10 중복 후보 · 수동 병합
*(근거: yna_suite_master_data_policy.md §10·13~15, yna_suite_api_contracts.md §12~15)*

*   **[ ] 중복 후보 생성(규칙 기반)**
    *   점수 기준(95↑ 강한 식별자 / 80~94 중간 / 60~79 약함 / 60↓ 유지), 매칭 사유 기록. 공식 번호 없거나 충돌 시 자동 병합 금지.
*   **[ ] 중복 후보 목록/상세 비교**
    *   entity_type·점수·상태 필터, 좌우 비교(필드·식별자·별칭·관련 업무 이력), 충돌 경고, 병합 후 미리보기.
*   **[ ] 병합 미리보기 API**
    *   `.../preview`로 field_resolution + affected_records(영향받는 업무 FK) 사전 계산.
*   **[ ] 수동 병합 승인/반려/무시/보류**
    *   승인은 트랜잭션. 대표값 결정 → 밀려난 값 alias/identifier/history 보존 → source `merged` + merged_into_id → merge_events·audit_logs 기록.
*   **[ ] 2단계 비동기 병합 반영**
    *   1단계(동기): source 상태 변경만 빠르게 커밋. 2단계(비동기): 타 도메인 FK 일괄 업데이트를 백그라운드 워커로. 진행 중 조회는 공통 resolved view/helper로 실시간 resolve.
    *   업무 도메인 쿼리는 hub 마스터 직접 조인 + 개별 `COALESCE` 작성을 금지하고 `packages/database` 표준 query helper 또는 DB view를 사용.

### [ ] Phase 1.11 감사 로그
*(근거: yna_suite_data_model.md §11, yna_suite_security_policy.md §15, yna_suite_api_contracts.md §5)*

*   **[ ] 감사 로그 기록**
    *   `hub.audit_logs`(마스터 변경·병합·다운로드 등), `dev.permission_audit_logs`(권한 변경). actor·domain·entity·action·before/after·reason·request_id 기록.
*   **[ ] 감사 로그 조회**
    *   기본 조회 화면. 로그는 수정/삭제 불가, 개인정보 원문 payload 저장 금지.

### [ ] Phase 1.12 기존 스타트업 DB 마이그레이션 도구
*(근거: yna_suite_migration_strategy.md, yna_suite_hub_dev_functional_spec.md §14)*

*   **[ ] staging 적재 구조**
    *   `staging.import_batches`, `staging.startup_import_rows`(raw_payload·mapped·normalized 보존).
*   **[ ] 컬럼 매핑 + 정규화**
    *   매핑표 기반 표준 필드 변환, 회사명/대표자/전화/이메일/도메인/사업자번호 정규화. 매핑 안 되는 컬럼은 raw_payload 보존.
*   **[ ] Import batch 처리 + 리포트**
    *   기존 마스터 연결 / 신규·임시 마스터 생성 / 중복 후보 / 실패 row 분기, batch별 검증 리포트(신규·연결·후보·실패 수).
*   **[ ] dry-run 및 rollback**
    *   운영 반영 전 dry-run 필수, batch 단위 rollback(status=archived / import_batch_id 기준 비활성화).
*   **[ ] Import Batch 조회 화면**
    *   Hub에서 성공/실패 row 요약, 실패 사유, 재처리 기준 확인.

### [ ] Phase 1.13 Work 연결 Mock/Test Flow
*(근거: yna_suite_phase1_scope.md §11, yna_suite_api_contracts.md §19, yna_suite_existing_source_alignment.md)*

*   **[ ] Program First 얇은 재현**
    *   mock용 `work.programs / program_modules / applications / program_activities / meeting_minutes` 최소 구조 + mock API(production 비활성화).
*   **[ ] 핵심 연결 시나리오 자동 검증**
    *   work 권한 사용자 생성 → mock 프로그램·모듈 생성 → 기존 Hub 스타트업 검색·연결 → 유사 신규 임시 마스터 생성 → 중복 후보 생성 → 병합 승인 → **mock 신청 FK가 최종 마스터로 이동** 확인 → custom activity·회의록·첨부 연결 → audit/merge event 확인.
*   **[ ] 검증 목적 확인**
    *   Hub 마스터를 직접 수정하지 않고, 새 대상은 임시 마스터·병합 후보 흐름을 탄다는 계약이 실제로 작동하는지 확인. (실제 Work UI 완성이 아님)

---

## 4. Phase 2: Y&A Work 연결 (중간)

첫 번째 실제 도메인 앱으로 Work를 붙입니다. `yna-matching`의 Program First 흐름을 원형으로 삼되, Hub 마스터·Dev 권한·병합 정책은 새 Suite 기준을 따릅니다.
*(근거: yna_suite_existing_source_alignment.md, yna_suite_information_architecture.md §6, yna_suite_data_model.md §6)*

*   **[ ] 프로그램/모듈 관리**
    *   프로그램 목록/상세/생성, 모듈(recruitment·participant_management·document_review·onsite_evaluation·orientation·mentoring·business_matching·demo_day·outcome_management·custom_event) 구성.
*   **[ ] 신청/참여자 관리**
    *   신청 목록/상세·상태 관리, 스타트업 검색 후 연결 또는 신규 임시 생성 후 연결, 참여자(스타트업/전문가/협력사/매니저) 관계.
*   **[ ] 평가/멘토링/매칭/성과**
    *   서류평가·현장평가·오리엔테이션, 멘토링 세션, 비즈니스 매칭, 데모데이, 성과관리.
*   **[ ] 커스텀 activity + 회의록**
    *   정형 모듈로 담기 어려운 행사는 activity로, 회의록은 program/module/activity에 연결되는 가벼운 기록(제목·안건·논의·결정·첨부).
*   **[ ] 외부 사용자 포털 권한**
    *   guest_startup(자기 회사 신청/제출), guest_expert(본인 배정 평가/멘토링)만 접근하는 RLS/E2E 검증.
*   **[ ] Phase 2 핵심 검증**
    *   Work가 Hub 마스터를 실제 참조하는가 / Dev 권한을 실제로 따르는가 / 임시 마스터가 병합 큐로 들어오는가 / 병합 후 이력이 최종 마스터로 귀속되는가.

---

## 5. Phase 3~6: 도메인 앱 순차 연결 (요약)

Phase 3 이후는 도메인 앱을 하나씩 추가합니다. 순서는 실제 업무 우선순위에 따라 조정할 수 있습니다. 각 앱은 예외 없이 **동일 연결 계약**(Hub 마스터 참조 · Dev 권한 준수 · 임시 마스터/병합 후보 흐름 · 업무 이력을 마스터 생애 이력에 연결)을 따릅니다.
*(근거: yna_suite_phase1_scope.md §13, yna_suite_information_architecture.md §7~10, yna_suite_data_model.md §7~10)*

### [ ] Phase 3: Y&A Fund
*   **[ ] placeholder IA + 핵심 테이블**
    *   Funds/Limited Partners/Capital Calls/Investments. LP는 `hub.partners`, 피투자사는 `hub.startups` 참조.

### [ ] Phase 4: Y&A Project
*   **[ ] placeholder IA + 핵심 테이블**
    *   Projects/Milestones/Manpower Allocations. 발주처·협력기관은 `hub.partners`, 담당자는 `hub.managers` 참조.

### [ ] Phase 5: Y&A M&A
*   **[ ] placeholder IA + 핵심 테이블**
    *   Deals/Due Diligence Files. 대상 기업은 `hub.startups`, 자문사는 `hub.partners` 참조. Restricted 데이터 접근 제한 강화.

### [ ] Phase 6: Y&A Management
*   **[ ] placeholder IA + 핵심 테이블**
    *   HR Records/Performance Metrics. HR 기록은 민감도 높은 restricted, 심사역은 `hub.managers` 참조.

---

## 6. 공통 게이트 (전 Phase 반복 적용)

아래 항목은 특정 Phase의 기능이 아니라, **어떤 Phase든 staging/production 배포 전에 반드시 통과해야 하는 공통 기준**입니다. 새 화면·API·테이블을 만들 때마다 확인합니다.

### [ ] 테스트 게이트
*(근거: yna_suite_hub_dev_functional_spec.md §23, yna_suite_tech_stack.md §12, yna_suite_maintenance_rules.md §8)*

*   **[ ] Unit 테스트** — 정규화, 식별자 생성, 중복 후보 점수, 권한 판단 helper.
*   **[ ] RLS 테스트** — 테스트 계정 10종(master/executive/management_office/investment_team/business_team/guest_expert/guest_startup/viewer/no_permission/expired_permission)별 접근 통과·차단.
*   **[ ] E2E 테스트** — 로그인, 권한 없는 접근 차단, Hub 마스터 생성, 임시 마스터 생성, 중복 후보 병합, Dev 권한 변경, Work mock flow.

### [ ] 보안/개인정보 게이트
*(근거: yna_suite_security_policy.md, yna_suite_backup_retention_privacy.md)*

*   **[ ] 개인정보 마스킹** — 목록 전화/이메일/주소 마스킹, 원본 조회 시 audit log.
*   **[ ] Secret/Service Role 격리** — service role key는 서버 전용, 클라이언트·`NEXT_PUBLIC_`·로그에 절대 노출 금지.
*   **[ ] 외부 사용자 격리** — 타사/타인 데이터 접근 실패 테스트, 내부 메모·평가 점수 비노출.
*   **[ ] 파일/Export** — signed URL 사용, 민감 파일·대량 export 시 권한 체크 + audit log.

### [ ] DB / 마이그레이션 게이트
*(근거: yna_suite_database_operations.md)*

*   **[ ] Migration Only** — 운영 DB 직접 수정 금지, 모든 변경 migration 파일.
*   **[ ] Soft Delete 우선** — 물리 삭제 대신 status/archived 처리.
*   **[ ] Backfill 분리** — 스키마 변경과 대량 데이터 변경 분리(nullable 추가 → backfill → 제약 추가).
*   **[ ] Rollback 전략** — 변경 전 rollback 방식 검토, 스냅샷 확보.

### [ ] 배포 게이트
*(근거: yna_suite_ci_cd_release_process.md, yna_suite_environment_deployment.md)*

*   **[ ] 환경 분리** — dev/staging/production Supabase 분리, preview는 production에 연결 금지.
*   **[ ] 배포 순서** — staging migration → 앱 배포 → RLS/권한/콜백 검증 → smoke test → production.
*   **[ ] Auth Callback allowlist** — 서비스 도메인별 callback URL 명시 등록.
*   **[ ] 릴리즈 노트** — 배포 앱·PR·migration·권한/RLS 변경·검증 결과·rollback 방법 기록.

### [ ] 문서 동기화 게이트
*(근거: yna_suite_maintenance_rules.md §9, docs/README.md)*

*   **[ ] 대응 문서 갱신** — 테이블/컬럼 → data_model, 권한/RLS → auth_permissions·rls_policy_matrix, IA/라우트 → information_architecture, UI 토큰 → design_system, 환경변수 → environment_deployment, Phase 범위 → phase1_scope.
*   **[ ] 이력 메모 의무** — 버그·핫픽스·권한 강제·예외 데이터 수정은 `docs_jm/4_memo.md`에 기록.

---

## 7. Phase 1 완료 기준 (Definition of Done)

Phase 1은 아래 조건을 모두 만족해야 완료로 봅니다. 이 목록이 Phase 1의 출시 게이트입니다.
*(근거: yna_suite_phase1_scope.md §14, yna_suite_hub_dev_functional_spec.md §22)*

*   **[ ] Y&A Hub / Y&A Dev 접속 및 Supabase Auth 로그인 가능**
*   **[ ] Dev에서 사용자 생성/권한 부여 가능, 서비스별 권한이 RLS와 UI에 반영됨**
*   **[ ] Hub 스타트업/전문가/협력사 마스터 등록·수정 가능**
*   **[ ] 기존 스타트업 DB 1차 import 가능(식별자/별칭/필드 이력 저장 포함)**
*   **[ ] 중복 후보가 생성되고 Hub에서 검토·수동 병합 가능**
*   **[ ] 병합 이벤트와 감사 로그가 남음**
*   **[ ] Work 연결 mock/test flow 통과**
*   **[ ] 공통 디자인 시스템이 Hub/Dev 주요 화면에 적용됨**
*   **[ ] 권한 없는 사용자 차단 및 외부 사용자 격리 테스트 통과**
*   **[ ] staging smoke test 통과 및 production 배포 절차 문서화**
