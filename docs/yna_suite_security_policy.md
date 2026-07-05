# Y&ARCHER WORKS 보안 정책 가이드

본 문서는 Y&ARCHER WORKS의 보안 기준을 정의한다. 인증/권한/RLS의 세부 구조는 `yna_suite_auth_permissions.md`를 따르며, 본 문서는 개인정보, 비밀키, 외부 사용자, 파일, 로그, 운영 보안을 포함한 종합 보안 원칙을 다룬다.

관련 문서:

```txt
인증/권한/RLS: yna_suite_auth_permissions.md
DB 운영 규칙: yna_suite_database_operations.md
환경/배포/secret: yna_suite_environment_deployment.md
마스터 데이터 정책: yna_suite_master_data_policy.md
데이터 모델: yna_suite_data_model.md
```

## 1. 핵심 원칙

Y&ARCHER WORKS의 보안은 다음 원칙을 따른다.

```txt
최소 권한 원칙
기본 차단, 명시 허용
외부 사용자는 자기 데이터만 접근
민감 정보는 필요한 화면에서만 노출
비밀키는 서버 전용으로 관리
감사 로그로 민감 액션 추적
운영 데이터와 개발 데이터를 분리
```

## 2. 데이터 분류

Y&ARCHER WORKS의 데이터는 민감도에 따라 분류한다.

| 등급 | 예시 | 처리 기준 |
| :--- | :--- | :--- |
| Public | 공개 가능한 회사명, 공개 웹사이트 | 제한 낮음 |
| Internal | 내부 업무 메모, 프로그램 운영 데이터 | 로그인 사용자만 |
| Restricted | 평가 점수, 투자 내역, M&A 딜, HR 기록 | 권한자만 |
| Secret | service role key, 내부 API secret | 서버 전용 |
| Personal | 이름, 이메일, 전화번호, 대표자 정보 | 개인정보 기준 적용 |

기본 정책:

```txt
개인정보와 Restricted 데이터는 기본 비공개로 취급한다.
외부 사용자에게 내부 메모, 평가 점수, 투자/M&A 정보는 노출하지 않는다.
```

## 3. 개인정보 보호

개인정보에 해당할 수 있는 필드:

```txt
이름
이메일
전화번호
대표자명
담당자명
주소
직책/소속
평가 의견 중 개인 식별 가능 내용
```

원칙:

```txt
필요한 목적에 맞는 최소 개인정보만 수집한다.
목록 화면에서는 필요한 정보만 표시한다.
다운로드/export는 권한자에게만 허용한다.
민감 개인정보 조회/다운로드는 audit log 대상이다.
staging/preview에는 운영 개인정보를 그대로 사용하지 않는다.
```

마스킹 권장:

```txt
전화번호: 010-****-5678
이메일: h***@example.com
주소: 시/군/구 단위까지만 노출
```

## 4. 인증 보안

인증은 Supabase Auth를 기준으로 한다.

원칙:

```txt
이메일 기반 계정 사용
서비스별 callback URL allowlist 관리
세션 만료 정책 적용
비활성 사용자 접근 차단
퇴사자/계약 종료자 계정 비활성화
```

권장:

```txt
관리자 계정은 MFA 적용 검토
관리(ADMIN) 섹션 접근 계정은 최소 인원으로 제한
외부 사용자는 제한된 도메인 권한만 부여
```

## 5. 권한 보안

권한은 다음 조합으로 판단한다.

```txt
User Role + Domain Permission + Data Scope
```

원칙:

```txt
권한 없음이 기본값이다.
쓰기 권한은 읽기 권한보다 엄격하게 관리한다.
임시 권한은 expires_at을 설정한다.
JWT 기반 RLS를 쓰더라도 expires_at은 claim에 포함하고 RLS helper에서 now()와 비교해 만료 즉시 차단한다.
권한 변경은 admin.permission_audit_logs에 기록한다.
관리(ADMIN) 섹션 접근은 master 또는 제한된 관리자에게만 허용한다.
```

