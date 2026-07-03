# 5. Y&A 개발 진행 로그 (핸드오프)

이 문서는 단위 작업이 끝날 때마다 진행 상황을 남겨, **어느 노트북에서든, 대화를 새로 시작하더라도 개발을 이어갈 수 있게** 하는 핸드오프 기록입니다. (근거 규칙: `2_rules.md` 6번)

작동 방식:

```txt
1. 새 작업을 시작하기 전에 3_checklist.md와 이 문서를 먼저 읽는다.
2. 단위 작업을 완료하면 3_checklist.md 체크박스를 갱신하고, 아래에 진행 항목을 추가한다.
3. 기록 후 반드시 commit & push 한다. (다른 노트북에서 pull로 이어받기)
```

주의: 개발 도구(Claude)의 로컬 메모리는 기기 간에 공유되지 않습니다. **현재 상태의 단일 진실 공급원은 저장소에 커밋된 이 문서와 `3_checklist.md`입니다.**

---

## 기록 템플릿

새 항목은 아래 형식으로, **최신 항목이 맨 위**에 오도록 추가합니다.

```markdown
### [YYYY-MM-DD] [기기: 기기명] 단위 작업 제목
*   **완료**: 이번에 무엇을 만들었는지 (파일/폴더/주요 변경점)
*   **현재 상태**: 동작 확인 여부, 통과한 테스트, 남은 이슈
*   **다음 작업**: 이어서 진행할 단위 작업 (3_checklist.md 항목 기준)
*   **주의점**: 임시 처리, 미완성 부분, 참고 사항
```

---

## 진행 기록

### [2026-07-03] [기기: yna_suite dev] Phase 1.9 식별자 · 별칭 · 필드 이력
*   **완료**:
    *   **데이터 모델 보강**(`hub-data/types.ts`): `MasterIdentifier.verifiedStatus`(unverified/verified/rejected), `FieldHistoryEntry.sourceDomain`, `ActionResult.value`(reveal 반환) 추가. DB 컬럼(`master_identifiers.verified_status`·`master_field_history.source_domain`·`master_aliases.source_domain`)은 1.3 마이그레이션(`171003`)에 이미 존재 → 스키마 변경 없음.
    *   **mock 스토어 mutation**(`mock-store.ts`): `setIdentifierPrimary`(같은 (entityId,identifierType) 기존 primary 해제 후 대상만 설정 — 트랜잭션), `setIdentifierVerification`, `removeIdentifier`, `removeAlias`, `revealIdentifier`(audit 후 원본 반환) + 역참조 lookup(`findIdentifier`/`findAlias`/`resolveEntityType`/`identifiersOf`/`aliasesOf`). `addIdentifierRow`/`addAliasRow`는 생성 id 반환(+`verifiedStatus:"unverified"`). `pushFieldHistory`에 sourceDomain(기본 hub). 미사용 스타트업 래퍼 3개(mockAddIdentifier/mockAddAlias/mockSetStartupStatus) 제거.
    *   **엔티티 공용 서버 액션**(`action-helpers.ts` runner + `actions-identifiers.ts`): `setIdentifierPrimaryAction`/`verifyIdentifierAction`/`removeIdentifierAction`/`removeAliasAction`/`revealIdentifierAction`. id 로 소유 마스터 역참조 → 사유 필수·merged 제한 가드 → mutation → revalidate. 스타트업/전문가/협력사 상세가 동일 액션 공유(엔티티별 add 액션은 1.7 그대로 유지).
    *   **공통 API §10~11 HTTP 라우트**: `POST /api/hub/masters/{entity_type}/{id}/identifiers`(201), `PATCH /api/hub/identifiers/{id}`(대표/검증), `DELETE /api/hub/identifiers/{id}`, `POST /api/hub/masters/{entity_type}/{id}/aliases`(201), `DELETE /api/hub/aliases/{id}`. `service-subrecords.ts`(ensureFallback seam + ApiError 코드), `api-map.ts` body 매퍼·snake_case 투영.
    *   **UI**(`components/masters/`): `subrecord-actions.tsx`(공용 `IdentifierRow`/`AliasRow` — 마스킹+원본보기 reveal, 대표지정/검증변경/삭제 사유 dialog, 별칭 삭제), `detail-sections.tsx`가 행 컴포넌트 사용 + 필드이력에 출처 열 추가. 3개 상세 뷰는 기존 `IdentifiersSection`/`AliasesSection` 시그니처 그대로라 무변경.
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 permissions 29·master-data 8·utils 12 pass, `pnpm build`(hub/dev) 2/2(신규 API 라우트 5개 ƒ dynamic 등록). **hub 프로덕션 smoke**: 식별자 POST 201(primary·verified_status unverified)·PATCH verified 200·PATCH primary 200·DELETE 200, 별칭 POST 201·DELETE 200, validation 400(값 누락)·not_found 404(없는 id)·invalid entity 400(manager)·dup 409(중복 사업자번호)·PATCH no-op 400, 상세 `/startups/st-1` 200(검증됨/미검증 배지·출처 열·원본보기·검증변경 버튼·`123-**` 마스킹·history `work` 출처 렌더).
    *   **미검증(이슈26)**: Docker 미설치로 실제 hub RPC(identifier/alias CRUD)·RLS 는 미검증. API·store 는 dev 폴백 seam 으로 구동(env 설정 시 명시적 오류).
