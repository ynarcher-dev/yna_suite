"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  EmptyState,
  FilterBar,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { ENTITY_LABEL, fmtDateTime } from "@/lib/hub-data/display";
import type { EntityType } from "@yna/core";
import type { TemporaryMasterListItem } from "@/lib/hub-data/types";

/**
 * 임시 마스터 목록. (근거: functional_spec §14-1)
 * 조회 전용 — 승격/후보 처리 액션은 각 마스터 상세·중복 후보 검토 화면에서 수행한다.
 */
const DETAIL_PATH: Record<EntityType, string> = {
  startup: "/startups",
  expert: "/experts",
  partner: "/partners",
  manager: "/",
};

function detailHref(item: TemporaryMasterListItem): string {
  return `${DETAIL_PATH[item.entityType]}/${item.id}`;
}

export function TemporaryMastersTable({ items }: { items: TemporaryMasterListItem[] }) {
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState<string>("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((item) => {
      if (entity && item.entityType !== entity) return false;
      if (query) {
        const hay = `${item.masterCode} ${item.name} ${item.sourceDomain ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [items, q, entity]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar trailing={<span className="text-sm text-gray-500">{filtered.length}건</span>}>
        <Input
          placeholder="코드·이름·유입 출처 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
          aria-label="임시 마스터 검색"
        />
        <Select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="w-32"
          aria-label="엔티티 필터"
        >
          <option value="">엔티티 전체</option>
          <option value="startup">스타트업</option>
          <option value="expert">전문가</option>
          <option value="partner">협력사</option>
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          title="임시 마스터가 없습니다"
          description="도메인 유입·직접 생성·import로 만들어진 TEMP 마스터가 여기에 모입니다."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>마스터 코드</TH>
              <TH>엔티티</TH>
              <TH>이름</TH>
              <TH className="hidden md:table-cell">유입 출처</TH>
              <TH>pending 후보</TH>
              <TH className="hidden lg:table-cell">생성 시각</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((item) => (
              <TR key={`${item.entityType}-${item.id}`}>
                <TD>
                  <Link
                    href={detailHref(item)}
                    className="font-mono text-sm text-gray-800 underline-offset-2 hover:underline"
                  >
                    {item.masterCode}
                  </Link>
                </TD>
                <TD className="text-gray-600">{ENTITY_LABEL[item.entityType]}</TD>
                <TD>
                  <Link href={detailHref(item)} className="text-gray-800 hover:underline">
                    {item.name}
                  </Link>
                </TD>
                <TD className="hidden text-gray-600 md:table-cell">
                  {item.sourceDomain ?? "—"}
                </TD>
                <TD>
                  {item.pendingCandidateCount > 0 ? (
                    <Link
                      href="/merge-candidates"
                      className="text-sm font-medium text-gray-800 underline-offset-2 hover:underline"
                    >
                      {item.pendingCandidateCount}건
                    </Link>
                  ) : (
                    <span className="text-gray-400">0건</span>
                  )}
                </TD>
                <TD className="hidden whitespace-nowrap text-gray-600 lg:table-cell">
                  {fmtDateTime(item.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
