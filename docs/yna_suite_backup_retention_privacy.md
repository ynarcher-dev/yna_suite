# Y&A Suite 백업, 보존 및 개인정보 운영 가이드

본 문서는 Y&A Suite의 백업, 복구, 데이터 보존, 개인정보 파기/마스킹, 감사 로그 보존 기준을 정의한다.

Y&A Suite는 전사 마스터 데이터, 투자/M&A/프로젝트/HR 정보, 외부 사용자 제출자료를 다루므로 기능 구현만큼 데이터 보존과 파기 기준이 중요하다.

관련 문서:

```txt
보안 정책: yna_suite_security_policy.md
DB 운영: yna_suite_database_operations.md
데이터 모델: yna_suite_data_model.md
환경/배포: yna_suite_environment_deployment.md
마이그레이션: yna_suite_migration_strategy.md
```

## 1. 핵심 원칙

데이터 보존과 개인정보 운영은 다음 원칙을 따른다.

```txt
업무 이력은 필요한 기간 동안 보존한다.
개인정보는 목적 달성 후 최소화 또는 파기한다.
삭제는 기본적으로 soft delete를 사용하되 법적/보안상 필요하면 완전 삭제한다.
백업은 복구 가능한지 정기적으로 검증한다.
staging/preview에는 운영 개인정보를 그대로 사용하지 않는다.
감사 로그는 임의 수정/삭제하지 않는다.
```

## 2. 데이터 분류

| 등급 | 예시 | 운영 기준 |
| :--- | :--- | :--- |
| Public | 공개 회사명, 공개 웹사이트 | 일반 보존 가능 |
| Internal | 내부 업무 메모, 프로그램 운영 데이터 | 로그인 사용자 제한 |
| Restricted | 평가 점수, 투자 내역, M&A 딜, HR 기록 | 권한자 제한, 다운로드 로그 |
| Personal | 이름, 이메일, 전화번호, 주소 | 개인정보 최소 수집/마스킹 |
| Secret | service role key, internal secret | 백업 문서/로그에 저장 금지 |

데이터는 여러 등급을 동시에 가질 수 있다.

예시:

```txt
전문가 평가 의견:
  Restricted + Personal 가능

스타트업 대표자 전화번호:
  Personal

M&A 실사자료:
  Restricted
```

## 3. 백업 기준

production 데이터는 정기 백업을 전제로 한다.

권장:

```txt
DB 자동 백업: 매일
중요 배포 전 snapshot: production migration 전
파일/Storage 백업: 주기적 또는 bucket 정책에 따라
원본 import 파일: 별도 보존
```

백업 대상:

```txt
Postgres DB
Supabase Storage metadata
중요 첨부 파일
원본 import 파일/CSV/XLSX
migration 파일
릴리즈 기록
```

백업에 포함하지 않아야 하는 것:

```txt
환경변수 secret 원문
service role key
access token
refresh token
```

## 4. 복구 기준

복구는 백업보다 중요하다. 백업이 있어도 복구가 검증되지 않으면 운영 기준을 만족하지 못한다.

복구 목표는 다음처럼 정한다.

| 항목 | 권장 기준 |
| :--- | :--- |
| RPO | 24시간 이내 데이터 손실 목표 |
| RTO | 주요 서비스 4시간 이내 복구 목표 |

초기 Phase 1에서는 위 기준을 목표로 두고, 실제 운영 중요도에 따라 조정한다.

복구 훈련:

```txt
분기 1회 이상 staging 환경에서 복구 리허설
DB snapshot 복원 확인
핵심 테이블 row 수 검증
로그인/RLS smoke test
첨부파일 접근 검증
```

## 5. 보존 기간 기준

정확한 법적 보존 기간은 별도 법무/회계 검토가 필요하다. 본 문서는 제품 운영 기준을 정한다.

권장 기준:

