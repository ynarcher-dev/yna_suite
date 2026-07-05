/**
 * import 패널용 CSV 파서(순수, 클라이언트/서버 공용). (근거: migration_strategy §7)
 *
 * 첫 줄을 헤더로 보고 각 행을 { 헤더: 값 } 레코드로 만든다. 매핑/정규화/판정은 서버가 담당하며,
 * 여기서는 원본 컬럼을 훼손 없이 그대로 담아 raw_payload 보존 흐름에 넘긴다.
 * 큰따옴표로 감싼 필드 안의 콤마/따옴표(`""`)를 처리하는 최소 CSV 규격만 지원한다.
 */

/** 한 줄을 CSV 필드로 분리(따옴표 인식). */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/**
 * CSV 텍스트를 레코드 배열로 파싱한다. 빈 줄은 건너뛴다.
 * @throws 헤더가 없거나 컬럼명이 비면 오류.
 */
export function parseImportCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = splitLine(lines[0]!);
  if (headers.some((h) => h === "")) {
    throw new Error("헤더에 빈 컬럼명이 있습니다.");
  }

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]!);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
