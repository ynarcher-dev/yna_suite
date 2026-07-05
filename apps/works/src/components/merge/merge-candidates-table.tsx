"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmptyState,
  FilterBar,
  MasterCodeBadge,
  Select,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { candidateStrength } from "@yna/master-data";
import { ENTITY_LABEL, fmtDate, mergeStatusMeta, reasonLabel } from "@/lib/hub-data/display";
import type { EntityType } from "@yna/core";
import type { MergeCandidateListItem, MergeCandidateStatus } from "@/lib/hub-data/types";

/**
 * 중복 후보 목록 테이블. (근거: functional_spec §15, api_contracts §12)
 * entity_type·상태·최소 점수 필터, 좌(소멸)→우(잔존) 요약, 점수/사유 표시. 행 클릭 시 검토 화면.
 */
const STRENGTH_TONE = { strong: "danger", medium: "warning", weak: "neutral", none: "neutral" } as const;

export function MergeCandidatesTable({ candidates }: { candidates: MergeCandidateListItem[] }) {
  const router = useRouter();
  const [entity, setEntity] = useState<EntityType | "">("");
  const [status, setStatus] = useState<MergeCandidateStatus | "">("");
  const [minScore, setMinScore] = useState<string>("");

  const filtered = useMemo(() => {
    const min = minScore ? Number(minScore) : 0;
    return candidates.filter((c) => {
      if (entity && c.entityType !== entity) return false;
      if (status && c.status !== status) return false;
      if (c.score < min) return false;
      return true;
    });
  }, [candidates, entity, status, minScore]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar trailing={<span className="text-sm text-gray-500">{filtered.length}건</span>}>
        <Select
          value={entity}
          onChange={(e) => setEntity(e.target.value as EntityType | "")}
          className="w-32"
          aria-label="엔티티 필터"
        >
          <option value="">엔티티 전체</option>
          <option value="startup">스타트업</option>
          <option value="expert">전문가</option>
          <option value="partner">협력사</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as MergeCandidateStatus | "")}
          className="w-32"
          aria-label="상태 필터"
        >
          <option value="">상태 전체</option>
          <option value="pending">검토대기</option>
          <option value="on_hold">보류</option>
          <option value="approved">병합완료</option>
          <option value="rejected">반려</option>
          <option value="ignored">무시</option>
        </Select>
        <Select
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          className="w-32"
          aria-label="최소 점수"
        >
          <option value="">점수 전체</option>
          <option value="95">95점 이상</option>
          <option value="80">80점 이상</option>
          <option value="60">60점 이상</option>
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="중복 후보가 없습니다" description="필터를 바꾸거나, 임시 마스터 생성 시 자동으로 후보가 큐잉됩니다." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>엔티티</TH>
              <TH>소멸 예정</TH>
              <TH>잔존 마스터</TH>
              <TH>점수</TH>
              <TH className="hidden md:table-cell">매칭 사유</TH>
              <TH>상태</TH>
              <TH className="hidden sm:table-cell">생성일</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((c) => {
              const st = mergeStatusMeta(c.status);
              const strong = candidateStrength(c.score);
              return (
                <TR key={c.id} interactive onClick={() => router.push(`/merge-candidates/${c.id}`)}>
                  <TD className="text-gray-600">{ENTITY_LABEL[c.entityType]}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <MasterCodeBadge code={c.source.masterCode} />
                      <span className="truncate text-sm text-gray-800">{c.source.name}</span>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <MasterCodeBadge code={c.target.masterCode} />
                      <span className="truncate text-sm text-gray-800">{c.target.name}</span>
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge tone={STRENGTH_TONE[strong]}>{Math.round(c.score)}</StatusBadge>
                  </TD>
                  <TD className="hidden text-xs text-gray-500 md:table-cell">
                    {c.reasons.map(reasonLabel).join(", ")}
                  </TD>
                  <TD>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </TD>
                  <TD className="hidden text-gray-600 sm:table-cell">{fmtDate(c.createdAt)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
