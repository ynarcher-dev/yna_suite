"use server";

import { revalidatePath } from "next/cache";
import { canWrite } from "@yna/permissions";
import { getSession } from "@/lib/auth/session";
import { publicEnv } from "@/lib/auth/env";
import { runWorkConnectionFlow } from "@/lib/work-mock/flow";

/**
 * 도메인 연결 테스트 실행(Phase 1.13). (근거: phase1_scope §11, api_contracts §19)
 * Work 연결 계약(Hub 마스터 참조·임시 마스터·병합·resolved view)이 실제로 작동하는지 검증한다.
 * production 에서는 비활성화한다.
 */
export async function runFlowAction(): Promise<{ ok: boolean; error?: string }> {
  if (publicEnv?.NEXT_PUBLIC_APP_ENV === "production") {
    return { ok: false, error: "도메인 연결 테스트는 production 에서 비활성화됩니다." };
  }
  const session = await getSession();
  if (!session) return { ok: false, error: "세션이 필요합니다." };
  const hasWork = canWrite(session.user.permissions, "work");
  const result = await runWorkConnectionFlow(session.shellUser.name, hasWork);
  revalidatePath("/domain-test");
  return { ok: result.ok };
}
