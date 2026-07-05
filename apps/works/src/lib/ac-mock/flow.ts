import "server-only";
import {
  approveMerge,
  createTemporaryMaster,
  listMergeCandidates,
  searchMasterCandidates,
} from "../hub-data/service";
import { store as hubStore } from "../hub-data/mock-store";
import {
  createActivity,
  createApplication,
  createMeetingMinutes,
  createModule,
  createProgram,
  getApplication,
  nextRunSeq,
  setLastFlow,
} from "./mock-store";
import type { FlowResult, FlowStep } from "./types";

/**
 * Work 연결 Mock/Test Flow — 핵심 연결 시나리오 자동 검증(Phase 1.13).
 * (근거: yna_suite_api_contracts.md §19, yna_suite_phase1_scope.md §11,
 *  yna_suite_existing_source_alignment.md §7)
 *
 * 검증 목적: Work 가 Hub 마스터를 직접 수정하지 않고, 새 대상은 임시 마스터·병합 후보 흐름을 타며,
 * 병합 후 신청 이력이 resolved view/helper 로 최종 마스터에 귀속되는지(2단계 비동기 반영, §10.3).
 * production 에서는 비활성화된다(호출부 guard).
 */

interface FlowCtx {
  actorName: string;
  bizNumber: string;
  runSeq: number;
  programId: string;
  moduleId: string | null;
  masterAId: string;
  masterBId: string;
  app1Id: string;
  app2Id: string;
  candidateId: string;
  activityId: string | null;
}

interface StepDef {
  label: string;
  /** 성공 시 상세 메시지 반환, 실패 시 Error throw. */
  run: (ctx: FlowCtx) => Promise<string> | string;
}

/** work 권한 사용자가 프로그램/모듈을 만든다(신청이 붙을 그릇). */
function setupSteps(hasWorkWrite: boolean): StepDef[] {
  return [
    {
      label: "work 권한 사용자 확인",
      run: (ctx) => {
        if (!hasWorkWrite) throw new Error("work 도메인 쓰기 권한이 없습니다.");
        return `${ctx.actorName} (work write)`;
      },
    },
    {
      label: "Mock Work 프로그램 생성",
      run: (ctx) => {
        const p = createProgram(
          { name: `2026 연결테스트 프로그램 #${ctx.runSeq}`, startDate: "2026-07-01", endDate: "2026-12-31" },
          ctx.actorName,
        );
        ctx.programId = p.id;
        return `program=${p.id}`;
      },
    },
    {
      label: "Mock Work 모듈 생성(recruitment)",
      run: (ctx) => {
        const m = createModule(ctx.programId, { moduleType: "recruitment", name: "모집" });
        ctx.moduleId = m.id;
        return `module=${m.id}`;
      },
    },
  ];
}

/** Hub 기존 스타트업을 검색해 신청에 연결한다(Hub 마스터 직접 수정 없음). */
function connectSteps(): StepDef[] {
  return [
    {
      label: "Hub 기존 스타트업 마스터 준비",
      run: async (ctx) => {
        const created = await createTemporaryMaster(
          "startup",
          {
            name: `연결테스트 스타트업 ${ctx.runSeq}`,
            businessNumber: ctx.bizNumber,
            representativeName: "김대표",
            sourceDomain: "work",
            sourceRecordId: `flow-${ctx.runSeq}-A`,
          },
          ctx.actorName,
        );
        ctx.masterAId = created.id;
        return `master A=${created.masterCode}(${created.id})`;
      },
    },
    {
      label: "기존 스타트업 검색 후 신청 연결",
      run: async (ctx) => {
        const hits = await searchMasterCandidates({
          entityType: "startup",
          q: "연결테스트",
          limit: 20,
          includeMerged: false,
        });
        const found = hits.find((h) => h.id === ctx.masterAId);
        if (!found) throw new Error("검색 결과에서 기존 마스터를 찾지 못했습니다.");
        const app = createApplication({
          programId: ctx.programId,
          moduleId: ctx.moduleId,
          startupId: ctx.masterAId,
          applicantName: `${found.displayLabel} 신청`,
        });
        ctx.app1Id = app.id;
        return `application1=${app.id} → ${ctx.masterAId} (검색 hit ${hits.length}건)`;
      },
    },
  ];
}

/** 다른 신청에서 유사 신규 임시 마스터를 만들어 병합 후보를 유발한다. */
function candidateSteps(): StepDef[] {
  return [
    {
      label: "유사 신규 스타트업 임시 생성",
      run: async (ctx) => {
        const created = await createTemporaryMaster(
          "startup",
          {
            name: `연결테스트 스타트업 ${ctx.runSeq} (신규)`,
            businessNumber: ctx.bizNumber,
            representativeName: "김대표",
            sourceDomain: "work",
            sourceRecordId: `flow-${ctx.runSeq}-B`,
          },
          ctx.actorName,
        );
        ctx.masterBId = created.id;
        if (created.mergeCandidateCount < 1) throw new Error("중복 후보가 생성되지 않았습니다.");
        const app = createApplication({
          programId: ctx.programId,
          moduleId: ctx.moduleId,
          startupId: created.id,
          applicantName: "유사 신규 신청",
        });
        ctx.app2Id = app.id;
        return `master B=${created.masterCode}(${created.id}) 후보 ${created.mergeCandidateCount}건, application2=${app.id}`;
      },
    },
    {
      label: "merge_candidates 확인",
      run: async (ctx) => {
        const cands = await listMergeCandidates({ entityType: "startup", status: "pending" });
        const c = cands.find((x) => x.source.id === ctx.masterBId && x.target.id === ctx.masterAId);
        if (!c) throw new Error("B→A 병합 후보를 찾지 못했습니다.");
        ctx.candidateId = c.id;
        return `candidate=${c.id} score=${c.score} [${c.reasons.join(",")}]`;
      },
    },
  ];
}

