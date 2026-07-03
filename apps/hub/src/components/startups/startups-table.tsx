"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { maskBusinessNumber, maskName } from "@yna/utils";
import { usePermissions } from "@/lib/auth/permission-context";
import { fmtDate, masterStatusMeta, verificationMeta } from "@/lib/hub-data/display";
import type { MasterStatus, StartupMaster, VerificationStatus } from "@/lib/hub-data/types";
import { CreateStartupDialog } from "./create-startup-dialog";

/**
 * 스타트업 마스터 목록. (근거: functional_spec §6)
 * 컬럼: master_code/name/legal_name/대표자/사업자번호/검증상태/상태/유입/수정일.
 * 검색·상태·검증 필터, 정렬, 페이지네이션, 민감 필드 마스킹, 쓰기 권한 시 신규 등록.
 */
const PAGE_SIZE = 10;
type SortKey = "updatedAt" | "name";

export function StartupsTable({ startups }: { startups: StartupMaster[] }) {
  const router = useRouter();
  const { canWriteCurrent } = usePermissions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<MasterStatus | "">("");
  const [verif, setVerif] = useState<VerificationStatus | "">("");
  const [sort, setSort] = useState<SortKey>("updatedAt");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = startups.filter((s) => {
      if (status && s.status !== status) return false;
      if (verif && s.verificationStatus !== verif) return false;
      if (query) {
        const hay = `${s.name} ${s.legalName ?? ""} ${s.masterCode} ${s.representativeName ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
    rows.sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name, "ko") : b.updatedAt.localeCompare(a.updatedAt),
    );
    return rows;
  }, [startups, q, status, verif, sort]);

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
      <FilterBar
        trailing={
          canWriteCurrent ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              신규 등록
            </Button>
          ) : (
            <span className="text-sm text-gray-500">{filtered.length}건</span>
          )
        }
      >
        <Input
          placeholder="회사명·코드·대표자 검색"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          className="w-56"
          aria-label="스타트업 검색"
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
        <EmptyState title="스타트업이 없습니다" description="검색 조건을 바꾸거나 새 마스터를 등록하세요." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>코드</TH>
                <TH>표시명</TH>
                <TH className="hidden md:table-cell">법인명</TH>
                <TH className="hidden lg:table-cell">대표자</TH>
                <TH className="hidden lg:table-cell">사업자번호</TH>
                <TH>검증</TH>
                <TH className="hidden sm:table-cell">상태</TH>
                <TH className="hidden md:table-cell">유입</TH>
                <TH className="hidden sm:table-cell">수정일</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((s) => {
                const v = verificationMeta(s.verificationStatus);
                const st = masterStatusMeta(s.status);
                return (
                  <TR key={s.id} interactive onClick={() => router.push(`/startups/${s.id}`)}>
                    <TD>
                      <MasterCodeBadge code={s.masterCode} />
                    </TD>
                    <TD className="font-medium text-gray-900">{s.name}</TD>
                    <TD className="hidden text-gray-600 md:table-cell">{s.legalName ?? "—"}</TD>
                    <TD className="hidden text-gray-600 lg:table-cell">
                      {s.representativeName ? maskName(s.representativeName) : "—"}
                    </TD>
                    <TD className="hidden text-gray-600 lg:table-cell">
                      {s.businessNumber ? maskBusinessNumber(s.businessNumber) : "—"}
                    </TD>
                    <TD>
                      <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    </TD>
                    <TD className="hidden text-gray-500 md:table-cell">{s.sourceDomain ?? "—"}</TD>
                    <TD className="hidden text-gray-600 sm:table-cell">{fmtDate(s.updatedAt)}</TD>
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

      <CreateStartupDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
