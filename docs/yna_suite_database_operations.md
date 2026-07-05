# Y&ARCHER WORKS DB 운영 규칙 가이드

> 2026-07-04 아키텍처 개편: 스키마 키 dev→admin, work→ac. (dev/staging은 환경명이라 유지)

본 문서는 Y&ARCHER WORKS의 데이터베이스 운영, schema 변경, migration, RLS, 운영 데이터 수정, 감사 로그에 대한 공통 규칙을 정의한다.

이 문서는 기존 문서의 세부 내용을 반복하지 않는다. 대신 여러 문서에 흩어진 DB 관련 원칙을 운영 규칙으로 모아, 개발과 배포 중 반드시 따라야 할 기준으로 사용한다.

관련 문서:

```txt
테이블 구조: yna_suite_data_model.md
권한/RLS 원칙: yna_suite_auth_permissions.md
마스터 병합 정책: yna_suite_master_data_policy.md
데이터 이관 전략: yna_suite_migration_strategy.md
환경/배포 절차: yna_suite_environment_deployment.md
```

## 1. 핵심 원칙

Y&ARCHER WORKS의 DB 운영은 다음 원칙을 따른다.

```txt
운영 DB 직접 수정 금지
모든 schema 변경은 migration으로 관리
RLS는 기본 deny 관점으로 설계
service role 사용 최소화
삭제보다 soft delete 우선
민감 액션은 audit log 필수
staging 검증 후 production 반영
rollback 가능한 변경 우선
```

## 2. Migration Only 원칙

테이블, 컬럼, 인덱스, RLS, 함수, 트리거 변경은 반드시 migration 파일로 남긴다.

금지:

```txt
Supabase Dashboard에서 운영 DB 직접 테이블 수정
운영 SQL Editor에서 즉흥적 ALTER TABLE 실행
운영 데이터 직접 UPDATE/DELETE 후 기록 누락
로컬에서만 반영하고 migration 누락
```

허용:

```txt
dev/staging에서 실험용 SQL 실행
검증 완료 후 migration 파일로 정리
production에는 migration으로만 반영
```

## 3. Migration 파일 규칙

Migration 파일은 `supabase/migrations`에서 관리한다.

권장 파일명:

```txt
YYYYMMDDHHMMSS_create_hub_startups.sql
YYYYMMDDHHMMSS_add_startup_identifiers.sql
YYYYMMDDHHMMSS_update_ac_rls_policies.sql
```

Migration 작성 원칙:

```txt
하나의 migration은 하나의 목적을 가진다.
테이블 생성, RLS 변경, 데이터 보정은 가능하면 분리한다.
breaking change는 피한다.
기존 컬럼 삭제보다 deprecated 처리 후 단계적으로 제거한다.
대량 데이터 변경은 별도 backfill migration 또는 script로 분리한다.
```

## 4. Schema 변경 절차

Schema 변경은 다음 순서로 진행한다.

```txt
1. data_model 문서 반영
2. migration 작성
3. local/dev 적용
4. 기본 query 검증
5. RLS 검증
6. staging 적용
7. smoke test
8. production 적용
9. 배포 후 확인
```

새 테이블 추가 시 확인:

```txt
소유 schema가 명확한가?
UUID PK를 사용하는가?
created_at/updated_at이 필요한가?
created_by/updated_by가 필요한가?
status 또는 archived_at이 필요한가?
RLS 판단에 필요한 FK가 있는가?
audit log 대상인가?
인덱스가 필요한 조회 패턴이 있는가?
```

## 5. RLS 운영 규칙

RLS는 Y&ARCHER WORKS 보안의 최종 방어선이다.

원칙:

```txt
업무 테이블은 기본적으로 RLS를 활성화한다.
권한 없음이 기본값이다.
UI에서 버튼을 숨겨도 RLS가 반드시 차단해야 한다.
read/write 정책은 분리해서 판단한다.
외부 사용자는 self/company scope를 기준으로 제한한다.
```

RLS 변경 절차:

```txt
1. auth_permissions 문서 기준 확인
2. 정책 SQL 작성
3. 테스트 계정별 접근 확인
4. staging에서 권한별 smoke test
5. production 반영
```

테스트 계정:

```txt
master
executive
management_office
investment_team
business_team
guest_expert
guest_startup
viewer
no_permission
```

## 6. Service Role 사용 규칙

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회할 수 있으므로 매우 제한적으로 사용한다.

사용 가능:

