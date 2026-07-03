"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  FilterBar,
  Input,
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
import { maskEmail, maskPhone } from "@yna/utils";
import { fmtDate, masterStatusMeta, verificationMeta } from "@/lib/hub-data/display";
import type { ExpertMaster, MasterStatus, VerificationStatus } from "@/lib/hub-data/types";

/**
 * 전문가 마스터 목록. (근거: functional_spec §8)
 * 컬럼: master_code/name/email/phone/organization/position/expertise_tags/검증/상태.
 * 이메일·전화 마스킹, 검색·상태·검증 필터, 정렬, 페이지네이션.
 */
const PAGE_SIZE = 10;
type SortKey = "updatedAt" | "name";

export function ExpertsTable({ experts }: { experts: ExpertMaster[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<MasterStatus | "">("");
  const [verif, setVerif] = useState<VerificationStatus | "">("");
  const [sort, setSort] = useState<SortKey>("updatedAt");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = experts.filter((e) => {
      if (status && e.status !== status) return false;
      if (verif && e.verificationStatus !== verif) return false;
      if (query) {
        const hay = `${e.name} ${e.masterCode} ${e.organization ?? ""} ${e.expertiseTags.join(" ")}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    rows.sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name, "ko") : b.updatedAt.localeCompare(a.updatedAt),
    );
    return rows;
  }, [experts, q, status, verif, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterBar trailing={<span className="text-sm text-gray-500">{filtered.length}명</span>}>
        <Input
          placeholder="이름·코드·소속·전문분야 검색"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          className="w-60"
          aria-label="전문가 검색"
        />
        <Select
          value={status}
          onChange={(e) => resetPage(setStatus)(e.target.value as MasterStatus | "")}
          className="w-32"
          aria-label="상태 필터"
        >
          <option value="">상태 전체</option>
          <option value="active">활성</option>
          <option value="merged">병합됨</option>
          <option value="archived">보관</option>
        </Select>
        <Select
          value={verif}
          onChange={(e) => resetPage(setVerif)(e.target.value as VerificationStatus | "")}
          className="w-36"
          aria-label="검증 상태 필터"
        >
          <option value="">검증 전체</option>
          <option value="verified">검증됨</option>
          <option value="pending">검토대기</option>
          <option value="temporary">임시</option>
          <option value="needs_review">재검토</option>
          <option value="rejected">반려</option>
        </Select>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-36"
          aria-label="정렬"
        >
          <option value="updatedAt">최근 수정순</option>
          <option value="name">이름순</option>
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="전문가가 없습니다" description="검색 조건을 바꾸세요." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>코드</TH>
                <TH>이름</TH>
                <TH className="hidden lg:table-cell">이메일</TH>
                <TH className="hidden lg:table-cell">연락처</TH>
                <TH className="hidden md:table-cell">소속</TH>
                <TH className="hidden md:table-cell">직함</TH>
                <TH className="hidden xl:table-cell">전문분야</TH>
                <TH>검증</TH>
                <TH className="hidden sm:table-cell">상태</TH>
                <TH className="hidden sm:table-cell">수정일</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((e) => {
                const v = verificationMeta(e.verificationStatus);
                const st = masterStatusMeta(e.status);
                return (
                  <TR key={e.id} interactive onClick={() => router.push(`/experts/${e.id}`)}>
                    <TD>
                      <MasterCodeBadge code={e.masterCode} />
                    </TD>
                    <TD className="font-medium text-gray-900">{e.name}</TD>
                    <TD className="hidden text-gray-600 lg:table-cell">{e.email ? maskEmail(e.email) : "—"}</TD>
                    <TD className="hidden text-gray-600 lg:table-cell">{e.phone ? maskPhone(e.phone) : "—"}</TD>
                    <TD className="hidden text-gray-600 md:table-cell">{e.organization ?? "—"}</TD>
                    <TD className="hidden text-gray-600 md:table-cell">{e.position ?? "—"}</TD>
                    <TD className="hidden text-gray-500 xl:table-cell">
                      {e.expertiseTags.length > 0 ? e.expertiseTags.join(", ") : "—"}
                    </TD>
                    <TD>
                      <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    </TD>
                    <TD className="hidden text-gray-600 sm:table-cell">{fmtDate(e.updatedAt)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                  이전
                </Button>
                <span className="tabular-nums">
                  {current + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
