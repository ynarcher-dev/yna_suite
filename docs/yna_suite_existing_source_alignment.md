# Y&A Suite 기존 소스 반영 가이드

본 문서는 기존 구현체인 `yna-db`와 `yna-matching`을 새 Y&A Suite에 어떻게 반영할지 정의한다. 핵심 원칙은 다음이다.

```txt
정책, DB 경계, 권한, RLS는 새 Suite 기준을 따른다.
서비스 흐름, 화면 감각, 운영 업무 구조는 기존 구현에서 검증된 것을 적극 반영한다.
```

기존 구현은 폐기 대상이 아니라 서비스 경험의 원형이다. 다만 기존 DB 통합 방식과 권한 정책이 일관되지 않았으므로, 새 Suite에서는 스키마와 정책을 다시 정리한다.

## 1. 기존 소스의 역할

### 1.1 `yna-db`

`yna-db`는 새 Suite의 Hub/Dev 서비스 원형으로 본다.

반영 대상:

```txt
스타트업, 전문가, 협력사, 매니저 관리 흐름
내부 운영자 중심의 PMS 화면 구성
관리자 계정 생성/삭제/비밀번호 초기화 흐름
마스터 데이터 목록/상세/검색/필터 UX
기존 업무 데이터에서 Hub 마스터로 이어지는 운영 감각
```

새 Suite에서는 위 서비스 흐름을 참고하되, 기존 `public` 중심 schema나 단순 `admin/manager` 권한 모델을 그대로 가져오지 않는다.

### 1.2 `yna-matching`

`yna-matching`은 새 Suite의 Work 서비스 원형으로 본다.

반영 대상:

```txt
Program First 구조
모집
신청자/참여자 관리
서류평가
현장평가
오리엔테이션
멘토링
비즈니스 매칭
데모데이
성과관리
외부 스타트업/전문가 접근 흐름
운영자/스태프/전문가/스타트업 역할 분리
```

새 Suite에서는 `yna-matching`의 Work 업무 구조를 적극 반영하되, Hub 마스터와 Dev 권한을 우회하는 별도 사용자/마스터 체계는 새 정책에 맞게 재구성한다.

## 2. 변경하지 않을 기준

기존 소스를 반영하더라도 다음 기준은 새 Suite 정책을 따른다.

```txt
Hub는 스타트업/전문가/협력사/매니저 마스터의 주인이다.
Dev는 계정, 권한, scope, 권한 감사 로그의 주인이다.
Work는 프로그램 실행 기록, 신청, 평가, 참여, 활동, 성과의 주인이다.
Work는 Hub 마스터를 직접 수정하지 않는다.
Work에서 새 대상이 유입되면 Hub 임시 마스터와 병합 후보 흐름을 탄다.
권한은 dev.user_permissions와 RLS를 최종 기준으로 판단한다.
민감 액션은 audit log를 남긴다.
```

## 3. Work 서비스 구조 반영

Work는 단순한 신청/평가 앱이 아니라 Y&A가 수행하는 실행형 업무를 프로그램 단위로 운영하고 기록하는 앱이다.

기준 모델:

```txt
Program First
  -> Module
  -> Activity
  -> Record
```

의미:

```txt
Program
  사업, 액셀러레이팅, 행사 묶음의 최상위 단위

Module
  모집, 평가, 멘토링, 비즈니스 매칭, 데모데이 같은 정형 기능 단위

Activity
  실제 일정, 세션, 커스텀 행사, 내부/외부 회의, 워크숍 같은 실행 단위

Record
  신청, 평가 결과, 멘토링 기록, 매칭 결과, 성과, 회의록, 첨부파일
```

## 4. Work 모듈 목록

Work의 정형 모듈 후보는 다음을 기준으로 한다.

```txt
recruitment           모집
participant_management 신청자/참여자 관리
document_review       서류평가
onsite_evaluation     현장평가
orientation           오리엔테이션
mentoring             멘토링
business_matching     비즈니스 매칭
demo_day              데모데이
outcome_management    성과관리
custom_event          커스터마이즈 행사
```

`custom_event`는 정형 모듈로 표현하기 어려운 운영 행사를 수용하기 위한 확장 지점이다. 예를 들어 IR 리허설, 기관 협의 미팅, 네트워킹 행사, 투자자 라운드테이블, 내부 운영회의 등을 별도 테이블 난립 없이 Activity로 관리한다.

## 5. 커스터마이즈 행사와 Activity

커스터마이즈 행사는 `program_activities`로 표현한다.

Activity가 다룰 수 있는 예:

```txt
IR 리허설
선정위원 사전회의
기업 현장방문
기관 협의 미팅
네트워킹 행사
투자자 라운드테이블
중간점검 워크숍
내부 운영회의
```

Activity는 프로그램, 모듈, Hub 마스터, 첨부파일, 회의록을 연결하는 가벼운 실행 단위이다.

## 6. 회의록 범위

회의록은 무거운 협업/TODO 시스템이 아니라 프로그램 운영 중 발생한 핵심 논의와 결정을 남기는 가벼운 기록 기능으로 정의한다.

Phase 1/2 기준 필드:

```txt
연결 대상: program, module, activity
제목
안건
논의 내용
결정사항
첨부파일
작성자
작성일
수정일
```

Phase 1/2에서 제외:

```txt
참석자 정교 관리
후속 조치
담당자
기한
공개 범위 고급 설정
회의록 전용 감사 로그
```

회의록에서 Hub 마스터 변경 단서가 발견되더라도 Hub 데이터를 직접 수정하지 않는다. 필요한 경우 Hub correction request 또는 임시 마스터/병합 후보 흐름으로 연결한다.

## 7. Phase 반영 원칙

Phase 1:

```txt
Hub/Dev를 완성한다.
Work 전체 앱은 완성하지 않는다.
단, Work가 붙을 데이터 계약은 Program First 기준으로 검증한다.
Mock/Test flow에는 program, application, temporary master, merge candidate 흐름을 포함한다.
가능하면 custom activity와 가벼운 meeting minutes 구조도 mock 범위에서 확인한다.
```

Phase 2:

```txt
Y&A Work를 첫 실제 도메인 앱으로 붙인다.
yna-matching의 Program First 흐름을 기준으로 Work 화면과 업무 모듈을 구현한다.
모집, 참여자, 평가, 오리엔테이션, 멘토링, 비즈니스 매칭, 데모데이, 성과관리를 순차적으로 붙인다.
custom activity와 meeting minutes는 Work 운영 기록의 기본 기능으로 포함한다.
```

## 8. 최종 요약

```txt
yna-db       = Hub/Dev 서비스 경험의 원형
yna-matching = Work 서비스 경험의 원형

새 Suite 정책 = DB 경계, 권한, RLS, 감사, 마스터 소유권의 최종 기준
기존 소스     = 화면 흐름, 업무 기능, 운영 UX의 기준 자료
```

새 Suite는 기존 앱을 단순 병합하지 않는다. 기존 서비스 감각은 살리고, 데이터 소유권과 정책 경계는 새로 세운다.