```txt
서버 전용 관리자 작업
마이그레이션/이관 script
병합 승인 트랜잭션
운영자 승인된 batch job
```

금지:

```txt
클라이언트 코드에서 사용
NEXT_PUBLIC_ 환경변수로 노출
브라우저 번들에 포함
로그에 출력
일반 조회/수정 로직에서 남용
```

service role을 사용하는 작업은 가능한 한 audit log를 남긴다.

## 7. 운영 데이터 수정 규칙

운영 데이터 수정은 일반 UI 또는 승인된 script를 통해서만 수행한다.

금지:

```txt
운영 SQL Editor에서 임의 UPDATE
운영 SQL Editor에서 임의 DELETE
감사 로그 없이 권한 변경
감사 로그 없이 병합 상태 변경
```

예외적 hotfix가 필요한 경우:

```txt
1. 수정 사유 기록
2. 영향 row 확인
3. 변경 전 snapshot 확보
4. 승인자 확인
5. SQL 또는 script 실행
6. audit log 기록
7. 변경 결과 검증
```

권장 hotfix 로그 항목:

```txt
작업자
승인자
사유
대상 테이블
대상 row
변경 전 값
변경 후 값
실행 시각
검증 결과
```

## 8. 삭제 규칙

Y&ARCHER WORKS는 물리 삭제보다 soft delete를 우선한다.

예외:

```txt
경량 부속 레코드(hub.master_aliases 등)는 잘못 등록된 항목 정리를 위해
물리 삭제(DELETE)를 허용한다. 마스터 본체·업무 데이터·감사 로그에는 적용하지 않는다.

법적 개인정보 파기(physical delete)는 화면/API 경로가 아니라
관리자 전용 운영 절차로만 수행한다 — yna_suite_backup_retention_privacy.md §7 참고.
```

권장:

```txt
status = 'deleted'
status = 'archived'
deleted_at
deleted_by
archived_at
archived_by
```

물리 삭제가 가능한 경우:

```txt
잘못 들어간 staging 데이터
운영 반영 전 import dry-run 데이터
법적/보안상 완전 삭제가 필요한 데이터
개발/테스트 데이터
```

물리 삭제 시에도 가능하면 audit log 또는 batch log를 남긴다.

## 9. Status 값 관리

`status` 컬럼은 자유 문자열처럼 남발하지 않는다.

원칙:

```txt
도메인별 허용 status 목록을 문서화한다.
새 status를 추가하면 data_model 문서도 갱신한다.
UI 배지, 필터, RLS 조건에 영향이 있는지 확인한다.
```

공통 status 예시:

```txt
draft
pending
active
inactive
archived
rejected
deleted
merged
```

주의:

```txt
status 값 하나를 여러 의미로 재사용하지 않는다.
예: inactive를 삭제/중지/만료 의미로 동시에 쓰지 않는다.
```

## 10. Index/FK 추가 기준

인덱스는 조회 패턴이 명확할 때 추가한다.

인덱스 후보:

```txt
FK 컬럼
자주 필터링하는 status
검색용 normalized_name
created_at 정렬
도메인별 목록 필터 컬럼
```

FK 원칙:

```txt
업무 테이블은 Hub 마스터를 FK로 참조한다.
FK가 병합으로 변경될 수 있는 경우 merge_events에 affected_records를 기록한다.
삭제 cascade는 신중하게 사용한다.
대부분의 업무 데이터는 cascade delete보다 restrict 또는 set null을 우선 검토한다.
```

## 11. Audit Log 필수 액션

다음 액션은 감사 로그를 남긴다.

```txt
권한 생성/변경/회수
마스터 병합 승인/반려
마스터 대표값 변경
삭제/복구
승인/반려
민감 파일 다운로드
민감 정보 조회
service role 기반 운영 작업
운영 데이터 hotfix
```

감사 로그 위치:

```txt
권한 변경: admin.permission_audit_logs
일반 민감 액션: hub.audit_logs
마스터 병합: hub.merge_events + hub.audit_logs
import 작업: staging.import_batches + staging.*_import_rows
```

## 12. 마스터 병합 DB 규칙

마스터 병합은 단순 UPDATE가 아니다.

원칙:

```txt
source record는 status='merged'로 변경한다.
source record에는 merged_into_id를 남긴다.
주요 업무 FK는 비동기 백그라운드 작업(pg_net 등)을 통해 최종 target master로 업데이트하여 DB 락 유발을 방지한다.
변경된 업무 FK는 merge_events.affected_records에 기록한다.
before_snapshot/after_snapshot을 남긴다.
대표값에서 밀려난 값은 aliases/identifiers/history에 보존한다.
```