*   **다음 작업**: **Phase 1.10 중복 후보 · 수동 병합** — 중복 후보 목록/상세 좌우 비교, 병합 미리보기 API(`.../preview`), 수동 병합 승인/반려/무시/보류, 2단계 비동기 병합 반영(source 상태만 동기 커밋 + 백그라운드 FK). (1.8 에서 임시 생성 시 후보 자동생성·1.6~1.9 에서 상세의 후보 표시는 구현됨 → 1.10 은 병합 승인 트랜잭션·resolved view/helper 를 채운다.)
*   **주의점**:
    *   식별자/별칭 관리에는 **두 진입점**이 있다 — (a) Hub 상세 UI 는 엔티티 공용 **서버 액션**(사유 dialog·revalidate), (b) `/api/hub/...` **HTTP 계약**(§10~11, 크로스앱 재사용·smoke). 둘 다 같은 `mock-store` mutation 으로 수렴한다. Docker/staging 연결 시 mutation 만 hub RPC/쿼리로 교체하면 두 경로가 함께 전환된다(이슈21·25 seam 유지).
    *   **primary 는 (마스터, 식별자유형) 단위**로 단일 — 대표 전화 1개·대표 사업자번호 1개가 공존 가능(정책 §5 "primary 하나만 지정"의 유형별 해석). 
    *   **마스킹은 UX**: 상세 식별자 원본값은 이미 RSC props 에 담겨 클라이언트로 전달되며(목록 마스킹 방침과 동일, 이슈23), "원본 보기"는 audit(`view_sensitive`)를 남기고 이미 보유한 원본을 노출한다. 최종 원본 접근 제어는 실데이터 연결 시 RLS + 서버 마스킹으로 강제.
    *   포트 3000 stale 서버 남으면 smoke 전 종료(이전 handoff 동일).

### [2026-07-03] [기기: yna_suite dev] Phase 1.8 마스터 검색/자동완성 API + 임시 마스터 생성
*   **완료**:
    *   **중복후보 점수(순수, `@yna/master-data`)**: `merge/candidate.ts`(`scoreDuplicateCandidate(a,b)`→score/reasons/conflict, `shouldProposeCandidate`). §13 정책 반영 — 사업자/법인번호 일치=강한 식별자(96↑), 서로 다르면 **충돌로 후보 제외**(자동 병합 금지), 공식 번호 없으면 이름(정확 45/유사 25)·대표자(25)·전화(30)·이메일(30)·도메인(20) 합산 상한 94. 단위 테스트 6개(master-data 총 8 pass). reasons vocabulary 는 seed·상세화면과 동일(`business_number_match`/`normalized_name_exact`/`representative_name_match`/…).
    *   **공통 API 계층**(`apps/hub/src/lib/api/`): `envelope.ts`(성공 `{ok,data,meta:{request_id,next_cursor}}`·실패 `{ok:false,error:{code,message,details}}`·코드→HTTP status·`ApiError`·`handleApiError`), `guard.ts`(`requireHubAccess('read'|'write')` — 세션 없으면 401, hub 권한 없으면 403).
    *   **hub-data 승격**: `masters.ts`에 순수 `normalizeIdentifierValue`/`normalizePersonName`(action-helpers 는 재사용), `mock-temporary.ts`(3종 공용 `mockCreateTemporaryMaster` — TEMP 코드·temporary 검증·식별자 파생[startup/partner: business_number·founder_phone·founder_email·website_domain / expert: email·phone]+명시 식별자/별칭 정규화 저장·`comparableOf`로 비교필드 조립·`generateCandidates`로 활성 동종 마스터와 비교해 pending 후보 자동 생성·audit). `mock-store.ts`에 `displayLabelOf`·`mockSearchApi`(단일 entity_type+display_label), 구 `mockCreateStartup`은 제거. `api-map.ts`(snake_case↔camel 매핑·`isMasterEntity`·body 파싱). `service.ts`에 `searchMasterCandidates`/`createTemporaryMaster`.
    *   **Route Handler**: `app/api/hub/master-search/route.ts`(GET — entity_type·q 필수, limit 1~100 기본 20, include_merged), `app/api/hub/masters/[entity_type]/temporary/route.ts`(POST — 201·merge_candidate_count).
    *   **로컬 입력 UX**(`components/masters/`): `master-search-picker.tsx`(입력값 디바운스 300ms→검색 API, 기존 마스터 목록·선택 시 상세 이동), `master-create-config.ts`(엔티티별 폼 필드·`toTemporaryBody`·`DETAIL_BASE`), `master-create-dialog.tsx`(공용 신규등록 — 자동완성+폼→`POST .../temporary`→상세 이동). 스타트업 전용 `create-startup-dialog.tsx`·`createStartup` 액션 삭제, 3종 목록(startups/experts/partners) "신규 등록"을 공용 dialog+API 로 통일(전문가/협력사는 write 권한 시 신규 등록 신설).
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 master-data 8(candidate 6 신규)·permissions 29·utils 12 pass, `pnpm build`(hub/dev) 2/2(신규 API 2개 ƒ dynamic 등록). **hub 프로덕션 smoke**: 검색 `GET /api/hub/master-search`(startup "알파" 200·매칭필드/점수/display_label), validation 400(q 누락·잘못된 entity_type), 임시생성 `POST .../startup/temporary` 201(UTF-8 payload 로 후보 2 = st-1[94 name_exact+rep+phone]·st-temp[80 name_similar+rep+phone]), `POST .../partner/temporary` 201(사업자번호 일치 강매칭), name 누락/`manager` 400, 생성 마스터 상세 200, `/experts`·`/partners`·`/experts/ex-1`·`/partners/pt-2` 200, 검색 "이심사" 동명이인 ex-3·ex-9 별도, 없는 마스터 404.
    *   **미검증(이슈25)**: Docker 미설치로 실제 hub 스키마·RLS·RPC(`search_master_candidates`/`create_temporary_master`)는 미검증. API·store 는 dev 폴백 seam 으로 구동(env 설정 시 명시적 오류). 크로스오리진(타 도메인 앱→Hub) 인증/CORS 는 Work 연결(Phase 2)에서 처리.
