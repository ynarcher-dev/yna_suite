# 0. Claude 작업 시작 가이드

이 문서는 Claude가 Y&A Suite 개발을 시작할 때 가장 먼저 읽는 단일 진입 문서다.

사용자에게는 다음 한 줄만 지시받는 것을 기준으로 한다.

```txt
작업 전에 docs_jm/0_CLAUDE.md를 먼저 읽고, 그 지시에 따라 필요한 문서를 확인한 뒤 진행해.
```

## 1. 문서 구조

```txt
docs/
  상세 설계 원본 문서. 기능, DB, API, 권한, 보안, UI, 배포 기준의 source of truth.

docs_jm/
  개발 진행용 문서. 개요, 규칙, 체크리스트, 메모, 핸드오프 기록.
```

핵심 관계:

```txt
docs_jm/3_checklist.md = 작업 순서와 진행 상태를 보는 내비게이션
docs/*.md             = 실제 구현 판단의 상세 근거
docs_jm/2_rules.md    = 개발 중 반드시 지킬 규칙
docs_jm/4_memo.md     = 예외, 이슈, 의사결정 기록
docs_jm/5_progress.md = 작업 완료 후 핸드오프 기록
```

`docs_jm/3_checklist.md`의 각 Phase 항목에는 근거 문서가 적혀 있다. 개발할 때는 체크리스트 항목을 먼저 잡고, 그 항목의 근거로 연결된 `docs/*` 문서를 읽은 뒤 구현한다.

## 2. 작업 시작 루틴

새 작업을 시작할 때는 다음 순서를 따른다.

```txt
1. git status로 현재 변경 사항을 확인한다.
2. docs_jm/3_checklist.md에서 현재 Phase와 다음 작업 항목을 확인한다.
3. docs_jm/5_progress.md에서 이전 작업자가 남긴 현재 상태와 다음 작업을 확인한다.
4. 선택한 체크리스트 항목의 근거 문서를 docs/에서 읽는다.
5. docs_jm/2_rules.md의 필수 규칙을 확인한다.
6. 구현, 검증, 문서 갱신, 진행 기록을 한 단위로 마무리한다.
```

이미 수정된 파일이나 미추적 파일이 있으면 사용자의 작업일 수 있으므로 임의로 되돌리지 않는다.

## 3. 작업별 필수 참고 문서

모노레포, 패키지 구조, 유지보수 규칙:

```txt
docs/yna_suite_tech_stack.md
docs/yna_suite_foldering.md
docs/yna_suite_maintenance_rules.md
```

Phase 1 범위, 화면, 메뉴, 라우트:

```txt
docs/yna_suite_phase1_scope.md
docs/yna_suite_hub_dev_functional_spec.md
docs/yna_suite_information_architecture.md
```

API, DB, migration, 운영:

```txt
docs/yna_suite_api_contracts.md
docs/yna_suite_data_model.md
docs/yna_suite_database_operations.md
docs/yna_suite_migration_strategy.md
```

권한, RLS, 보안:

```txt
docs/yna_suite_auth_permissions.md
docs/yna_suite_rls_policy_matrix.md
docs/yna_suite_security_policy.md
```

마스터 데이터, 중복 후보, 병합:

```txt
docs/yna_suite_master_data_policy.md
docs/yna_suite_data_quality_governance.md
docs/yna_suite_api_contracts.md
```

UI와 디자인 시스템:

```txt
docs/yna_suite_design_system.md
docs/yna_suite_information_architecture.md
```

배포, 환경, CI/CD:

```txt
docs/yna_suite_environment_deployment.md
docs/yna_suite_ci_cd_release_process.md
docs/yna_suite_backup_retention_privacy.md
```

## 4. 특히 놓치면 안 되는 구현 기준

권한/RLS:

```txt
JWT app_metadata.permissions에는 can_read, can_write, scope_type, scope_id, expires_at을 함께 넣는다.
RLS helper는 JWT를 No-Join으로 파싱하되, expires_at <= now()인 임시 권한은 즉시 false로 처리한다.
can_write=true이면 can_read=true를 강제한다.
UI 권한 처리는 UX일 뿐이며, 최종 보안은 RLS에서 강제한다.
```

마스터 병합:

```txt
병합 승인은 짧은 동기 트랜잭션으로 source status와 merged_into_id만 먼저 확정한다.
무거운 타 도메인 FK 업데이트는 백그라운드 워커에서 비동기로 처리한다.
비동기 반영 중 조회는 개별 쿼리에서 COALESCE를 직접 반복하지 않고, 공통 resolved view/helper 또는 packages/database query helper를 사용한다.
```

패키지 의존성:

```txt
apps/* -> packages/* 방향만 허용한다.
앱 간 직접 import는 금지한다.
packages/ui에는 비즈니스 로직, API 호출, Supabase client를 넣지 않는다.
마스터 검색/Picker처럼 API가 필요한 공통 기능은 packages/master-data 또는 개별 앱 소유로 둔다.
```

DB 변경:

```txt
DB 구조 변경은 migration 파일로만 수행한다.
운영 DB 직접 수정은 금지한다.
부득이한 데이터 정정은 백업, 사유, before/after, 재처리 계획을 기록한다.
```

## 5. 작업 완료 루틴

단위 작업이 끝나면 다음을 확인한다.

```txt
1. 관련 테스트, 타입체크, lint 또는 최소 검증 명령을 실행한다.
2. 변경한 기능과 관련된 docs/* 문서가 어긋나지 않는지 확인한다.
3. docs_jm/3_checklist.md의 해당 항목 상태를 갱신한다.
4. docs_jm/5_progress.md에 최신 진행 기록을 추가한다.
5. 예외, 임시조치, 의사결정은 docs_jm/4_memo.md에 남긴다.
6. 사용자에게 변경 파일, 검증 결과, 남은 이슈를 짧게 보고한다.
```

## 6. 우선순위 판단

문서끼리 충돌하거나 애매하면 다음 순서로 판단한다.

```txt
1. 사용자의 최신 지시
2. docs_jm/3_checklist.md의 현재 Phase와 작업 범위
3. 해당 기능의 docs/* 상세 설계 문서
4. docs_jm/2_rules.md의 공통 개발 규칙
5. 기존 코드와 패키지 책임 경계
```

충돌을 해결하면서 설계 기준이 바뀌면 관련 문서도 함께 갱신한다.
