"use client";

import { useEffect, useRef, useState } from "react";
import { MasterCodeBadge, StatusBadge } from "@yna/ui";
import { verificationMeta } from "@/lib/hub-data/display";
import type { EntityType } from "@yna/core";
import type { VerificationStatus } from "@/lib/hub-data/types";

/**
 * 마스터 자동완성 Picker. (근거: api_contracts §6, master_data_policy §16 로컬 입력 UX)
 * 입력값으로 `GET /api/hub/master-search` 를 디바운스 호출해 기존 마스터를 먼저 보여준다.
 * 선택 시 onSelect(FK 연계/중복 방지). 결과가 없으면 신규 임시 생성으로 진행한다.
 */

export interface SearchApiItem {
  id: string;
  entity_type: EntityType;
  master_code: string;
  name: string;
  display_label: string;
  verification_status: VerificationStatus;
  status: string;
  matched_fields: string[];
  score: number;
}

export function MasterSearchPicker({
  entityType,
  query,
  onSelect,
}: {
  entityType: Exclude<EntityType, "manager">;
  query: string;
  onSelect: (item: SearchApiItem) => void;
}) {
  const [items, setItems] = useState<SearchApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/hub/master-search?entity_type=${entityType}&q=${encodeURIComponent(q)}&limit=5`,
        );
        const json = await res.json();
        setItems(json.ok ? (json.data.items as SearchApiItem[]) : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [entityType, query]);

  if (query.trim().length < 2) return null;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-25 p-2">
      <p className="px-1 pb-1 text-xs font-medium text-gray-500">
        기존 마스터 (중복 방지 — 같은 대상이면 선택하세요)
      </p>
      {loading ? (
        <p className="px-1 py-2 text-sm text-gray-400">검색 중…</p>
      ) : items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-gray-400">
          일치하는 기존 마스터가 없습니다. 아래에서 새로 등록하세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((it) => {
            const v = verificationMeta(it.verification_status);
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onSelect(it)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 text-left hover:border-gray-300 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MasterCodeBadge code={it.master_code} />
                    <span className="truncate text-sm text-gray-800">{it.display_label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                    <span className="tabular-nums text-xs text-gray-400">{it.score}점</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
