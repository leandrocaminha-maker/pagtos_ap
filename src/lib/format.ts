const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function fmtBRL(v: number): string {
  return brl.format(Number(v) || 0);
}

export function fmtHoras(v: number): string {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/** "2026-07" -> "Julho/2026" */
export function fmtCompetencia(comp: string): string {
  const [ano, mes] = comp.split("-").map(Number);
  const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${nomes[(mes || 1) - 1]}/${ano}`;
}

/** "2026-07-15" -> "15/07/2026" */
export function fmtData(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