*   **다음 작업**: **Phase 1.9 식별자·별칭·필드 이력** — `master_identifiers` primary 전환 트랜잭션·`master_aliases` 대표값 보존·`master_field_history` 출처/사유·목록 마스킹 원본 조회 audit. (1.6/1.7 에서 상세의 식별자/별칭/이력 표시·추가는 구현됨 → 1.9 는 primary 관리·삭제·API 계약 정합을 마저 채운다.)
*   **주의점**:
    *   중복후보 **점수/사유 vocabulary**는 `@yna/master-data`(순수) 단일 기준. Docker/staging 연결 시 `generateCandidates`·`comparableOf` 를 hub RPC/뷰로 교체하면 3종이 함께 전환된다(이슈21 seam 유지).
    *   임시 생성은 **API(HTTP)** 가 계약이며 dialog 는 same-origin fetch 로 이를 호출한다. 서버 액션(수정/식별자/별칭/상태, 1.6/1.7)은 그대로 유지. 생성만 API 로 승격(중복후보 자동생성 중앙화).
    *   한글 payload 는 curl inline `-d` 에서 콘솔 인코딩으로 깨질 수 있음 → smoke 는 `--data-binary @파일`(UTF-8)로 검증. 실제 브라우저 fetch 는 UTF-8 정상.
    *   포트 3000 stale 서버 남으면 smoke 전 종료(이전 handoff 동일).

### [2026-07-03] [기기: yna_suite dev] Phase 1.7 Y&A Hub — 전문가 · 협력사 마스터
*   **완료**:
    *   **hub-data 엔티티 공용화**: `types.ts`(SimpleMaster→`ExpertMaster`/`PartnerMaster`/`MasterSummary` + `ExpertDetail`/`PartnerDetail`), `masters.ts`(`EDITABLE_EXPERT_FIELDS`·`EDITABLE_PARTNER_FIELDS`·`parseTags`·toSearchResult 를 MasterSummary 로 일반화), `display.ts`(email/phone 식별자 라벨, `EXPERT_IDENTIFIER_TYPES`/`PARTNER_IDENTIFIER_TYPES`, `PARTNER_TYPES`·`partnerTypeLabel`, isSensitiveIdentifier 확장).
    *   **mock 계층**: `mock-seed.ts`(전문가 4[동명이인 이심사 2명]·협력사 4[사업자번호 일치 pt-temp→pt-2] 풀 레코드 + 식별자/별칭/필드이력/중복후보/감사 시드, expertSeq/partnerSeq), `mock-store.ts`(엔티티 공용 `subTables`·`appendAudit(entityType)`·`updateMasterFields`/`addIdentifierRow`/`addAliasRow`/`setMasterStatus` 제네릭 + 스타트업 래퍼, 검색을 전문가[이메일·소속]/협력사[사업자번호·대표자]로 확장), `mock-masters.ts`(전문가/협력사 조회+relatedWork).
    *   **서버 액션**: `action-helpers.ts`(공용 actorName/guardConfigured/norm/normalizeIdentifier[email/phone 추가]/revalidateMaster + `runAddIdentifier`/`runAddAlias`/`runSetStatus` 제네릭 runner), `actions.ts`(startup 을 공용 helper/runner 로 리팩터), `actions-experts.ts`(전문분야 태그 diff 포함 `updateExpertBasic` + 식별자/별칭/상태), `actions-partners.ts`(partner_type 포함 `updatePartnerBasic` + 식별자/별칭/상태). `service.ts` 에 listExperts/getExpertDetail/listPartners/getPartnerDetail.
    *   **공용 컴포넌트**(`components/masters/`): `detail-sections.tsx`(식별자[email/phone 마스킹·title 인자]·별칭·중복후보[basePath]·필드이력·감사·관련업무 — 스타트업 상세에서 이관), `master-add-dialog.tsx`(이관), `master-edit-dialog.tsx`(필드 정의 기반 제네릭), `master-status-dialog.tsx`(제네릭). 스타트업 상세를 이 공용 컴포넌트로 전환하고 startup 전용 edit/status/add/detail-sections 4파일 삭제.
    *   **화면**: `components/experts/*`(experts-table·expert-detail-view — 연락처식별자·전문분야 chips·소속/직함 이력), `components/partners/*`(partners-table·partner-detail-view — 기관유형·식별자·관련 Project/Fund/M&A). 라우트 `(app)/experts`·`experts/[id]`·`partners`·`partners/[id]`. 통합 검색 결과의 전문가/협력사 상세 링크 활성화(`DETAIL_BASE` 맵).
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 utils 12 + master-data 2 + permissions 29 pass, `pnpm build`(hub/dev) 2/2. **hub 프로덕션 실행 후 8개 라우트 HTTP 200(`/experts`·`/experts/ex-1`·`/experts/ex-9`·`/partners`·`/partners/pt-2`·`/partners/pt-temp`·`/search?q=이심사`) + 없는 마스터 404**. 목록 마스킹(`h***@expert.example`·`301-**-*****`·대표자 `정*`/`김*`), 전문가 상세 전문분야 chips·연락처 식별자, 협력사 pt-temp 상세의 business_number_match 96점 중복후보, 검색 "이심사" 두 전문가(ex-3·ex-9) 별도 링크 확인.
    *   **미검증(이슈21 연장)**: Docker 미설치로 실제 hub 스키마 조회·수정·RLS 적용은 미검증. 데이터 seam 은 env 설정 시 명시적 오류로 막아둠.
