/**
 * Parser do PDF "Espelho da Folha" (sistema SCI VISUAL Practice).
 * Extrai por funcionário: nome, salário líquido e tipo (mensalista/horista).
 */

export interface EspelhoItem {
  nome: string;
  liquido: number;
  tipoDetectado: "clt_mensalista" | "clt_horista";
}

function parseValorBR(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
}

export function parseEspelhoTexto(texto: string): { competenciaDetectada: string | null; itens: EspelhoItem[] } {
  // Competência no cabeçalho: "REFERENTE AO MÊS DE JULHO DE 2026"
  const MESES: Record<string, string> = {
    JANEIRO: "01", FEVEREIRO: "02", MARÇO: "03", MARCO: "03", ABRIL: "04",
    MAIO: "05", JUNHO: "06", JULHO: "07", AGOSTO: "08", SETEMBRO: "09",
    OUTUBRO: "10", NOVEMBRO: "11", DEZEMBRO: "12",
  };
  let competenciaDetectada: string | null = null;
  const mComp = texto.match(/REFERENTE AO M[EÊ]S DE\s+([A-ZÇÃ]+)\s+DE\s+(\d{4})/i);
  if (mComp) {
    const mes = MESES[mComp[1].toUpperCase()];
    if (mes) competenciaDetectada = `${mComp[2]}-${mes}`;
  }

  // Cabeçalho de cada funcionário (o texto extraído vem sem espaço após o código):
  // "103ALINE APARECIDA SILVA CAMARGO 1 1Admitido em ..."
  const headerRe = /^(\d{1,5})\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ .'-]{2,}?)\s+\d+\s+\d+\s*Admitido em/gm;
  const headers: { nome: string; inicio: number; fimHeader: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(texto)) !== null) {
    headers.push({ nome: m[2].replace(/\s+/g, " ").trim(), inicio: m.index, fimHeader: headerRe.lastIndex });
  }

  const itens: EspelhoItem[] = [];
  for (let i = 0; i < headers.length; i++) {
    const bloco = texto.slice(headers[i].inicio, i + 1 < headers.length ? headers[i + 1].inicio : texto.length);
    // Linha de totais: "Líquido -> 2.821,00" (a primeira ocorrência do bloco)
    const mLiq = bloco.match(/L[íi]quido\s*->\s*([\d.]+,\d{2})/);
    if (!mLiq) continue;
    const tipoDetectado = /Sal\.?\s*Hor\.?\s*Normal/i.test(bloco) ? "clt_horista" : "clt_mensalista";
    itens.push({ nome: headers[i].nome, liquido: parseValorBR(mLiq[1]), tipoDetectado });
  }
  return { competenciaDetectada, itens };
}
