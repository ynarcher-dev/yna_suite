"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, FormField, Input, Select } from "@yna/ui";
import type { EntityType } from "@yna/core";
import { ENTITY_LABEL } from "@/lib/hub-data/display";
import {
  CREATE_FIELDS,
  DETAIL_BASE,
  toTemporaryBody,
  type CreateForm,
  type CreateFormKey,
} from "./master-create-config";
import { MasterSearchPicker, type SearchApiItem } from "./master-search-picker";

/**
 * 신규(임시) 마스터 등록 dialog(엔티티 공용). (근거: functional_spec §6·8·9, api_contracts §7)
 *
 * 로컬 입력 UX: 표시명을 입력하면 기존 마스터를 자동완성으로 먼저 보여주고(중복 방지),
 * 같은 대상이면 선택해 상세로 이동(FK 연계 데모), 없으면 `POST .../temporary` 로 즉시 임시 생성한다.
 * TEMP 코드·temporary 검증으로 생성되며 서버가 중복 후보를 자동 생성해 Hub 큐(pending)로 보낸다.
 */
type MasterEntity = Exclude<EntityType, "manager">;

export function MasterCreateDialog({
  entityType,
  open,
  onClose,
}: {
  entityType: MasterEntity;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CreateForm>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fields = CREATE_FIELDS[entityType];
  const [nameField, ...restFields] = fields;

  function set(key: CreateFormKey, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  function reset() {
    setForm({});
    setError(null);
    setBusy(false);
  }

  function goToDetail(id: string) {
    reset();
    onClose();
    router.push(`${DETAIL_BASE[entityType]}/${id}`);
  }

  async function submit() {
    setError(null);
    if (!(form.name ?? "").trim()) {
      setError("표시명을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/hub/masters/${entityType}/temporary`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toTemporaryBody(entityType, form)),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? "등록에 실패했습니다.");
        setBusy(false);
        return;
      }
      goToDetail(json.data.id as string);
    } catch {
      setError("등록 중 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={`신규 ${ENTITY_LABEL[entityType]} 등록`}
      description="검증 전 임시(TEMP) 마스터로 등록되며 중복 후보가 자동 생성됩니다."
      confirmLabel="임시 마스터로 등록"
      busy={busy}
      onConfirm={submit}
      onCancel={() => {
        reset();
        onClose();
      }}
    >
      <div className="flex flex-col gap-3">
        <FormField
          label={nameField?.label ?? "표시명"}
          htmlFor="mc-name"
          required
          error={error ?? undefined}
        >
          <Input
            id="mc-name"
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder={nameField?.placeholder}
            autoComplete="off"
          />
        </FormField>

        <MasterSearchPicker
          entityType={entityType}
          query={form.name ?? ""}
          onSelect={(item: SearchApiItem) => goToDetail(item.id)}
        />

        <div className="grid grid-cols-2 gap-3">
          {restFields.map((f) => (
            <FormField key={f.key} label={f.label} htmlFor={`mc-${f.key}`}>
              {f.type === "select" ? (
                <Select
                  id={`mc-${f.key}`}
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  <option value="">선택</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={`mc-${f.key}`}
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  autoComplete="off"
                />
              )}
            </FormField>
          ))}
        </div>
      </div>
    </ConfirmDialog>
  );
}
