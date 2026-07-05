"use server";

import { revalidatePath } from "next/cache";
import { actorName, guardConfigured } from "./action-helpers";
import { dryRunImport, rollbackImport, runImport } from "./service";
import type { ImportDryRunReport, ImportRunInput, ImportRunResult } from "./types";

/**
 * 기존 스타트업 DB 이관 서버 액션(Hub Import Batch 화면 전용).
 * (근거: yna_suite_migration_strategy.md, functional_spec §14)
 *
 * dry-run 은 운영에 반영하지 않고 판정 결과만 계산한다. run 은 dry-run 통과 후 실제 이관한다(§16).
 * rollback 은 batch 단위로 새로 만든 마스터를 비활성화한다(§15). hub write 권한이 필요하다.
 */

function revalidateImport(): void {
  revalidatePath("/");
  revalidatePath("/import-batches");
  revalidatePath("/startups");
  revalidatePath("/merge-candidates");
}

/** dry-run 미리보기(운영 미반영). 실패 시 null 을 반환한다. */
export async function dryRunImportAction(input: ImportRunInput): Promise<ImportDryRunReport | null> {
  if (guardConfigured()) return null;
  if (!input.rows.length) return null;
  return dryRunImport(input);
}

export async function runImportAction(input: ImportRunInput): Promise<ImportRunResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!input.rows.length) return { ok: false, error: "이관할 row 가 없습니다." };
  const res = await runImport(input, await actorName());
  if (res.ok) revalidateImport();
  return res;
}

export async function rollbackImportAction(id: string): Promise<ImportRunResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const res = await rollbackImport(id, await actorName());
  if (res.ok) {
    revalidateImport();
    revalidatePath(`/import-batches/${id}`);
  }
  return res;
}
