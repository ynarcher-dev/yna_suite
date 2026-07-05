# 6. 설계 문서 정합성 리뷰 결과 (2026-07-04)

이 문서는 `docs/` 공식 설계 문서 22개와 `docs_jm/` 작업 문서 6개를 교차 리뷰하여 발견한 **문서 간 불일치 36건**(높음 4 · 중간 15 · 낮음 17)을 보완 체크리스트로 관리하기 위한 문서입니다.

각 항목의 근거는 리뷰 시점(2026-07-04) 기준 `파일:줄번호`로 표기했습니다. 이후 문서가 수정되면 줄번호가 밀릴 수 있으므로 인용문 기준으로 찾으면 됩니다.

표기:

```txt
[x] = 보완 완료
[ ] = 보완 예정
```

권장 처리 원칙:

*   **높음**: Phase 2 개발 착수 전 필수 해소 (구현이 불가능하거나 잘못된 구현을 유도하는 충돌).
*   **중간**: 해당 영역 작업 착수 전 해소 (문서만 보고 구현하면 잘못 만들게 되는 드리프트).
*   **낮음**: 발견 시 수시 반영 (표기 통일, 미확정 정책 명시 수준).

> **보완 완료 (2026-07-04, Phase 1.14)**: 36건 전부 보완했다. 기획자 방향 결정 4건 — ① 외부 사용자(guest)는 Phase 1 잠금·Phase 2 외부 포털에서 설계(H2·H3), ② 임시 마스터 화면 실제 구현(H4 — `/temporary-masters` 라우트 신설), ③ 전 항목 일괄 처리, ④ 개인정보 완전 삭제는 "일상 경로 금지 / 법적 파기는 관리자 절차" 절충안 명시(L12). 그 외 항목은 실구현 기준으로 공식 문서를 맞췄다. 상세 경위는 `4_memo.md` 이슈31, 검증 결과는 `5_progress.md` Phase 1.14 참고.
>
> **문서에 명시해 둔 후속 작업(코드/DB, Phase 2 전)**: ⑴ `master_identifiers` 강한 식별자 한정 부분 unique 인덱스 migration(`data_model` §4.6), ⑵ `hub.experts.user_id` 컬럼 migration(`rls_policy_matrix` §14), ⑶ guest_expert 평가 제출 방식 결정(템플릿 조정 vs 제출 RPC — `rls_policy_matrix` §14).

---

## 1. 심각도 높음 (4건)

*   **[x] H1. `migration_strategy`의 staging 테이블 DDL이 `data_model` 최신본(Phase 1.12 반영)보다 뒤처짐**
    *   근거: `docs/yna_suite_data_model.md:984,988,992,1013` — `is_dry_run BOOLEAN NOT NULL DEFAULT FALSE`, status에 `archived` 포함, `archived_at TIMESTAMPTZ NULL`, `decision_kind VARCHAR(50) NULL` vs `docs/yna_suite_migration_strategy.md:90~127` — 동일 테이블(`staging.import_batches`, `staging.startup_import_rows`) DDL에 위 컬럼/상태값 전부 없음.
    *   자기모순: `migration_strategy.md:381` "물리 삭제보다 status='archived' 비활성화 우선" 및 §16 dry-run 필수 절차가 자기 문서의 DDL(archived 상태·is_dry_run 컬럼 없음)로는 구현 불가.
    *   권장 조치: migration_strategy의 DDL을 data_model §11 기준으로 갱신.
*   **[x] H2. `guest_expert` 권한 충돌 — 권한표는 work 읽기 전용(R), RLS 매트릭스는 평가 쓰기 허용**
    *   근거: `docs/yna_suite_auth_permissions.md:187` guest_expert work=R (`:376` "work = read") vs `docs/yna_suite_rls_policy_matrix.md:449` `work.evaluations` INSERT/UPDATE에 "guest_expert self | 본인 배정 건 | 본인 작성 가능 필드".
    *   문제: RLS 쓰기 판정이 `dev.can_write_domain('work')` 기반(`rls_policy_matrix.md:421~424`)이므로 권한표대로면 외부 전문가가 평가 점수/의견을 제출할 수 없음. RLS 문서 내부(§3 도메인표 62행 work=R)에서도 자기모순.
    *   권장 조치: guest_expert 쓰기를 별도 정책(테이블 한정 예외 또는 RPC 경유)으로 정의하거나 권한표를 수정 — 한쪽으로 통일.
