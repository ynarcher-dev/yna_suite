import { ROLE_TEMPLATES, type RoleTemplate } from "@yna/core";
import { templatePermissions } from "@yna/permissions";
import type { TemplateInfo } from "./types";

/**
 * 권한 템플릿 표시 정보. (근거: functional_spec §18 — 초기 템플릿 8종)
 * 권한 값은 packages/permissions 의 매트릭스에서 전개하므로 seed 마이그레이션과 동일하다.
 */
const TEMPLATE_META: Record<RoleTemplate, { displayName: string; description: string }> = {
  master: { displayName: "마스터", description: "전 도메인 관리자. 사용자·권한·마스터 병합 포함." },
  executive: { displayName: "임원", description: "전 도메인 읽기 중심 열람 권한." },
  management_office: {
    displayName: "경영지원실",
    description: "프로젝트·경영관리 쓰기, 그 외 읽기.",
  },
  investment_team: { displayName: "투자팀", description: "M&A·펀드·프로젝트 쓰기, 그 외 읽기." },
  business_team: { displayName: "사업팀", description: "Work·프로젝트 쓰기 중심." },
  guest_expert: { displayName: "외부 전문가", description: "배정된 평가/멘토링만 접근(self)." },
  guest_startup: { displayName: "외부 스타트업", description: "자기 회사 신청/제출만 접근(company)." },
  viewer: { displayName: "뷰어", description: "Hub·Work 읽기 전용." },
};

export function listTemplateInfos(): TemplateInfo[] {
  return ROLE_TEMPLATES.map((roleKey) => ({
    roleKey,
    displayName: TEMPLATE_META[roleKey].displayName,
    description: TEMPLATE_META[roleKey].description,
    permissions: templatePermissions(roleKey),
  }));
}

export function templateDisplayName(role: RoleTemplate): string {
  return TEMPLATE_META[role].displayName;
}