*   **다음 작업**: **Phase 1.8 마스터 검색/자동완성 API + 임시 마스터 생성** — `GET /api/hub/master-search`(entity_type·q·limit·include_merged, 점수 반환), `POST /api/hub/masters/{entity_type}/temporary`(validation→normalized→TEMP→식별자/별칭→중복후보→audit), 로컬 입력 UX(자동완성→FK 연계→없으면 즉시 임시 생성). 지금 hub-data mock 검색/scoreMatch·임시 생성을 API 계약으로 승격하고 전문가/협력사 신규 등록을 이 API로 연결.
*   **주의점**:
    *   전문가/협력사 **신규 등록 UI 는 이번에 넣지 않음**(functional_spec §8·9 목록 필수기능에 신규 생성 없음). 임시 마스터 생성은 Phase 1.8 공통 API 로 처리 예정(이슈24). 스타트업만 목록에 신규 등록(TEMP) 유지.
    *   중복 후보는 **표시만**(seed 조회). 자동 생성·승인/반려는 Phase 1.10(이슈24). `pt-temp`(business_number 일치)·`ex-9`(동명이인)는 자동 병합하지 않는다는 규칙의 시드 예시.
    *   식별자/별칭/상태 변경 로직은 3개 엔티티가 `action-helpers` 의 공용 runner + `mock-store` 제네릭 mutation 을 공유한다. Docker/staging 연결 시 mock-store 제네릭만 실제 RPC/쿼리로 교체하면 3개 엔티티가 함께 전환된다.
    *   목록 테이블(client)은 startup 과 동일하게 마스킹 전 원본을 props(RSC 페이로드)로 받는다 — UX 마스킹이며 최종 보안은 RLS(이슈23 방침 동일). 포트 3000 stale 서버 종료 후 smoke.

### [2026-07-03] [기기: yna_suite dev] Phase 1.6 Y&A Hub — 스타트업 마스터
*   **완료**:
    *   **Hub 데이터 계층**(`apps/hub/src/lib/hub-data/`): `types.ts`(StartupMaster/SimpleMaster/식별자·별칭·필드이력·중복후보·감사·대시보드·검색결과), `masters.ts`(순수 헬퍼 — `makeMasterCode`·`EDITABLE_STARTUP_FIELDS`·`scoreMatch` 검색점수·`toSearchResult`), `mock-seed.ts`(startup 6종[검증/임시/병합 포함]·expert 3·partner 3·식별자·별칭·필드이력·중복후보·병합이벤트·import batch·감사 seed), `mock-store.ts`(globalThis in-memory + 조회/검색/대시보드 집계 + 수정/식별자/별칭/상태/생성 mutation), `service.ts`(server-only, 폴백=mock/설정=이슈21 오류 seam), `actions.ts`(`updateStartupBasic`/`addIdentifier`/`addAlias`/`setStartupStatus`/`createStartup` — 사유 필수·merged 제한·field_history·normalized·중복방지·감사·revalidate), `display.ts`(검증/상태 배지·엔티티/식별자/별칭/액션 라벨·날짜).
    *   **공통 마스킹**(`@yna/utils/format`): `maskBusinessNumber`(앞3자리)·`maskName`(가운데 마스킹) + `format.test.ts` 8개(utils 총 12 pass).
    *   **화면 4종**(`apps/hub/src/app/(app)/`): `/`(대시보드 — 실 mock 집계 5카드 + 최근 병합/import 위젯, 클릭 이동), `/search`(통합 검색 — 네이티브 GET 폼, 3종 마스터, 병합 포함 옵션), `/startups`(목록 — 필터/검증필터/정렬/페이지·마스킹·신규 등록), `/startups/[id]`(상세 — 기본정보 그리드·식별자·별칭·중복후보·필드이력·업무요약·감사요약 + 수정/식별자/별칭/상태 dialog, merged 배너·수정 제한).
    *   **컴포넌트**(`apps/hub/src/components/`): `dashboard/stat-card`, `search/search-results`, `startups/*`(startups-table·create-startup-dialog·startup-detail-view·detail-sections·edit-startup-dialog·master-add-dialog·status-change-dialog). `@yna/ui` 네이티브 primitive(Table/Select/ConfirmDialog/FilterBar/MasterCodeBadge/StatusBadge) 재사용, 새 의존성 없음.
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 utils 12 + master-data 2 + permissions 29 pass, `pnpm build`(hub/dev) 2/2. **hub 프로덕션 실행 후 5개 라우트 HTTP 200(`/`·`/startups`·`/startups/st-1`·`/startups/st-temp`·`/search`) + 없는 마스터 404**, mock 렌더 확인(대시보드 집계·목록 마스킹[`123-**`·`홍*동`]·검색 매칭·상세 전 섹션·merged 배너/이동 링크).
    *   **미검증(이슈21)**: Docker 미설치로 실제 hub 스키마 조회·수정·RLS 적용은 미검증. 데이터 seam 은 env 설정 시 명시적 오류로 막아둠.
*   **다음 작업**: **Phase 1.7 Y&A Hub — 전문가·협력사 마스터** — 전문가/협력사 목록·상세(동명이인 자동병합 금지, 협력사 partner_type·사업자번호 중복 반영). hub-data seam 에 expert/partner 상세를 확장(현재 SimpleMaster 시드를 상세 모델로 승격), 통합 검색의 전문가/협력사 상세 링크 활성화.
*   **주의점**:
    *   실데이터 경로는 mock seam(`hub-data/service.ts`·`actions.ts`) — Docker/staging 에서 `supabase db reset`→`gen types` 후 hub 스키마 쿼리 + RPC(`create_temporary_master`/`search_master_candidates`)를 seam 에 붙인다(이슈21). mock 은 globalThis 캐시라 hub 서버 프로세스 내에서만 상태 유지(재시작 시 seed 리셋).
    *   포트 3000 stale 서버가 자주 남음 — smoke 전 `netstat -ano | grep :3000` 로 점유 프로세스 종료 필요(이전 handoff 와 동일).
    *   목록 "신규 등록"은 TEMP 임시 마스터 생성까지만(중복 후보 자동 생성은 1.8/1.10, 이슈22). 통합 검색·대시보드는 전문가/협력사를 SimpleMaster 로만 포함(상세는 1.7).

