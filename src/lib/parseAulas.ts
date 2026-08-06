import * as XLSX from "xlsx";

/**
 * Parser do XLSX de aulas dos autônomos.
 * Formato esperado (aba única): Data | Hora | Dia | Atividade | Participantes | Professor
 */

export interface AulaItem {
  data: string | null; // ISO yyyy-mm-dd
  horario: string | null; // HH:MM
  atividade: string;
  presencas: number;
  professor: string;
}

function normalizarTexto(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function parseData(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number") {
    // data serial do Excel
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

function parseHora(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "number") {
    const totalMin = Math.round(v * 24 * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const min = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const m = String(v).trim().match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return null;
}

export function parseAulasXlsx(buffer: Buffer): AulaItem[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const itens: AulaItem[] = [];

  for (const sheetName of wb.SheetNames) {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
    });
    // localiza a linha de cabeçalho
    const headerIdx = rows.findIndex((r) =>
      r.some((c) => /professor/i.test(String(c ?? "")))
    );
    if (headerIdx === -1) continue;

    const header = rows[headerIdx].map((c) => normalizarTexto(c).toLowerCase());
    const col = (nome: RegExp) => header.findIndex((h) => nome.test(h));
    const iData = col(/^data/);
    const iHora = col(/^hora/);
    const iAtividade = col(/atividade/);
    const iPresencas = col(/participante|presen/);
    const iProfessor = col(/professor/);
    if (iAtividade === -1 || iProfessor === -1) continue;

    for (const r of rows.slice(headerIdx + 1)) {
      const professor = normalizarTexto(r[iProfessor]);
      const atividade = normalizarTexto(r[iAtividade]);
      if (!professor || !atividade) continue;
      itens.push({
        data: iData >= 0 ? parseData(r[iData]) : null,
        horario: iHora >= 0 ? parseHora(r[iHora]) : null,
        atividade,
        presencas: Number(r[iPresencas]) || 0,
        professor,
      });
    }
  }
  return itens;
}