*   **[x] H3. `guest_startup` 권한 충돌 — 권한표는 hub 접근 None, RLS 매트릭스는 `hub.startups` 제한 SELECT/UPDATE 허용**
    *   근거: `docs/yna_suite_auth_permissions.md:188` guest_startup Hub=None + `:453` "외부 사용자는 Hub, Dev, M&A, Fund, Management에 직접 접근할 수 없다" vs `docs/yna_suite_rls_policy_matrix.md:183` "guest_startup | 자기 회사 제한 필드 | ... | 자기 제출 일부만 | 불가".
    *   문제: 같은 섹션의 RLS 기준(`rls_policy_matrix.md:194~195` INSERT/UPDATE는 `dev.can_write_domain('hub')`)으로는 hub=None인 guest_startup의 UPDATE("자기 제출 일부만")가 구현 불가. SELECT는 "별도 view 경유" 단서가 있으나 UPDATE 경로는 미정의.
    *   권장 조치: 외부 제출 UPDATE 경로(view/RPC/도메인 앱 경유)를 명시하거나 RLS 매트릭스의 해당 행을 수정.
*   **[x] H4. "Temporary Masters(임시 마스터)" 화면 — IA는 Phase 1 필수인데 기능 명세 부재 + 실제로는 사이드바 링크만 있는 404 상태**
    *   근거: `docs/yna_suite_information_architecture.md:111,132` Phase 1 필수 목록에 "Temporary Masters" 포함 vs `docs/yna_suite_hub_admin_functional_spec.md` §10은 "임시 마스터 생성" 처리만 정의, 목록 화면 섹션·§21 화면별 권한 표에 해당 화면 없음.
    *   실코드: `apps/hub/src/lib/nav.ts:37`에 `/temporary-masters` 링크 존재, `apps/hub/src/app/(app)/`에 라우트 없음. 그런데 `docs_jm/3_checklist.md`는 Phase 1.13(Phase 1 마지막 개발 항목)을 완료 처리(`docs_jm/5_progress.md:78`에 "라우트 신설 필요" 기록만 남고 미신설).
    *   권장 조치: 라우트를 구현하든지, IA·nav에서 제거/Phase 2 이관을 명시하고 기능 명세와 정합화.

---

## 2. 심각도 중간 (15건)

### 2.1 데이터/스키마 (6건)

*   **[x] M1. work.\* 테이블의 Phase 1 생성 여부 충돌**
    *   근거: `docs/yna_suite_data_model.md:1155~1163` "Phase 1 Work 연결 계약/mock 검증: work.programs / work.program_modules / work.applications / work.program_activities / work.meeting_minutes" (구현 우선 테이블 목록) vs `docs/yna_suite_api_contracts.md:780~782` "work.* DB 테이블·마이그레이션은 만들지 않는다(in-memory mock, 실제 Work 스키마는 Phase 2에서 교체)". 실구현은 api_contracts 쪽(in-memory mock)을 따랐음 — data_model 갱신 필요.
*   **[x] M2. `hub.merge_events.sync_status` 컬럼이 master_data_policy DDL에 없음**
    *   근거: `docs/yna_suite_data_model.md:366` `sync_status VARCHAR(50) DEFAULT 'pending'` 및 `docs/yna_suite_api_contracts.md:560,584` (sync_status='pending'/'failed' 기록)는 이 컬럼을 전제 vs `docs/yna_suite_master_data_policy.md:484~497` merge_events CREATE TABLE에 sync_status 없음.
*   **[x] M3. import row 실패 상태값 목록 불일치 — 스키마 comment가 허용하지 않는 상태를 migration_strategy가 사용**
    *   근거: `docs/yna_suite_data_model.md:1012` `import_status ... -- pending/processed/failed/skipped` (migration_strategy.md:98 동일) vs `docs/yna_suite_migration_strategy.md:309~315` "실패 상태: failed / needs_review / skipped / duplicate_blocked / invalid_format" — `needs_review`·`duplicate_blocked`·`invalid_format`이 스키마에 없음(§9 "필수값 누락: failed 또는 needs_review 처리"도 동일 문제).
