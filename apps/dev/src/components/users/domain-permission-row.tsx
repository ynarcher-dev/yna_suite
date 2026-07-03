"use client";

import { type Domain, type ScopeType, SCOPE_TYPES } from "@yna/core";
import { scopeRequiresTarget } from "@yna/permissions";
import { Input, Select, Switch, TD, TR } from "@yna/ui";
import { DOMAIN_SHORT } from "@/lib/dev-data/display";

/** 도메인 권한 편집 행의 편집 상태. */
export interface RowState {
  enabled: boolean;
  write: boolean;
  scopeType: ScopeType;
  scopeId: string;
  expiresAt: string;
}

/**
 * 도메인 권한 편집 행. (근거: functional_spec §16 — 도메인별 read/write/scope/expires)
 * 순수 controlled 컴포넌트: 상태와 onChange 는 상위 editor 가 관리한다.
 */
export function DomainPermissionRow({
  domain,
  state,
  disabled,
  onChange,
}: {
  domain: Domain;
  state: RowState;
  disabled: boolean;
  onChange: (next: RowState) => void;
}) {
  const needsTarget = scopeRequiresTarget(state.scopeType);
  return (
    <TR>
      <TD className="font-medium text-gray-900">{DOMAIN_SHORT[domain]}</TD>
      <TD>
        <Switch
          checked={state.enabled || state.write}
          disabled={disabled || state.write}
          onCheckedChange={(v) => onChange({ ...state, enabled: v })}
          aria-label={`${DOMAIN_SHORT[domain]} 읽기`}
        />
      </TD>
      <TD>
        <Switch
          checked={state.write}
          disabled={disabled}
          onCheckedChange={(v) => onChange({ ...state, write: v, enabled: v || state.enabled })}
          aria-label={`${DOMAIN_SHORT[domain]} 쓰기`}
        />
      </TD>
      <TD>
        <Select
          value={state.scopeType}
          disabled={disabled || (!state.enabled && !state.write)}
          onChange={(e) => onChange({ ...state, scopeType: e.target.value as ScopeType })}
          className="w-32"
          aria-label={`${DOMAIN_SHORT[domain]} scope`}
        >
          {SCOPE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </TD>
      <TD>
        <Input
          value={state.scopeId}
          disabled={disabled || !needsTarget}
          onChange={(e) => onChange({ ...state, scopeId: e.target.value })}
          placeholder={needsTarget ? "대상 ID" : "—"}
          className="w-36"
          aria-label={`${DOMAIN_SHORT[domain]} scope 대상`}
        />
      </TD>
      <TD>
        <Input
          type="datetime-local"
          value={state.expiresAt}
          disabled={disabled || (!state.enabled && !state.write)}
          onChange={(e) => onChange({ ...state, expiresAt: e.target.value })}
          className="w-52"
          aria-label={`${DOMAIN_SHORT[domain]} 만료일`}
        />
      </TD>
    </TR>
  );
}