### [2026-07-03] [기기: yna_suite dev] Phase 1.5 Y&A Dev — 사용자 및 권한 관리
*   **완료**:
    *   **권한 변경 로직**(`packages/permissions/admin.ts`): 순수 함수 — `normalizePermission`(can_write→can_read 강제, global/self scope_id 정리), `validatePermissionInput`(과거 expires_at/누락 scope 대상 거부), `permissionEquals`/`diffPermissions`(감사 before/after), `isMasterLevelChange`/`isMasterRole`(확인 dialog 판정), `applyOverrides`(템플릿+override), `externalLinkGrant`(guest_startup→work company/scope_id, guest_expert→work self). 단위 테스트 17개 추가(permissions 총 29 pass).
    *   **UI 네이티브 primitive**(`packages/ui`): `Select`(네이티브 select), `Switch`(role=switch), `Table`(THead/TBody/TR/TH/TD, design_system §12 규격), `ConfirmDialog`(controlled 오버레이, Escape/포커스). 무의존(이슈20).
    *   **Dev 데이터 계층**(`apps/dev/src/lib/dev-data/`): `types.ts`, `mock-store.ts`(globalThis in-memory, seed 8명 — 내부 6·외부 2, 감사 seed), `service.ts`(server-only, 폴백=mock/설정=이슈19 오류 seam), `actions.ts`(`saveUserPermissions`/`applyTemplateToUser`/`setUserStatus`/`inviteUser`/`linkExternalUser` — 검증·안전장치·감사·revalidate), `templates.ts`(8종 표시), `display.ts`(라벨/마스킹/날짜).
    *   **화면 6종**(`apps/dev/src/app/(app)/`): `/users`(목록·필터·초대·마스킹), `/users/[id]`(상세·권한편집기·템플릿적용·상태변경·이력), `/permission-matrix`(사용자×도메인 배지), `/permission-templates`(템플릿 기준 권한), `/external-links`(외부 연결 변경), `/permission-audit-logs`(감사 조회). 컴포넌트는 `components/users/*`(UsersTable/InviteDialog/UserDetail/PermissionEditor/DomainPermissionRow/ReasonActionDialog/ExternalLinksTable/AuditLogsTable). 대시보드 위젯 실제(mock) 집계 연결.
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 permissions 29 + master-data 2 등 pass, `pnpm build`(hub/dev) 2/2. **dev 프로덕션 실행 후 6개 라우트 + 대시보드 HTTP 200**, mock 렌더 확인(사용자 8명·활성 6·만료예정 1·외부 2, 매트릭스 배지, 상세 편집기/이력).
    *   **미검증(이슈19 연장)**: Docker 미설치로 실제 auth.users/dev.user_permissions 조회·초대(Admin API)·RLS 적용·claim 갱신은 미검증. 데이터 seam 은 env 설정 시 명시적 오류로 막아둠.
*   **다음 작업**: **Phase 1.6 Y&A Hub — 스타트업 마스터** — Hub 대시보드, 통합 검색, 스타트업 마스터 목록/상세·수정(field_history·audit·마스킹). (Hub 앱에 동일 네이티브 primitive 재사용, 마스터 데이터 계층 신설)
*   **주의점**:
    *   실데이터 경로는 mock seam(`dev-data/service.ts`·`actions.ts`) — Docker/staging 에서 `supabase db reset`→`gen types` 후 auth.users 조인 + Admin API 초대를 이 seam 에 붙인다(이슈19). mock 은 globalThis 캐시라 dev 서버 프로세스 내에서만 상태 유지(재시작 시 seed 로 리셋).
    *   포트 3001 stale 서버가 자주 남음 — smoke 전 `Get-NetTCPConnection -LocalPort 3001` 로 점유 프로세스 종료 필요(이전 handoff 와 동일).
    *   권한 편집기 만료일은 `datetime-local`(로컬 시각) → 저장 시 ISO 로 변환. 실제 tz 정밀도는 실데이터 연결 시 재확인.

### [2026-07-03] [기기: yna_suite dev] Phase 1.4 인증 및 권한 기반
*   **완료**:
    *   **권한 모델 확장**(`packages/permissions`): `scope.ts`(scopeTypeOf/scopeIdOf/hasGlobalScope), `templates.ts`(`ROLE_TEMPLATE_MATRIX` 8역할×7도메인 + `ROLE_DEFAULT_SCOPE` + `templatePermissions`). scope/templates 단위 테스트 8개 추가(총 12 pass).
    *   **RLS helper**(`20260703180001`): `dev.can_read_domain/can_write_domain/get_scope_type/get_scope_id/has_role/is_master/can_merge_master`. auth.jwt() No-Join 파싱 + `expires_at<=now()` 즉시 차단, authenticated/anon EXECUTE + `USAGE ON SCHEMA dev`.
    *   **Custom Access Token Hook**(`20260703180002`): `dev.custom_access_token_hook`가 `dev.user_permissions`→`app_metadata.permissions`(read/write/scope/expires_at)+`roles` 주입. `supabase_auth_admin` 권한/전용 SELECT 정책, 일반 역할 EXECUTE REVOKE. `config.toml [auth.hook.custom_access_token]` 등록.
    *   **RLS 정책**(`20260703180003`): hub 마스터(startups/experts/partners/managers)·부속(aliases/identifiers/field_history)·병합(candidates/events)·공통(audit_logs/attachments) + dev(user_permissions/permission_templates/permission_audit_logs) read/write 분리 명시 허용(35 stmts). 물리 삭제 금지(DELETE 정책 없음), audit/권한 INSERT 는 service_role 전용.
    *   **템플릿 seed**(`20260703180004`): 시스템 기본 8종(master…viewer) `permissions` JSONB(매트릭스와 동일), ON CONFLICT 멱등.
    *   **앱 인증 배선**(hub·dev 동일): `lib/auth/`(env·server·middleware·session·dev-session·permission-context), `middleware.ts`(세션 갱신+게이트), `login`(server action + form), `auth/callback`·`auth/signout` route, `(app)` 라우트 그룹으로 대시보드 이동+서버 세션 주입. `demo-session.ts` 제거. AppShell 에 `userMenuExtra`(로그아웃 폼) 슬롯 추가.
    *   **config/env**: `NEXT_PUBLIC_COOKIE_DOMAIN`(서브도메인 SSO) 옵션 + `parsePublicEnvSafe`, `@yna/database` client 에 `cookieDomain` 전달, `.env.example`(root/hub/dev)·config.toml redirect allowlist 갱신.
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 12 pass(permissions 12 + master-data 2 등), `pnpm build`(hub/dev) 2/2. SQL 오프라인 파서(pg-query-emscripten) **신규 4파일 59 stmts + 전체 145 stmts ALL_PASS**. hub 프로덕션 실행 후 dev 폴백 세션에서 `GET /` HTTP 200(대시보드/서비스 전환/로그아웃 렌더), `GET /login` 200(폴백 안내).
    *   **미검증(이슈15·18)**: Docker 미설치로 실제 로그인 왕복, RLS 정책 적용, hook claim 주입, `gen types` 미실행.
