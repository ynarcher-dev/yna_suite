// Work 연결 Mock/Test Flow — HTTP 계약 자동 검증(Phase 1.13).
// (근거: yna_suite_api_contracts.md §19, yna_suite_phase1_scope.md §11)
//
// 실행 중인 Hub 서버(dev 폴백 세션)에 대해 Mock Work API + Hub 마스터/병합 API 를 순서대로 호출하며
// 도메인 연결 계약을 검증한다. 핵심 확인점: 병합 후 Mock 신청 FK 가 최종 마스터로 resolve 되는지.
//
// 사용: node scripts/mock-domain/work-application-flow.mjs [baseUrl]
//   기본 baseUrl = http://localhost:3000 (BASE_URL env 로도 지정 가능)
// Mock API 는 production 에서 비활성화되므로 staging/dev 서버에서만 통과한다.

const BASE = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";

let step = 0;
function log(msg) {
  console.log(msg);
}
function pass(label, detail) {
  step += 1;
  log(`  [${String(step).padStart(2, "0")}] OK   ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(label, detail) {
  step += 1;
  log(`  [${String(step).padStart(2, "0")}] FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  throw new Error(`${label}: ${detail}`);
}
function assert(cond, label, detail) {
  if (cond) pass(label, detail);
  else fail(label, detail);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!json || json.ok !== true) {
    const code = json?.error?.code ?? res.status;
    const message = json?.error?.message ?? "(no body)";
    throw new Error(`${method} ${path} → ${code}: ${message}`);
  }
  return json.data;
}

async function main() {
  log(`Work 연결 Mock/Test Flow @ ${BASE}`);
  const bizNumber = `9${String(Date.now() % 1_000_000_000).padStart(9, "0")}`;
  const tag = `${Date.now()}`;

  // 2~3. Program First 그릇 생성(work 권한 필요 — dev 폴백 세션은 master 권한).
  const program = await req("POST", "/api/mock/work/programs", {
    name: `2026 연결테스트 프로그램 ${tag}`,
    start_date: "2026-07-01",
    end_date: "2026-12-31",
  });
  assert(Boolean(program.id), "Mock Work 프로그램 생성", `program=${program.id}`);

  const mod = await req("POST", `/api/mock/work/programs/${program.id}/modules`, {
    module_type: "recruitment",
    name: "모집",
  });
  assert(mod.program_id === program.id, "Mock Work 모듈 생성", `module=${mod.id}`);

  // 4. Hub 기존 스타트업 마스터 준비.
  const masterA = await req("POST", "/api/hub/masters/startup/temporary", {
    name: `연결테스트 스타트업 ${tag}`,
    business_number: bizNumber,
    representative_name: "김대표",
    source_domain: "work",
    source_record_id: `flow-${tag}-A`,
  });
  assert(Boolean(masterA.id), "Hub 기존 스타트업 준비", `A=${masterA.master_code}(${masterA.id})`);

  // 5~6. 검색 후 신청 연결.
  const hits = await req(
    "GET",
    `/api/hub/master-search?entity_type=startup&q=${encodeURIComponent("연결테스트")}&limit=20`,
  );
  const found = (hits.items ?? []).find((h) => h.id === masterA.id);
  assert(Boolean(found), "기존 스타트업 검색", `hit A=${masterA.id}`);

  const app1 = await req("POST", "/api/mock/work/applications", {
    program_id: program.id,
    module_id: mod.id,
    startup_id: masterA.id,
    applicant_name: "기존 연결 신청",
  });
  assert(app1.startup_id === masterA.id, "신청1 → 기존 마스터 연결", `application1=${app1.id}`);

  // 7~8. 유사 신규 임시 마스터 + 신청2.
  const masterB = await req("POST", "/api/hub/masters/startup/temporary", {
    name: `연결테스트 스타트업 ${tag} (신규)`,
    business_number: bizNumber,
    representative_name: "김대표",
    source_domain: "work",
    source_record_id: `flow-${tag}-B`,
  });
  assert(
    masterB.merge_candidate_count >= 1,
    "유사 신규 임시 마스터(중복 후보 유발)",
    `B=${masterB.master_code} 후보 ${masterB.merge_candidate_count}건`,
  );

  const app2 = await req("POST", "/api/mock/work/applications", {
    program_id: program.id,
    module_id: mod.id,
    startup_id: masterB.id,
    applicant_name: "유사 신규 신청",
  });
  assert(app2.startup_id === masterB.id, "신청2 → 신규 임시 마스터 연결", `application2=${app2.id}`);

  // 9. merge_candidates 확인.
  const cands = await req(
    "GET",
    "/api/hub/merge-candidates?entity_type=startup&status=pending",
  );
  const candList = Array.isArray(cands) ? cands : (cands.items ?? []);
  const candidate = candList.find(
    (c) => c.source_entity.id === masterB.id && c.target_entity.id === masterA.id,
  );
  assert(Boolean(candidate), "merge_candidates 생성", `candidate=${candidate?.id} score=${candidate?.score}`);

  // 10. 병합 승인.
  const approved = await req("POST", `/api/hub/merge-candidates/${candidate.id}/approve`, {
    reason: "연결 테스트 자동 병합",
  });
  assert(
    approved.target_entity_id === masterA.id,
    "Hub 병합 승인",
    `event=${approved.event_id} sync=${approved.sync_status}`,
  );

  // 11. 신청 FK 가 최종 마스터로 resolve 되는지(핵심 확인점).
  const view = await req("GET", `/api/mock/work/applications/${app2.id}`);
  assert(view.startup_id === masterB.id, "연결 id 보존(직접 수정 없음)", `startup_id=${view.startup_id}`);
  assert(
    view.merged === true && view.resolved_startup_id === masterA.id,
    "신청 FK → 최종 마스터 resolve",
    `resolved=${view.resolved_startup_id}(${view.resolved_master_code})`,
  );

  // 12~13. custom activity + 회의록/첨부.
  const activity = await req("POST", "/api/mock/work/activities", {
    program_id: program.id,
    module_id: mod.id,
    activity_type: "custom_event",
    title: "IR 리허설",
    starts_at: "2026-07-10T10:00:00+09:00",
  });
  assert(activity.activity_type === "custom_event", "Mock Work custom activity 생성", `activity=${activity.id}`);

  const minutes = await req("POST", "/api/mock/work/meeting-minutes", {
    program_id: program.id,
    module_id: mod.id,
    activity_id: activity.id,
    title: "선정위원 사전회의",
    agenda: "평가 기준 확인",
    discussion: "운영 방식과 평가표 적용 기준을 논의함",
    decisions: "동점자는 사업화 가능성 항목을 우선 적용함",
    attachment_ids: [`att-${tag}`],
  });
  assert(
    minutes.activity_id === activity.id && minutes.attachment_ids.length === 1,
    "회의록·첨부파일 연결",
    `minutes=${minutes.id}`,
  );

  // 병합 후보 상태가 approved 로 확정되었는지(merge_event/audit 은 승인 응답으로 확인).
  const candDetail = await req("GET", `/api/hub/merge-candidates/${candidate.id}`);
  assert(candDetail.status === "approved", "병합 후보 상태 확정", `status=${candDetail.status}`);

  log(`\n✔ 전체 통과 (${step} steps) — Work 연결 계약 검증 완료`);
}

main().catch((err) => {
  log(`\n✗ 실패: ${err.message}`);
  process.exit(1);
});
