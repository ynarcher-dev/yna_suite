"use server";

import {
  runRemoveAlias,
  runRemoveIdentifier,
  runRevealIdentifier,
  runSetPrimary,
  runVerifyIdentifier,
} from "./action-helpers";
import type { ActionResult, IdentifierVerifiedStatus } from "./types";

/**
 * 식별자/별칭 관리 서버 액션(엔티티 공용 — id 로 소유 마스터를 역참조).
 * (근거: yna_suite_master_data_policy.md §5~6, yna_suite_api_contracts.md §10~11)
 *
 * primary 전환은 트랜잭션(같은 유형의 기존 대표 해제 포함), 원본 조회는 audit 를 남긴다.
 * 스타트업/전문가/협력사 상세가 이 공용 액션을 공유한다. dev 폴백은 mock 스토어를 갱신한다(이슈21).
 */

export async function setIdentifierPrimaryAction(args: {
  identifierId: string;
  reason: string;
}): Promise<ActionResult> {
  return runSetPrimary(args.identifierId, args.reason);
}

export async function verifyIdentifierAction(args: {
  identifierId: string;
  verifiedStatus: IdentifierVerifiedStatus;
  reason: string;
}): Promise<ActionResult> {
  return runVerifyIdentifier(args.identifierId, args.verifiedStatus, args.reason);
}

export async function removeIdentifierAction(args: {
  identifierId: string;
  reason: string;
}): Promise<ActionResult> {
  return runRemoveIdentifier(args.identifierId, args.reason);
}

export async function removeAliasAction(args: {
  aliasId: string;
  reason: string;
}): Promise<ActionResult> {
  return runRemoveAlias(args.aliasId, args.reason);
}

export async function revealIdentifierAction(args: {
  identifierId: string;
}): Promise<ActionResult> {
  return runRevealIdentifier(args.identifierId);
}