외부 사용자:

```txt
guest_expert:
  본인에게 배정된 평가/멘토링만 접근

guest_startup:
  자기 회사 신청/제출 자료만 접근

외부 사용자는 Hub/Dev/Fund/M&A/Management에 직접 접근하지 않는다.
```

## 6. RLS 보안

RLS는 보안의 최종 방어선이다.

원칙:

```txt
업무 테이블은 RLS 활성화
기본 deny
read/write 정책 분리
scope 조건 반영
외부 사용자는 self/company 범위 제한
```

주의:

```txt
UI에서 메뉴나 버튼을 숨기는 것은 보안이 아니다.
직접 API 호출을 해도 RLS가 차단해야 한다.
```

RLS 변경은 staging에서 권한별 테스트 후 production에 반영한다.

## 7. Secret 관리

Secret은 코드와 문서에 직접 작성하지 않는다.

Secret 예시:

```txt
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
APP_ENCRYPTION_KEY
INTERNAL_API_SECRET
IMPORT_JOB_SECRET
```

금지:

```txt
Git에 secret 커밋
NEXT_PUBLIC_ 환경변수로 secret 노출
브라우저 번들에 service role 포함
로그에 secret 출력
문서에 실제 key 작성
```

사용 위치:

```txt
Vercel Environment Variables
Supabase Dashboard Secrets
로컬 .env.local
서버 전용 route/action/script
```

## 8. Service Role 보안

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회할 수 있으므로 매우 제한적으로 사용한다.

허용:

```txt
마이그레이션/이관 script
관리자 승인 batch job
마스터 병합 트랜잭션
서버 전용 운영 작업
```

금지:

```txt
클라이언트 코드
일반 조회 화면
일반 사용자 요청 처리
외부 사용자 요청 처리
```

service role 사용 작업은 audit log 또는 batch log를 남긴다.

## 9. 파일/첨부 보안

파일은 Supabase Storage에 저장하고 DB에는 메타데이터만 저장한다.

파일 등급:

```txt
public
internal
restricted
owner_only
```

보안 원칙:

```txt
실사자료, 계약서, 평가자료, HR 자료는 restricted 이상으로 취급한다.
외부 사용자는 자기 제출 파일 또는 허용된 파일만 접근한다.
파일 다운로드는 권한 체크 후 허용한다.
민감 파일 다운로드는 audit log 대상이다.
```

금지:

```txt
민감 파일 public bucket 저장
파일 URL을 영구 공개 링크로 공유
권한 체크 없는 다운로드 route
```

## 10. Export/다운로드 보안

엑셀/CSV 다운로드는 데이터 유출 위험이 크다.

원칙:

```txt
다운로드 권한을 별도로 관리한다.
개인정보 포함 export는 제한한다.
대량 다운로드는 audit log를 남긴다.
외부 사용자에게 전체 목록 export를 허용하지 않는다.
```

권장:

```txt
다운로드 사유 입력
다운로드 row 수 기록
다운로드 필드 목록 기록
민감 필드 마스킹 옵션 제공
```

## 11. 로그 보안

로그에는 민감 정보를 남기지 않는다.

금지:

```txt
비밀번호
access token
refresh token
service role key
주민등록번호 등 고유식별정보
전체 개인정보 payload
민감 파일 URL
```

허용:

```txt
user_id
domain_name
entity_type
entity_id
action
status code
error code
request id
```

오류 추적에 필요한 정보는 남기되, 원본 개인정보 전체를 그대로 남기지 않는다.

## 12. 입력 검증

모든 입력은 클라이언트와 서버에서 검증한다.

원칙:

```txt
폼 입력은 Zod schema로 검증한다.
서버 작업에서도 동일 또는 별도 schema로 검증한다.
파일 업로드는 확장자, MIME, 크기를 검증한다.
URL, 이메일, 전화번호는 정규화 후 저장한다.
```