| 데이터 | 권장 보존 |
| :--- | :--- |
| Hub 마스터 기본 정보 | 업무상 필요 기간 동안 보존 |
| 마스터 alias/identifier/history | 마스터 신뢰도 유지 기간 동안 보존 |
| 프로그램 신청/평가/멘토링 | 사업 종료 후 내부 기준 기간 |
| M&A/투자/계약 자료 | 계약/회계/법무 기준 기간 |
| HR 기록 | 인사/노무 기준 기간 |
| audit log | 최소 3년 이상 권장 |
| import raw_payload | 검증 완료 후 archive 또는 마스킹 |
| staging 개인정보 | 운영 검증 후 최소화/마스킹 |

주의:

```txt
법정 보존 대상은 임의 삭제하지 않는다.
개인정보 파기 요청과 업무상 보존 의무가 충돌할 수 있으므로 처리 기준을 별도 기록한다.
```

## 6. 개인정보 최소화

개인정보는 필요한 목적과 화면에 맞게 최소한으로 처리한다.

수집 최소화:

```txt
필수 입력과 선택 입력을 분리한다.
목록 화면에는 최소 식별 정보만 표시한다.
다운로드에는 필요한 필드만 포함한다.
외부 사용자에게 내부 개인정보를 노출하지 않는다.
```

마스킹 권장:

```txt
전화번호: 010-****-5678
이메일: h***@example.com
주소: 시/군/구 단위까지만 기본 노출
이름: 상황에 따라 홍*동
```

원본 조회가 필요한 경우:

```txt
권한자만 허용
조회 사유 요구 검토
audit log 기록
```

## 7. 개인정보 파기/익명화

개인정보 파기는 데이터 관계를 고려해 처리한다.

처리 방식:

| 방식 | 의미 | 사용 예 |
| :--- | :--- | :--- |
| soft delete | status/deleted_at 처리 | 일반 삭제 |
| masking | 일부 문자 비식별화 | 목록/리포트 |
| anonymization | 개인 식별 불가 형태로 변환 | 통계 보존 |
| physical delete | 물리 삭제 | 법적/보안상 완전 삭제 필요 |

개인정보 삭제 요청 처리:

```txt
1. 요청자 신원 확인
2. 대상 데이터 식별
3. 업무/법적 보존 필요 여부 검토
4. 삭제/마스킹/익명화 방식 결정
5. 처리 전 snapshot 또는 처리 기록 생성
6. 처리 수행
7. 결과 기록
```

주의:

```txt
audit log 자체는 임의 삭제하지 않는다.
단, audit log에 과도한 개인정보가 들어가지 않도록 처음부터 제한한다.
```

## 8. Audit Log 보존

감사 로그는 운영 신뢰를 위한 핵심 데이터이다.

대상:

```txt
권한 변경
마스터 병합
민감 정보 조회
민감 파일 다운로드
대량 export
운영 hotfix
service role 작업
```

보존 원칙:

```txt
수정/삭제 금지
정정 필요 시 correction event 추가
개인정보 원문 payload 저장 금지
request_id와 actor_user_id 중심 기록
```

감사 로그 보존 기간:

```txt
최소 3년 이상 권장
투자/M&A/HR 관련 로그는 내부 정책에 따라 연장 검토
```

## 9. Import Raw Data 보존

마이그레이션 raw_payload는 유용하지만 위험하다.

원칙:

```txt
raw_payload에는 원본 개인정보가 들어갈 수 있다.
접근 권한을 migration 담당자/관리자로 제한한다.
운영 검증 후 archive 또는 마스킹을 검토한다.
```

권장 처리:

```txt
import 직후: 원본 보존
검증 완료 후: archive
장기 보존 시: 민감 필드 마스킹
재처리 가능성 낮음: 별도 보관소 이동
```

## 10. Staging/Preview 데이터

staging은 운영 유사 검증이 필요하지만 개인정보 노출 위험을 줄여야 한다.

원칙:

```txt
staging에 production 개인정보를 그대로 복제하지 않는다.
필요 시 마스킹한 snapshot을 사용한다.
preview는 dev Supabase와 샘플 데이터만 사용한다.
외부 공유 preview에는 민감 데이터를 넣지 않는다.
```