*   **다음 작업**: **Phase 1.5 Y&A Dev — 사용자 및 권한 관리** — 사용자 목록/상세, 초대/생성(Auth 계정+권한 원자적), 도메인별 권한 관리(템플릿+override), 권한 매트릭스, 안전장치+감사 로그, 외부 사용자 연결. (인터랙티브 컴포넌트 Dialog/Select/DataTable 등 Radix/TanStack 승인 후 추가 시점)
*   **주의점**:
    *   dev 폴백 세션은 master 권한이라 로컬에서 모든 서비스 스위처가 보임(의도된 배선 검증). 실제 권한 제한은 Supabase 연결+테스트 계정에서 확인.
    *   페이지 이동으로 stale `.next/types` 발생 시 `rm -rf apps/*/.next && pnpm build`로 라우트 타입 재생성 후 typecheck.
    *   Docker/staging 환경에서 `supabase db reset`→`supabase gen types typescript --local > packages/database/src/types.ts` 후 RLS 테스트 계정 10종으로 정책 검증 필요.
    *   `custom_access_token_hook` 은 Supabase 대시보드(Auth Hooks)에서도 활성화해야 원격에 반영됨(config.toml 은 로컬 기준).

### [2026-07-03] [기기: yna_suite dev] Phase 1.3 Supabase 스키마 및 마이그레이션 기반
*   **완료**:
    *   **논리 스키마**(`supabase/migrations/20260703171001_create_schemas_and_helpers.sql`): `hub/dev/staging` 우선 + `work/mna/project/fund/management` 스키마 뼈대(테이블 없음). 공통 `dev.set_updated_at()` 트리거 함수 등록.
    *   **hub 마스터 원장**(`171002`): `startups`/`experts`/`partners`/`managers`. master_code UNIQUE, normalized_name·status 인덱스, `startups.business_number` 부분 unique, `partners.business_number` 부분 인덱스, `managers.user_id` UNIQUE(auth.users 1:1). updated_at 트리거 4개.
    *   **hub 마스터 부속**(`171003`): `master_aliases`/`master_identifiers`/`master_field_history`. `master_identifiers` (entity_type,identifier_type,normalized_value) 중복 방지 unique + (entity_type,entity_id)·normalized 인덱스. 다형 참조라 entity_id 는 FK 없이 인덱스만.
    *   **hub 병합**(`171004`): `merge_candidates`(entity_type/status·source·target 인덱스)/`merge_events`(sync_status 워커 폴링 인덱스, before/after_snapshot NOT NULL).
    *   **hub 공통**(`171005`): `audit_logs`(domain/entity·actor·created_at 인덱스)/`attachments`(domain/entity 인덱스, 본체는 Storage).
    *   **dev 권한**(`171006`): `user_permissions`(PK user_id+domain_name, updated_at 트리거)/`permission_templates`(role_key PK, 선포함)/`permission_audit_logs`(target·actor·created_at 인덱스).
    *   **RLS 기본 deny**(`171007`): hub/dev 14개 테이블 `ENABLE ROW LEVEL SECURITY`(정책 없음 = 기본 차단, service_role 만 통과). 실제 정책은 Phase 1.4.
    *   `packages/database/src/types.ts` 주석 갱신(gen types 는 DB 필요 → 미실행 사유 명시).
*   **현재 상태**:
    *   SQL 문법을 실제 Postgres 파서(libpg_query WASM, `pg-query-emscripten`)로 오프라인 검증 → 7개 파일 **82 statements ALL_PASS**. `pnpm typecheck` 10/10 통과.
    *   **미검증**: Docker 미설치로 `supabase db reset`(로컬 적용)·`supabase gen types` 미실행. FK 대상(`auth.users`) 존재/의미 검증은 실제 적용 시 확인 필요.
