/**
 * 표시용 포맷/마스킹 유틸.
 * 개인정보 마스킹은 목록 화면 기본값이며, 원본 조회는 권한자 + audit log 전제.
 * (근거: yna_suite_security_policy.md, 3_checklist.md §개인정보 마스킹)
 */

/** 이메일 마스킹: a***@domain 형태. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const name = email.slice(0, at);
  const domain = email.slice(at);
  const head = name.slice(0, 1);
  return `${head}***${domain}`;
}

/** 전화번호 마스킹: 뒤 4자리만 노출. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-****-${digits.slice(-4)}`;
}

/** 사업자등록번호 마스킹: 앞 3자리만 노출(123-**-*****). */
export function maskBusinessNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 3) return "***";
  return `${digits.slice(0, 3)}-**-*****`;
}

/** 이름 마스킹: 성/끝 글자만 노출(홍*동, 두 글자는 홍*). 목록의 대표자명 등에 사용. */
export function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed || "***";
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}${"*".repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
}