*   **[x] M4. `master_identifiers` 단일 unique 인덱스 vs 식별자 유형별 차등 unique 정책 충돌**
    *   근거: `docs/yna_suite_data_model.md:290~292` `CREATE UNIQUE INDEX ... (entity_type, identifier_type, normalized_value)` (전 유형 일괄) vs `docs/yna_suite_api_contracts.md:410` "공식 번호와 약한 식별자의 unique 정책은 다르게 적용" + `docs/yna_suite_master_data_policy.md:180~192` 약한 단서(team_name, applicant_email 등)도 identifier로 저장하라는 정책. 일괄 unique면 두 마스터가 같은 정규화 값(동일 신청자 이메일, 동명 팀명)을 가질 수 없어 정책과 충돌.
*   **[x] M5. alias "inactive 상태 우선" 권고 vs `hub.master_aliases`에 상태 컬럼 부재**
    *   근거: `docs/yna_suite_api_contracts.md:436` "alias는 삭제보다 inactive 상태를 우선 검토한다" vs `docs/yna_suite_data_model.md:243~254` DDL에 status 컬럼 없음, API도 `DELETE /api/hub/aliases/{alias_id}`만 존재 → 물리 삭제 외 수단 없음(`database_operations.md:208` soft delete 우선 원칙과도 어긋남).
*   **[x] M6. `staging` 스키마가 공식 스키마 목록(7개)에 없음**
    *   근거: `docs/yna_suite_tech_stack.md:91~101`, `docs/yna_suite_foldering.md:217~227` 스키마 목록 7개(hub/dev/work/mna/project/fund/management) vs `docs_jm/3_checklist.md:112,231` — 실구현은 `staging` 스키마 생성·사용(`staging.import_batches` 등). 배포 환경명 `staging`(`environment_deployment.md:38`)과 이름도 겹쳐 혼동 소지 → 공식 문서에 staging 스키마 추가(및 용어 구분 주석) 필요.

### 2.2 권한/보안 (3건)

*   **[x] M7. `management_office`의 `hub.managers` 쓰기 근거 없음**
    *   근거: `docs/yna_suite_auth_permissions.md:184` management_office Hub=R vs `docs/yna_suite_rls_policy_matrix.md:223` hub.managers INSERT/UPDATE "전체 또는 HR scope | 허용". hub 스키마 테이블 쓰기에는 hub:write가 필요한데 어느 문서에도 예외 근거 없음.
*   **[x] M8. `hub.experts`에 auth 계정 연결 컬럼 없음 — guest_expert self scope RLS 구현 불가**
    *   근거: `docs/yna_suite_rls_policy_matrix.md:455~457` "expert_id가 auth.uid()와 연결된 hub.experts.id" 전제 vs `docs/yna_suite_data_model.md:164~184` hub.experts에 user_id 등 auth.users 연결 컬럼 없음(hub.managers만 `:222`에 user_id 보유). `work.evaluations`는 `evaluator_user_id`로 우회 가능하나 `work.mentoring_sessions`(`data_model.md:660~674`)는 expert_id만 있어 연결 수단 필요.
*   **[x] M9. `master_data_merge` 세분 권한이 권한 모델에 없음**
    *   근거: `docs/yna_suite_hub_admin_functional_spec.md:386` "master 또는 master_data_merge 권한" 요구 vs `docs/yna_suite_planning.md:63~69` `dev.user_permissions`는 can_read/can_write 두 토글만 정의. 실구현은 임시로 hub write로 해석(`docs_jm/4_memo.md:185` `requireMergeAccess`). 세분 권한을 모델에 추가하든지 명세를 hub write 기준으로 수정.

### 2.3 범위/기능 명세 (3건)

*   **[x] M10. 전문가/협력사 마스터 "생성"이 범위 문서에는 Phase 1 필수, 기능 명세에는 없음**
    *   근거: `docs/yna_suite_phase1_scope.md:145` "전문가 마스터 생성/수정", `:148` "협력사 마스터 생성/수정" (Phase 1 필수) vs `docs/yna_suite_hub_admin_functional_spec.md` §8·§9 전문가/협력사 섹션에 생성 기능 없음(신규 생성은 §6 스타트업에만, `:205`). 실구현 판단 기록: `docs_jm/4_memo.md:149`. (Phase 1.8의 공용 임시 생성 dialog로 사실상 해소되었는지 확인 후 두 문서 정합화.)