*   **다음 작업**: **Phase 1.4 인증 및 권한 기반** — Supabase Auth 로그인 연동, `packages/permissions` 권한 helper, JWT `app_metadata.permissions`(+expires_at) No-Join 주입, RLS helper(`dev.can_read_domain`/`can_write_domain`)·기본 RLS 정책, UI 권한 처리(demo-session → 실제 JWT 교체).
*   **주의점**:
    *   RLS 를 1.3에서 default deny 로 켰으므로, 1.4에서 명시 허용 정책을 붙이기 전까지 authenticated 경로로는 hub/dev 테이블 조회가 막힘(의도된 동작, 이슈12).
    *   `dev.permission_templates` 초기 템플릿 8종(master/executive/…/viewer) seed 는 1.4/1.5에서 별도 처리.
    *   Docker 있는 기기/staging 링크에서 `supabase db reset` → `supabase gen types typescript --local > packages/database/src/types.ts` 로 타입 대체 필요(이슈15).
    *   기존 `20260703063409_remote_schema.sql`(빈 파일, remote baseline)은 신규 migration 보다 앞서 실행되며 내용 없음.

### [2026-07-03] [기기: yna_suite dev] Phase 1.2 공통 디자인 시스템 · UI · AppShell
*   **완료**:
    *   **디자인 토큰**(`packages/ui/src/tokens/`): `colors`(red 25~900 / gray 0~900 / semantic success·warning·info), `typography`(Pretendard 스택 + 7단계 타입 스케일), `spacing`(4px grid + 규격 상수), `radius`(sm4/md6/lg8), `shadows`(dropdown/popover/dialog). `tailwind-preset.ts`를 토큰 기반으로 재작성 → 앱에서 `bg-brand`/`text-gray-700` 등으로 사용. `bg-brand` = `rgb(226 34 19)`(#E22213) 컴파일 확인.
    *   **프레젠테이션 공통 컴포넌트**(`packages/ui/src/components/`): Button(primary/secondary/outline/ghost/danger, sm/md/lg), IconButton(aria-label 강제), Input, Textarea, FormField, StatusBadge(semantic tone), PermissionBadge(write/read/none/expired), MasterCodeBadge, PageHeader, EmptyState, FilterBar, BulkActionBar. 기존 flat `button.tsx`는 `components/`로 이동.
    *   **AppShell**(`components/app-shell/`): Sidebar(240px, active indicator만 brand) + Topbar(56px, native `<details>` 서비스 스위처·사용자 메뉴) + Content, 모바일 drawer(AppShell `"use client"` + useState). `linkComponent` 주입 지점으로 next 비의존 유지. 권한 필터 결과(sections/services)는 앱이 주입.
    *   **공통 상태 화면**(`components/states/`): StateMessage 기반 NoPermission/SessionExpired/SystemError/NotFound + ReadOnlyBanner.
    *   **Hub/Dev 배선**: 각 앱 `lib/nav.ts`(IA §4·§5 메뉴), `lib/services.ts`(`accessibleDomains`로 접근 가능 서비스만 스위처 노출), `lib/demo-session.ts`(임시 세션·권한 — Phase 1.4에서 실제 JWT로 교체), `components/app-frame.tsx`(`usePathname`+next/link 주입, hub/dev read 없으면 NoPermissionScreen). 각 앱 `app/not-found.tsx`·`error.tsx` 추가. layout 에서 AppFrame 으로 children 래핑, page 를 대시보드 자리표시자로 교체. globals.css 에 Pretendard CDN @import + body base(gray-25/gray-700/tnum).
    *   **의존성**: `lucide-react`(이미 `@yna/ui`에 존재)를 hub/dev `package.json`에 선언(신규 외부 패키지 아님, lockfile 변화 없음).
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 pass, `pnpm build`(hub/dev) 2/2 성공. hub 프로덕션 실행 후 `curl localhost:3000` **HTTP 200 + AppShell(사이드바 메뉴/서비스 스위처/사용자/모바일 메뉴 버튼) 렌더 확인**, 빌드 CSS 에 Pretendard @import·brand/gray 토큰 포함 확인.
    *   **주의**: smoke 시 이전 세션의 stale hub 서버(PID)가 포트 3000을 점유해 옛 빌드를 응답 → 종료 후 재기동해 신규 빌드 확인. 새 기기/세션에서 smoke 전 포트 3000 점유 프로세스 확인 필요.
*   **다음 작업**: **Phase 1.3 Supabase 스키마 및 마이그레이션 기반** — hub/dev/staging 스키마, 우선순위 1 테이블 마이그레이션, 공통 컬럼/코드 정책, 인덱스/제약, Migration Only 원칙. (스키마 생성 후 `packages/database/src/types.ts` placeholder 를 `supabase gen types`로 대체)
*   **주의점**:
    *   인터랙티브 컴포넌트(Dialog/Sheet/ConfirmDialog/Select/SearchCombobox/DatePicker/DataTable)는 무의존 정책에 따라 미구현 — 실제 소비하는 Phase 1.5+ 에서 Radix/TanStack 승인 후 추가.
    *   세션/권한은 `demo-session.ts` 자리표시자(hub·dev write, work read, 나머지 none). 서비스 스위처가 실제로 fund/mna/project/management 를 숨기는지 이 맵으로 검증 가능. Phase 1.4에서 실제 JWT로 대체.
    *   서비스 스위처 href 는 로컬 `localhost:port` / 운영 `host` 분기 — 실제 base URL 정리는 Phase 1.4 환경 배선에서.

### [2026-07-03] [기기: yna_suite dev] Phase 1.1 모노레포 및 공통 패키지 스캐폴딩
*   **완료**:
    *   **공통 패키지 8개 생성**(`packages/*`, 모두 `@yna/*` 내부 패키지, TS 소스 직접 export):
        *   `core`(도메인/역할/스코프 상수, JWT 권한 claim 타입, Result/AppError), `utils`(회사명/사업자번호/전화/이메일/도메인 정규화 + 이메일/전화 마스킹), `config`(APP_CONFIGS 도메인 설정 + zod 공개/서버 env 스키마), `database`(Supabase browser/server client 팩토리 — cookie 어댑터 주입, next 비의존), `permissions`(canRead/canWrite/isExpired — can_write→can_read 강제·만료 즉시 차단), `auth`(Supabase User→권한 claim 추출), `master-data`(마스터 검색 계약 + 병합 점수 등급 95/80/60), `ui`(`cn`, Button, Tailwind preset).
        *   Vitest 단위 테스트: utils(정규화 4) · permissions(권한 4) · master-data(점수 2) = 10 pass.
    *   **앱 스캐폴딩**: `apps/hub`(포트 3000), `apps/dev`(포트 3001) Next.js 15 + React 19 App Router. TanStack Query Provider, Tailwind v3.4(+ ui preset), 홈 화면(공통 패키지 연결 확인용). `work/mna/project/fund/management`는 README placeholder만.
    *   **패키지 트랜스파일 방식**: 앱 `next.config.mjs`의 `transpilePackages`로 `@yna/*` 소스 직접 번들(별도 빌드 스텝 없음).
    *   **의존성 방향 lint**: 루트 `eslint.config.mjs`(flat, ESLint 9 + typescript-eslint) + `no-restricted-imports` — 앱 간 import 금지, `packages/ui`의 비즈니스/API/DB import 금지. 음성 테스트로 규칙 발화 확인.
    *   루트 devDeps에 eslint 스택 추가, `pnpm-workspace.yaml`에 빌드 스크립트 허용(esbuild/sharp), `.gitignore`에 `next-env.d.ts` 추가.
*   **현재 상태**:
    *   `pnpm typecheck` 10/10, `pnpm lint` 10/10, 단위 테스트 10 pass, `pnpm build`(hub/dev) 2/2 성공. hub 프로덕션 실행 후 `curl localhost:3000` **HTTP 200 + 공통 패키지 렌더 확인**.
    *   **주의(이슈 10)**: turbo가 pnpm 바이너리를 못 찾던 문제 → `corepack enable --install-directory "%APPDATA%\npm" pnpm`으로 shim 설치 후 turbo 정상. 새 기기에서 동일 조치 필요할 수 있음.
*   **다음 작업**: **Phase 1.2 공통 디자인 시스템 · UI · AppShell** — 디자인 토큰(그레이스케일 + CI Red) 정의, 핵심 공통 컴포넌트, 권한 기반 AppShell(Sidebar/Topbar), 공통 상태 화면. 이때 shadcn 컴포넌트·RHF·TanStack Table 등 필요한 라이브러리 추가.
*   **주의점**:
    *   미사용 의존성 금지 규칙에 따라 shadcn 컴포넌트 본체·RHF·TanStack Table·Recharts·Playwright는 아직 미설치(Phase 1.2+에서 사용 시 추가). Tailwind는 v3.4 채택.
    *   `packages/database/src/types.ts`의 `Database`는 placeholder — Phase 1.3 스키마 생성 후 `supabase gen types`로 대체.
    *   turbo test 실행 시 "no output files(coverage)" 경고는 무해(coverage 미생성).

### [2026-07-03] [기기: yna_suite dev] Phase 1.0 개발 환경 및 의존성 준비 (기반)
*   **완료**:
    *   도구 버전 고정: `.node-version`/`.nvmrc`(Node 24.16.0), 루트 `package.json`의 `packageManager: pnpm@11.9.0` + `engines`, `.editorconfig`.
    *   모노레포 루트: `package.json`, `pnpm-workspace.yaml`(`apps/*`,`packages/*`), `turbo.json`(build/dev/lint/typecheck/test/e2e), `tsconfig.base.json`(strict), `.prettierrc.json`/`.prettierignore`.
    *   루트 devDependencies 설치 + `pnpm-lock.yaml` 커밋: turbo 2.10.2, typescript 5.9.3, prettier 3.9.4, @types/node 24.13.2.
    *   환경 템플릿: 루트 `.env.example` 정비 + `apps/hub|dev|work/.env.example` 생성(NEXT_PUBLIC 공개값/서버 secret 분리).
    *   스크립트: `pnpm dev/build/lint/typecheck/test/e2e/format/format:check/db:migrate/db:reset`.
    *   온보딩 문서 `README.md`(도구 버전·빠른 시작·명령어·의존성 경계·로컬 Supabase·포트).
    *   **보안 수정**: git에 추적되던 `.env.local`(실 anon key 포함)을 `git rm --cached`로 추적 해제하고 `.gitignore`에 `.env*`/`.env.local` 등 추가.
*   **현재 상태**:
    *   `pnpm install`(Corepack 경유) 재현 성공, lockfile 생성. `pnpm lint`/`typecheck`/`format:check` 통과(앱 없어 turbo task 0개, 정상). `db:migrate`/`db:reset`는 Supabase CLI 2.105.0로 백킹.
    *   **주의**: 이 환경은 pnpm 전역 shim이 EPERM으로 설치 안 됨 → `corepack pnpm <명령>`으로 실행. Docker 미설치 → `supabase start`(로컬 DB) 미검증.
*   **다음 작업**: **Phase 1.1 모노레포 및 공통 패키지 스캐폴딩** — `apps/hub`,`apps/dev` Next.js 앱 + `packages/*` 뼈대 생성, 앱별 1차 스택(Next/React/Tailwind/shadcn/TanStack 등) 설치, 의존성 방향 lint 강제. (Phase 1.0의 "앱별 스택 설치"·"Hub/Dev 실행 smoke"는 여기서 마무리)
*   **주의점**:
    *   `apps/hub|dev|work`에는 현재 `.env.example`만 있고 `package.json`이 없어 워크스페이스에서 무시됨(정상). 1.1에서 앱 스캐폴딩.
    *   `pnpm format`은 `docs/`·`docs_jm/`를 제외(원본/진행 문서 자동 재포맷 방지) — `.prettierignore` 참고.
