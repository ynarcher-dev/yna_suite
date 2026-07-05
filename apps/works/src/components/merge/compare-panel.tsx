import { MasterCodeBadge, StatusBadge, Table, TBody, TD, TH, THead, TR } from "@yna/ui";
import { maskBusinessNumber, maskEmail, maskName, maskPhone } from "@yna/utils";
import {
  fieldPolicyLabel,
  identifierLabel,
  maskIdentifierValue,
  reasonLabel,
  verificationMeta,
} from "@/lib/hub-data/display";
import type { MergeEntitySnapshot, MergeFieldResolutionRow, MergePreview } from "@/lib/hub-data/types";

/**
 * 병합 후보 좌우 비교 + 대표값 미리보기(순수 표현). (근거: master_data_policy §14, functional_spec §15)
 * 좌=소멸 예정(source), 우=잔존(target). 민감 필드는 마스킹하고, 대표값 컬럼이 병합 후 값을 보여준다.
 */

function maskField(key: string, value: string | null): string {
  if (!value) return "—";
  if (key.includes("business") || key.includes("corporation")) return maskBusinessNumber(value);
  if (key === "phone") return maskPhone(value);
  if (key === "email") return maskEmail(value);
  if (key === "representativeName") return maskName(value);
  return value;
}

function SnapshotColumn({ snapshot, label }: { snapshot: MergeEntitySnapshot; label: string }) {
  const v = verificationMeta(snapshot.ref.verificationStatus);
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
      </div>
      <div className="flex items-center gap-2">
        <MasterCodeBadge code={snapshot.ref.masterCode} />
        <span className="truncate text-sm font-semibold text-gray-900">{snapshot.ref.name}</span>
      </div>
      <dl className="mt-1 flex flex-col gap-1 text-sm">
        {snapshot.fields.map((f) => (
          <div key={f.key} className="flex justify-between gap-3">
            <dt className="shrink-0 text-gray-500">{f.label}</dt>
            <dd className="min-w-0 truncate text-right text-gray-800">
              {f.sensitive ? maskField(f.key, f.value) : (f.value ?? "—")}
            </dd>
          </div>
        ))}
      </dl>
      {snapshot.identifiers.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5 border-t border-gray-100 pt-2">
          {snapshot.identifiers.map((i) => (
            <span key={i.id} className="truncate text-xs text-gray-500">
              {identifierLabel(i.identifierType)}: {maskIdentifierValue(i.identifierType, i.identifierValue)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComparePanel({
  source,
  target,
}: {
  source: MergeEntitySnapshot;
  target: MergeEntitySnapshot;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SnapshotColumn snapshot={source} label="소멸 예정 (source)" />
      <SnapshotColumn snapshot={target} label="잔존 마스터 (target)" />
    </div>
  );
}

export function PreviewWarnings({ preview }: { preview: MergePreview }) {
  if (preview.warnings.length === 0) return null;
  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${
        preview.blocked ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-800"
      }`}
    >
      <p className="font-medium">
        {preview.blocked ? "강한 식별자 충돌 — 병합할 수 없습니다." : "주의: 상충 정보가 있습니다."}
      </p>
      <ul className="mt-1 list-inside list-disc">
        {preview.warnings.map((w) => (
          <li key={w}>{reasonLabel(w)}</li>
        ))}
      </ul>
    </div>
  );
}

export function FieldResolutionTable({ rows }: { rows: MergeFieldResolutionRow[] }) {
  const changed = rows.filter((r) => (r.source ?? null) !== (r.target ?? null));
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-md font-semibold text-gray-900">병합 후 대표값 미리보기</h2>
      {changed.length === 0 ? (
        <p className="text-sm text-gray-500">두 마스터의 값이 동일해 변경되는 필드가 없습니다.</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>필드</TH>
              <TH>소멸값</TH>
              <TH>잔존값</TH>
              <TH>대표값</TH>
              <TH className="hidden sm:table-cell">정책</TH>
            </TR>
          </THead>
          <TBody>
            {changed.map((r) => (
              <TR key={r.field}>
                <TD className="text-gray-800">{r.label}</TD>
                <TD className="text-gray-500">{r.source ?? "—"}</TD>
                <TD className="text-gray-500">{r.target ?? "—"}</TD>
                <TD className="font-medium text-gray-900">{r.selected ?? "—"}</TD>
                <TD className="hidden text-gray-500 sm:table-cell">{fieldPolicyLabel(r.policy)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}