*   **[x] M11. "기본 감사 로그 조회" 화면이 범위·IA에는 Phase 1 필수인데 기능 명세에 화면 섹션 없음**
    *   근거: `docs/yna_suite_phase1_scope.md:158` + `docs/yna_suite_information_architecture.md:120,135` "Audit Logs"(Phase 1 필수) vs `docs/yna_suite_hub_admin_functional_spec.md` §14 다음이 §15로 Hub 감사 로그 화면 명세·§21 권한표 행 없음. 실제 라우트 `/audit-logs`는 Phase 1.11에서 뒤늦게 신설(`docs_jm/4_memo.md:192`) — 명세 문서에 화면 섹션 추가 필요.
*   **[x] M12. 외부 사용자(guest) 격리 테스트의 Phase 배치 충돌**
    *   근거: `docs/yna_suite_hub_admin_functional_spec.md:648` "타사/타인 데이터 접근 실패 테스트 통과"(Phase 1 완료 기준) 및 `docs_jm/3_checklist.md:363`(Phase 1 DoD) vs `docs/yna_suite_phase1_scope.md:372` "외부 스타트업/전문가 권한 검증"(Phase 2 범위), `:115~116` 외부 포털 Phase 1 제외, §14 완료 기준에 격리 항목 없음. 체크리스트 자신도 `:134` "외부 사용자 self/company view는 1.13/2로 이월"이라 하여 자기모순 — 격리 테스트의 소속 Phase를 한 곳으로 확정.

### 2.4 기술스택/프로세스 (3건)

*   **[x] M13. UI 컴포넌트 전략 드리프트 — 공식 문서는 shadcn/ui(Radix) 전제, 실결정은 "외부 패키지 없이 네이티브 구현"**
    *   근거: `docs/yna_suite_tech_stack.md:22,109` "Tailwind CSS + shadcn/ui" vs `docs_jm/4_memo.md:125`(이슈20) 네이티브 구현 확정, `docs_jm/3_checklist.md:140` `packages/ui` 네이티브 primitive. 또한 `docs/yna_suite_design_system.md:357~361` 필수 컴포넌트(SearchCombobox/DatePicker/Dialog/Sheet/DataTable)와 `:315~348` 구조도 미갱신 — SearchCombobox·DatePicker·Sheet는 Phase 1 종료 시점에도 부재. tech_stack·design_system 두 문서에 결정 반영 필요.
*   **[x] M14. 환경변수 문서 드리프트 — `NEXT_PUBLIC_COOKIE_DOMAIN`이 기준 문서에 없음**
    *   근거: `docs_jm/5_progress.md:191` 코드/.env.example에 추가 완료 vs `docs/yna_suite_environment_deployment.md:158~165` 공통 환경변수 목록에 없음. "새 환경변수 추가 시 environment_deployment.md 갱신"이라는 `docs/yna_suite_ci_cd_release_process.md:208~211` 자체 규칙 위반 상태.
*   **[x] M15. 브랜치/커밋 프로세스 충돌 — PR 기반 merge vs 단위 작업 즉시 commit & push**
    *   근거: `docs/yna_suite_ci_cd_release_process.md:45~48` "main 직접 push 금지 / PR 기반 merge" vs `docs_jm/2_rules.md:65` "기록 후에는 반드시 commit & push"(`:53` auto mode, PR/리뷰 단계 언급 없음). ci_cd `:52`의 소규모 팀 예외로 완화 가능하나 현재 어느 방식을 따르는지 명시 없음 — 현 단계 운영 방식을 한쪽 문서에 명시.

---

## 3. 심각도 낮음 (17건)

*   **[x] L1. `merge_candidates`의 `on_hold`(보류) 노출 불일치**
    *   `docs/yna_suite_data_model.md:345~352`·`data_quality_governance.md:96~110`은 on_hold 포함 6종 vs `docs/yna_suite_api_contracts.md:455` status 필터에 on_hold 없음, `docs/yna_suite_information_architecture.md:116`은 액션 3개(Approve/Reject/Ignore) vs `hub_admin_functional_spec.md:414~417`은 4개(+보류). "보류는 서버 액션 전용"이라는 실구현 의도(`docs_jm/4_memo.md:183`, 이슈27)를 api_contracts·IA에 명기.
*   **[x] L2. `scope_type: "department"`가 데이터 모델에 미정의**
    *   `docs/yna_suite_api_contracts.md:640,674,714` 예시가 department 사용 vs `docs/yna_suite_data_model.md:434` comment는 "global/self/company/program 등"에 department 없음.
