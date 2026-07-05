# Y&ARCHER WORKS 문서 안내

> 2026-07-04 아키텍처 개편: 다중 앱/서브도메인 구조를 **WORKS 단일 내부 앱(`apps/works`) + GUEST 외부 앱(`apps/guest`, Phase 2)** 으로 통합했다. 문서 파일명(`yna_suite_*.md`)은 링크 보존을 위해 유지한다.

이 폴더는 Y&ARCHER WORKS(저장소 코드네임: yna_suite)를 만들고 운영하기 위한 기준 문서 모음입니다.

처음 읽는다면 아래 순서대로 보면 됩니다.

```txt
1. 전체 방향 이해
2. Phase 1 범위 확인
3. HUB/관리 섹션 기능 명세 확인
4. 데이터 모델과 권한/RLS 확인
5. 개발 구조와 배포 규칙 확인
```

## 먼저 읽기

- [yna_suite_planning.md](./yna_suite_planning.md): 전체 플랫폼 기획과 WORKS 앱의 7개 섹션(HUB/관리/AC/M&A/Project/Fund/Management), GUEST 앱의 관계
- [yna_suite_phase1_scope.md](./yna_suite_phase1_scope.md): Phase 1에서 만들 것과 미룰 것
- [yna_suite_existing_source_alignment.md](./yna_suite_existing_source_alignment.md): 기존 `yna-db`, `yna-matching`을 WORKS에 반영하는 기준
- [yna_suite_information_architecture.md](./yna_suite_information_architecture.md): 섹션별 메뉴, 화면 구조, 라우트 기준

## Phase 1 구현 기준

- [yna_suite_hub_dev_functional_spec.md](./yna_suite_hub_dev_functional_spec.md): WORKS의 HUB 섹션과 관리 섹션의 화면/기능 명세
- [yna_suite_api_contracts.md](./yna_suite_api_contracts.md): HUB/관리/도메인 섹션 사이의 API와 RPC 계약
- [yna_suite_data_model.md](./yna_suite_data_model.md): 스키마, 테이블, 컬럼 설계
- [yna_suite_master_data_policy.md](./yna_suite_master_data_policy.md): 마스터 데이터 생성, 식별자, 중복 후보, 병합 정책
- [yna_suite_data_quality_governance.md](./yna_suite_data_quality_governance.md): 데이터 품질 운영 기준과 검토 주기

## 권한, 보안, 운영

- [yna_suite_auth_permissions.md](./yna_suite_auth_permissions.md): 로그인, 권한 모델, scope, JWT 기반 RLS helper
- [yna_suite_rls_policy_matrix.md](./yna_suite_rls_policy_matrix.md): 테이블별 RLS 정책과 테스트 기준
- [yna_suite_security_policy.md](./yna_suite_security_policy.md): 개인정보, secret, service role, 파일/다운로드 보안
- [yna_suite_database_operations.md](./yna_suite_database_operations.md): migration-only 원칙, DB 변경/운영 데이터 수정 규칙
- [yna_suite_backup_retention_privacy.md](./yna_suite_backup_retention_privacy.md): 백업, 복구, 보존, 개인정보 파기 기준

## 개발 구조와 배포

- [yna_suite_tech_stack.md](./yna_suite_tech_stack.md): Next.js, Supabase, pnpm workspace 등 기술 스택
- [yna_suite_foldering.md](./yna_suite_foldering.md): `apps/*`, `packages/*`, `supabase/*` 폴더 책임
- [yna_suite_environment_deployment.md](./yna_suite_environment_deployment.md): local/dev/staging/production 환경과 works/guest 도메인 전략
- [yna_suite_ci_cd_release_process.md](./yna_suite_ci_cd_release_process.md): PR, CI, staging, production 배포 절차
- [yna_suite_migration_strategy.md](./yna_suite_migration_strategy.md): 기존 데이터 import, dry-run, rollback 전략
- [yna_suite_maintenance_rules.md](./yna_suite_maintenance_rules.md): 코드 작성, 파일 크기, 의존성, 문서 갱신 규칙

## 제품 경험

- [yna_suite_design_system.md](./yna_suite_design_system.md): 그레이스케일 중심 UI, CI Red 사용 기준, 공통 컴포넌트 규칙

## 문서 수정 원칙

- 새 문서가 생기면 이 README에 추가합니다.
- Phase 범위가 바뀌면 [yna_suite_phase1_scope.md](./yna_suite_phase1_scope.md)를 함께 갱신합니다.
- DB 구조가 바뀌면 [yna_suite_data_model.md](./yna_suite_data_model.md)와 [yna_suite_rls_policy_matrix.md](./yna_suite_rls_policy_matrix.md)를 함께 확인합니다.
- 메뉴나 라우트가 바뀌면 [yna_suite_information_architecture.md](./yna_suite_information_architecture.md)를 함께 갱신합니다.
- 기존 구현체 반영 기준이 바뀌면 [yna_suite_existing_source_alignment.md](./yna_suite_existing_source_alignment.md)를 함께 갱신합니다.