병합은 동기식 락 최소화 트랜잭션과 비동기 백그라운드 데이터 갱신의 2단계로 분리 처리한다.

```txt
[1단계: 동기식 락 최소화 트랜잭션]
1. source/target row lock (SELECT ... FOR UPDATE)
2. snapshot 생성
3. target 대표값 갱신
4. aliases/identifiers/history 기록
5. source status='merged' 변경 및 merged_into_id 기록
6. merge_events 기록 (비동기 처리 대기 상태)
7. audit_logs 기록
8. commit

[2단계: 비동기 백그라운드 FK 업데이트]
1. pg_net 비동기 쿼리 호출 또는 Edge Function 백그라운드 워커 트리거
2. 타 도메인 스키마(work, mna 등)의 FK를 순차적/배치 단위로 업데이트 (락 병목 방지)
3. affected_records 업데이트 결과 및 최종 상태 완료 처리
```

## 13. Seed 데이터 규칙

Seed 데이터는 dev/staging 중심으로 사용한다.

허용:

```txt
개발용 사용자
개발용 권한 템플릿
샘플 스타트업
샘플 프로그램
RLS 테스트용 계정/데이터
```

주의:

```txt
production seed는 최소화한다.
production에 테스트 데이터 seed 금지.
운영 초기 필수 코드/설정만 production seed로 허용한다.
```

## 14. Backfill 규칙

기존 row에 새 컬럼 값을 채우는 작업은 backfill로 분리한다.

원칙:

```txt
schema 변경과 대량 데이터 변경을 분리한다.
대량 backfill은 batch 단위로 실행한다.
실패 row를 기록한다.
운영 실행 전 staging에서 row 수와 성능을 확인한다.
```

예시:

```txt
1차 migration: nullable 컬럼 추가
backfill script: 기존 row 값 채움
2차 migration: NOT NULL 제약 추가
```

## 15. Rollback 규칙

모든 변경이 완전 rollback 가능한 것은 아니다. 따라서 변경 전 rollback 전략을 검토한다.

권장:

```txt
컬럼 삭제보다 deprecated 처리
테이블 삭제보다 archived 처리
데이터 변경 전 snapshot 확보
대량 변경은 batch 단위 기록
```

Rollback 방식:

```txt
schema rollback
data rollback
feature flag rollback
app deploy rollback
```

DB 변경과 앱 배포가 함께 있는 경우, 앱 rollback만으로 해결되는지 DB rollback도 필요한지 사전에 확인한다.

## 16. 운영 반영 절차

운영 반영 순서:

```txt
1. migration 검토
2. local/dev 적용
3. staging 적용
4. RLS/권한 테스트
5. smoke test
6. production 적용
7. 앱 배포
8. production smoke test
9. 결과 기록
```

DB migration이 앱 배포보다 먼저 필요한지, 앱 배포 후 필요한지 명확히 판단한다.

## 17. DB 변경 체크리스트

변경 전:

```txt
관련 문서를 갱신했는가?
migration 파일이 있는가?
staging에서 검증했는가?
RLS 영향이 있는가?
기존 데이터 backfill이 필요한가?
rollback 전략이 있는가?
audit log 대상인가?
service role이 필요한가?
```

변경 후:

```txt
production 적용 결과를 확인했는가?
주요 query가 정상인가?
권한 없는 접근이 차단되는가?
권한 있는 접근이 허용되는가?
로그/감사 기록이 남는가?
관련 앱 smoke test를 통과했는가?
```

## 18. 최종 요약

Y&ARCHER WORKS의 DB 운영은 다음 규칙을 핵심으로 한다.

```txt
DB 변경은 migration으로만 관리한다.
운영 DB 직접 수정은 금지한다.
RLS는 기본 deny로 설계한다.
service role은 서버 전용이며 최소 사용한다.
삭제보다 soft delete를 우선한다.
민감 액션은 감사 로그를 남긴다.
마스터 병합은 트랜잭션과 이력 보존을 전제로 한다.
production 반영 전 staging에서 검증한다.
```

DB는 Y&ARCHER WORKS의 가장 중요한 운영 자산이다. 화면은 고칠 수 있지만, 데이터 이력과 권한 경계가 깨지면 신뢰를 회복하기 어렵다. 따라서 DB 변경은 항상 보수적으로, 기록 가능하게, 되돌릴 수 있게 설계한다.