마스킹 대상:

```txt
이름
이메일
전화번호
주소
대표자명
평가 의견
파일명에 포함된 개인정보
```

## 11. 파일/첨부 보존

파일은 Supabase Storage에 저장하고 DB에는 metadata를 둔다.

파일 등급별 기준:

| visibility | 보존/접근 기준 |
| :--- | :--- |
| `public` | 공개 가능 자료 |
| `internal` | 내부 사용자 제한 |
| `restricted` | 도메인 권한자 제한 |
| `owner_only` | 소유자/관리자 제한 |

삭제 기준:

```txt
잘못 업로드된 파일은 삭제 가능
민감 파일 삭제는 audit log 대상
업무/계약 보존 대상 파일은 임의 삭제 금지
```

다운로드:

```txt
signed URL 사용
민감 파일은 짧은 만료시간
다운로드 audit log 기록
```

## 12. Secret 보존 금지

secret은 백업 문서나 로그에 저장하지 않는다.

금지:

```txt
service role key를 문서에 기록
JWT secret을 로그에 출력
환경변수 파일을 백업 저장소에 평문 업로드
secret이 포함된 screenshot 공유
```

secret 유출 시:

```txt
즉시 rotate
기존 key 폐기
환경변수 갱신
접근 로그 확인
영향 서비스 smoke test
사고 기록 작성
```

## 13. 데이터 삭제와 마스터 병합의 차이

마스터 병합은 삭제가 아니다.

병합:

```txt
source status='merged'
merged_into_id 기록
업무 FK를 target으로 이동
alias/identifier/history 보존
merge_events 기록
```

삭제:

```txt
status='deleted'
deleted_at/deleted_by 기록
필요 시 개인정보 마스킹
```

주의:

```txt
중복 마스터를 병합해야 할 상황에서 삭제로 처리하지 않는다.
삭제는 업무 이력 유실 위험이 크다.
```

## 14. 운영 요청 처리

데이터 보존/삭제/복구 요청은 기록을 남긴다.

요청 유형:

```txt
개인정보 삭제 요청
파일 삭제 요청
잘못된 데이터 정정 요청
백업 복구 요청
export 요청
```

기록 항목:

```txt
요청자
처리자
승인자
요청 사유
대상 데이터
처리 방식
처리 일시
검증 결과
```

## 15. 체크리스트

새 개인정보 필드를 추가할 때:

```txt
수집 목적이 명확한가?
필수값이어야 하는가?
목록 화면에 노출되어야 하는가?
마스킹이 필요한가?
export에 포함될 수 있는가?
보존 기간이 정해졌는가?
삭제/익명화 방식이 있는가?
```

새 파일 업로드 기능을 만들 때:

```txt
visibility가 정해졌는가?
권한 체크가 있는가?
public bucket을 사용하지 않는가?
signed URL을 사용하는가?
다운로드 audit log가 필요한가?
보존/삭제 기준이 있는가?
```

백업/복구 점검:

```txt
최근 백업 시각을 확인했는가?
복구 리허설을 했는가?
RPO/RTO 기준을 만족하는가?
백업에 secret이 포함되지 않았는가?
```

## 16. 최종 요약

Y&A Suite의 데이터 보존과 개인정보 운영은 다음을 핵심으로 한다.

```txt
업무 이력은 보존하되 개인정보는 최소화한다.
백업은 복구 검증까지 포함해야 의미가 있다.
staging/preview에는 운영 개인정보를 그대로 쓰지 않는다.
감사 로그는 수정/삭제하지 않는다.
파일 다운로드와 export는 데이터 유출 관점에서 별도 관리한다.
secret은 백업/로그/문서에 남기지 않는다.
```

데이터는 기능의 부산물이 아니라 Y&A Suite의 가장 중요한 자산이다. 따라서 보존, 파기, 복구 기준은 개발 초기에 함께 설계해야 한다.