*   **[x] L3. 권한 조회 API 응답의 role_key 구조 모순**
    *   `docs/yna_suite_data_model.md:431,439` role_key는 (user_id, domain_name)별 vs `docs/yna_suite_api_contracts.md:628~630` 응답 최상위 단일 role_key(domains 맵에는 없음) — 도메인마다 role_key가 다르면 응답 구성 불가.
*   **[x] L4. SQL 관리 위치 이원화 — `supabase/schemas/`·`policies/` 구조 vs migrations 단일 경로**
    *   `docs/yna_suite_foldering.md:187~214`·`environment_deployment.md:375~381`은 schemas/policies 디렉터리 구조 제시 vs `docs/yna_suite_database_operations.md:55` + 실구현(`docs_jm/3_checklist.md:120`, 5_progress Phase 1.3/1.4)은 migrations 단일 경로. `migration_strategy.md:420~422`의 "supabase/schemas/staging/*.sql"도 동일 문제(실제는 `supabase/migrations/20260703210001_*`).
*   **[x] L5. smoke 테스트 계정 목록 불일치 (7종 vs 10종)**
    *   `docs/yna_suite_environment_deployment.md:490~498` 7종(management_office/no_permission/expired_permission 누락) vs `docs/yna_suite_ci_cd_release_process.md:178~189`·`docs_jm/3_checklist.md:314` 10종.
*   **[x] L6. staging 도메인 표기 자기모순 (environment_deployment 내부)**
    *   `docs/yna_suite_environment_deployment.md:130~136` 예시는 `hub.stg.ynarcher.co.kr`(서브도메인) vs `:150` "staging은 stg- 접두사" — 접두사 해석 시 `stg-hub.ynarcher.co.kr`이 되어 Auth callback allowlist 등록 혼선 가능.
*   **[x] L7. `dev.permission_audit_logs`의 `request_id` 컬럼 유무 불일치**
    *   `docs/yna_suite_auth_permissions.md:423~434` CREATE TABLE 초안에 없음 vs `docs/yna_suite_data_model.md:489`·`security_policy.md:383`은 포함(필수). Phase 1.11에서 컬럼 추가됨 — auth_permissions 초안 갱신.
*   **[x] L8. `can_write ⇒ can_read` 강제 수준 불일치**
    *   `docs/yna_suite_auth_permissions.md:141` "일반적으로 부여" vs `docs_jm/0_CLAUDE.md:113` "강제한다" (실구현은 `normalizePermission`으로 강제) — DB 제약/앱 강제 여부를 공식 문서에 명시.
*   **[x] L9. `no_permission` 역할 포함 여부 불일치**
    *   `docs/yna_suite_rls_policy_matrix.md:49` role_key 목록에 포함 vs `auth_permissions.md:51~60` 사용자 유형 8종·`data_model.md:464~473` 템플릿 8종에는 없음 — 테스트 전용 계정 상태인지 seed 템플릿인지 확정.
*   **[x] L10. 병합 resolve 메커니즘 서술 불일치 (DB 함수 vs view)**
    *   `docs/yna_suite_rls_policy_matrix.md:152` `hub.resolve_merged_master()` 함수 권장 vs `docs/yna_suite_data_model.md:384~408` `hub.resolved_*` view + packages/database helper (실구현은 후자).
*   **[x] L11. 이메일 마스킹 형식 불일치**
    *   `docs/yna_suite_security_policy.md:78`·`backup_retention_privacy.md:152` `h***@example.com` vs `docs_jm/2_rules.md:47` `hong***@example.com` (실구현 smoke 기록은 `h***@`).
*   **[x] L12. hub 마스터 물리 삭제 정책 미확정**
    *   `docs/yna_suite_rls_policy_matrix.md:198` "물리 삭제 금지 / status 변경만" vs `docs/yna_suite_backup_retention_privacy.md:176` "법적/보안상 완전 삭제 필요 시 physical delete" (`data_model.md:61`은 "별도 정책" 유보) — 개인정보 파기 요청 시 처리 기준 확정 필요.
*   **[x] L13. `planning.md` 내부 서비스 수 표기 불일치 (6개 vs 7개)**
    *   `docs/yna_suite_planning.md:41` "6개 서비스별 RBAC" vs `:148` "7개 도메인" (`docs_jm/3_checklist.md:147`도 7개 — 7개가 맞음).