/** 병합 승인 후 신청 FK 가 최종 마스터로 resolve 되는지 확인한다(§10.3). */
function approveSteps(): StepDef[] {
  return [
    {
      label: "Hub 관리자 병합 승인",
      run: async (ctx) => {
        const r = await approveMerge(
          ctx.candidateId,
          { reason: "연결 테스트 자동 병합" },
          ctx.actorName,
        );
        if (!r.ok) throw new Error(r.error ?? "병합 승인 실패");
        return `target=${r.targetId} event=${r.eventId} sync=${r.syncStatus}`;
      },
    },
    {
      label: "신청 FK 가 최종 마스터로 이동 확인",
      run: (ctx) => {
        const view = getApplication(ctx.app2Id);
        if (!view) throw new Error("신청을 찾을 수 없습니다.");
        if (view.startupId !== ctx.masterBId) throw new Error("연결 id 가 변조되었습니다(직접 수정 금지 위반).");
        if (!view.merged || view.resolvedStartupId !== ctx.masterAId) {
          throw new Error(`resolve 불일치: resolved=${view.resolvedStartupId}`);
        }
        return `연결 id=${view.startupId} 보존 · resolved=${view.resolvedStartupId}(${view.resolvedMasterCode})`;
      },
    },
  ];
}

/** custom activity·회의록·첨부를 연결하고 원장(merge_events/audit)을 확인한다. */
function recordSteps(): StepDef[] {
  return [
    {
      label: "Mock Work custom activity 생성",
      run: (ctx) => {
        const a = createActivity({
          programId: ctx.programId,
          moduleId: ctx.moduleId,
          activityType: "custom_event",
          title: "IR 리허설",
          startsAt: "2026-07-10T10:00:00+09:00",
        });
        ctx.activityId = a.id;
        return `activity=${a.id}`;
      },
    },
    {
      label: "회의록·첨부파일 연결 확인",
      run: (ctx) => {
        const mm = createMeetingMinutes({
          programId: ctx.programId,
          moduleId: ctx.moduleId,
          activityId: ctx.activityId,
          title: "선정위원 사전회의",
          agenda: "평가 기준 확인",
          discussion: "운영 방식과 평가표 적용 기준을 논의함",
          decisions: "동점자는 사업화 가능성 항목을 우선 적용함",
          attachmentIds: [`att-${ctx.runSeq}`],
        });
        return `minutes=${mm.id} attachments=${mm.attachmentIds.length} activity=${mm.activityId}`;
      },
    },
    {
      label: "merge_events / audit_logs 기록 확인",
      run: (ctx) => {
        const s = hubStore();
        const event = s.mergeEvents.find((e) => e.targetId === ctx.masterAId && e.sourceId === ctx.masterBId);
        if (!event) throw new Error("merge_event 가 기록되지 않았습니다.");
        const audits = s.audit.filter((au) => au.action === "merge" && au.entityId === ctx.masterBId);
        if (audits.length === 0) throw new Error("병합 audit 이 기록되지 않았습니다.");
        return `merge_event=${event.id}(sync=${event.syncStatus}) · audit ${audits.length}건`;
      },
    },
  ];
}

/**
 * 13단계 연결 시나리오를 실행하고 단계별 결과를 반환한다.
 * 어떤 단계가 실패하면 그 지점에서 멈추고 이후 단계는 건너뛴다.
 */
export async function runWorkConnectionFlow(
  actorName: string,
  hasWorkWrite: boolean,
): Promise<FlowResult> {
  const ctx: FlowCtx = {
    actorName,
    runSeq: nextRunSeq(),
    bizNumber: "",
    programId: "",
    moduleId: null,
    masterAId: "",
    masterBId: "",
    app1Id: "",
    app2Id: "",
    candidateId: "",
    activityId: null,
  };
  ctx.bizNumber = `9${String(ctx.runSeq).padStart(9, "0")}`;

  const defs: StepDef[] = [
    ...setupSteps(hasWorkWrite),
    ...connectSteps(),
    ...candidateSteps(),
    ...approveSteps(),
    ...recordSteps(),
  ];

  const steps: FlowStep[] = [];
  let ok = true;
  let seq = 0;
  for (const def of defs) {
    seq += 1;
    if (!ok) {
      steps.push({ seq, label: def.label, ok: false, detail: "이전 단계 실패로 건너뜀" });
      continue;
    }
    try {
      const detail = await def.run(ctx);
      steps.push({ seq, label: def.label, ok: true, detail });
    } catch (err) {
      ok = false;
      steps.push({
        seq,
        label: def.label,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const result: FlowResult = { ok, ranAt: new Date().toISOString(), actorName, steps };
  setLastFlow(result);
  return result;
}