주의:

```txt
클라이언트 validation은 사용자 경험용이다.
서버 validation이 최종 방어선이다.
```

## 13. 외부 사용자 보안

외부 사용자 계정은 내부 사용자보다 더 제한적으로 운영한다.

외부 전문가:

```txt
본인 배정 평가/멘토링만 접근
다른 전문가 평가 접근 불가
내부 메모 접근 불가
전체 스타트업 목록 접근 불가
```

참가 스타트업:

```txt
자기 회사 신청/제출 자료만 접근
다른 스타트업 정보 접근 불가
평가위원 내부 점수 접근 불가
내부 심사 메모 접근 불가
```

외부 사용자 기능은 RLS와 E2E 테스트를 반드시 포함한다.

## 14. 운영 환경 보안

운영 환경은 개발/검증 환경과 분리한다.

원칙:

```txt
production DB와 dev/staging DB 분리
preview가 production Supabase에 연결되지 않도록 관리
staging 데이터는 민감정보 마스킹 권장
운영 배포 전 staging에서 권한/RLS 테스트
```

운영 DB에 테스트 데이터를 넣지 않는다.

## 15. 보안 이벤트 감사 로그

다음 이벤트는 감사 로그 대상이다.

```txt
로그인 실패 반복
권한 변경
관리자 권한 부여
마스터 병합
민감 데이터 조회
민감 파일 다운로드
대량 export
운영 데이터 hotfix
service role 기반 작업
```

감사 로그에는 다음을 남긴다.

```txt
actor_user_id
target_user_id 또는 entity_id
domain_name
action
before_value
after_value
reason
created_at
request_id
```

## 16. 보안 테스트 기준

권한/RLS 테스트는 필수이다.

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

검증 항목:

```txt
권한 없는 앱 접근 차단
읽기 전용 사용자의 쓰기 차단
외부 전문가의 타인 데이터 접근 차단
참가 스타트업의 타사 데이터 접근 차단
service role 없는 일반 요청의 RLS 적용
민감 파일 다운로드 권한 검증
```

## 17. 사고 대응

보안 사고 또는 의심 이벤트 발생 시 다음 순서로 대응한다.

```txt
1. 영향 범위 확인
2. 관련 계정/권한 임시 차단
3. 로그와 audit trail 확보
4. 노출 데이터 범위 파악
5. secret 유출 시 즉시 rotate
6. 재발 방지 조치
7. 문서/정책 갱신
```

secret 유출 시:

```txt
즉시 key rotate
기존 key 폐기
배포 환경변수 갱신
접근 로그 확인
영향 서비스 smoke test
```

## 18. 코드 리뷰 보안 체크리스트

보안 관점에서 PR 리뷰 시 확인한다.

```txt
권한 체크가 필요한 화면인가?
RLS 정책이 필요한 테이블인가?
service role이 클라이언트에 노출되지 않는가?
외부 사용자가 접근 가능한 route인가?
민감 필드가 목록에 과도하게 노출되지 않는가?
다운로드/export에 권한 체크가 있는가?
로그에 개인정보나 secret이 남지 않는가?
입력값 서버 검증이 있는가?
문서 갱신이 필요한 보안 변경인가?
```

## 19. 최종 요약

Y&ARCHER WORKS 보안의 핵심은 다음과 같다.

```txt
최소 권한
기본 차단
RLS 최종 방어
외부 사용자의 범위 제한
secret 서버 전용 관리
민감 액션 감사 로그
개인정보 최소 노출
운영/개발 환경 분리
```

Y&ARCHER WORKS는 전사 마스터 데이터, 투자/프로젝트/M&A/HR 데이터를 다룬다. 따라서 보안은 기능 개발 후 붙이는 장치가 아니라, 데이터 모델, 권한, UI, 배포, 운영 절차 전반에 함께 들어가야 한다.