*   **[x] L14. 마스터 코드 포맷 혼재 (연도 포함/미포함)**
    *   `docs/yna_suite_planning.md:130` `TEMP-ST-092`/`YNA-ST-0104` vs `:134` `YNA-ST-2026-0001` (실구현은 연도 포함: `docs_jm/5_progress.md:41` `TEMP-ST-2026-0093`) — 연도 포함 형식으로 통일.
*   **[x] L15. Phase 1 구현 순서 불일치 (import 단계 배치)**
    *   `docs/yna_suite_phase1_scope.md:442` 기존 DB import를 7단계(전문가/협력사보다 앞) 권장 vs `docs_jm/3_checklist.md:226` Phase 1.12로 배치 — "권장"이므로 낮음, 필요 시 phase1_scope에 실순서 주석.
*   **[x] L16. `docs_jm/2_rules.md`의 문서 링크가 Windows 절대경로로 고정**
    *   `docs_jm/2_rules.md:72,87~88` `file:///c:/dev/yna_suite/...` vs 같은 문서 `:55` "어느 기기에서든 이어서 개발" 원칙 — 상대경로로 교체.
*   **[x] L17. "Phase 1 완료" 선언 vs DoD 전 항목 미체크의 긴장**
    *   `docs_jm/5_progress.md:43` "Phase 1 완료 — Phase 2 착수" vs `docs_jm/3_checklist.md:354~364` §7 DoD 11개 전부 미체크(대부분 Docker·staging 필요) — "개발 완료 / 출시 게이트 미통과" 상태임을 progress 또는 checklist에 명시.

---

## 4. 일치 확인된 항목 (재검토 불필요)

리뷰 과정에서 아래 항목은 문서 간 서술이 일치함을 확인했습니다.

*   앱/모듈 라인업 7종(Hub/Dev/Work/M&A/Project/Fund/Management)과 Work 모듈 10종 목록, Phase 순서(1 Hub+Dev → 2 Work → 3 Fund → 4 Project → 5 M&A → 6 Management)
*   권한 템플릿 8종 매핑과 도메인 권한 기본표(8역할 × 7도메인 — auth_permissions §6 ↔ rls_policy_matrix §3 동일), scope 목록(none/global/department/program/project/fund/company/self)
*   JWT claim 구조·expires_at 검증·No-Join RLS helper 구조
*   2단계(동기+비동기) 병합 아키텍처, 중복 후보 점수 기준(95 / 80~94 / 60~79 / 60 미만), verification_status 5종
*   감사 로그 위치(dev.permission_audit_logs vs hub.audit_logs 분리), 공통 응답 envelope/request_id, LP→hub.partners 참조
*   배포 도메인 7종(`*.ynarcher.co.kr`)·로컬 포트(3000~3006)·pnpm workspace+Turborepo·Vercel 빌드 구성
*   CI 컬러 규칙(#E22213 제한 사용, 그레이스케일 기조), 전화번호 마스킹(010-****-5678), 파일 visibility 4등급
*   회의록 필드(제목/안건/논의/결정/첨부)와 제외 항목, 라우트 네이밍(`/startups`, `/merge-candidates` 등)
*   `dev.user_permissions` 컬럼 구성(auth_permissions 초안 ↔ data_model), 백업 주기(매일)/RPO 24h/RTO 4h/감사 로그 3년 보존(단독 정의, 충돌 없음)

---

## 5. 권장 수정 우선순위

1.  **guest 역할 정합화 (H2·H3, M7·M8 연계)** — 외부 사용자 기능(Phase 2 포털) 구현 전 반드시 해소. guest 쓰기를 "별도 view/RPC 경유"로 정의하든, 권한표에 예외를 명시하든 `auth_permissions.md` ↔ `rls_policy_matrix.md`를 한쪽으로 통일.
2.  **`migration_strategy.md` DDL을 data_model 최신본으로 동기화 (H1, M3 연계)**.
3.  **Temporary Masters 처리 확정 (H4)** — 라우트 구현 또는 IA/nav 정리 중 택일.
4.  **docs_jm → docs 역반영 드리프트 해소 (M13·M14·M6, L4·L5 연계)** — 구현 중 결정(네이티브 UI, 환경변수, staging 스키마, migrations 단일 경로)이 공식 문서에 반영되지 않는 패턴이 반복됨. 문서 동기화 게이트(3_checklist §6) 통과 시 함께 점검.
