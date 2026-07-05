import Link from "next/link";
import type { StatusTone } from "@yna/ui";

/**
 * 대시보드 숫자 위젯. (근거: functional_spec §4)
 * tone 은 pending 계열 강조(warning)에만 사용하고 기본은 중립이다.
 */
export function StatCard({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number;
  href?: string;
  tone?: StatusTone;
}) {
  const accent = tone === "warning" && value > 0 ? "text-brand-700" : "text-gray-900";
  const body = (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value.toLocaleString()}</p>
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg">
      {body}
    </Link>
  );
}
