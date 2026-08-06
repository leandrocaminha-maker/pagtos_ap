import { Atividade, Colaborador } from "./types";

/** Competência padrão: mês anterior ao atual (folha fecha no mês seguinte). */
export function competenciaPadrao(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Soma de horas do mês para CLT horista / estágio:
 * horas cadastradas por dia da semana × quantidade de cada dia no mês.
 */
export function horasCalculadasMes(c: Colaborador, competencia: string): number {
  if (c.tipo_contrato !== "clt_horista" && c.tipo_contrato !== "estagio") return 0;
  const [ano, mes] = competencia.split("-").map(Number);
  if (!ano || !mes) return 0;
  const porDiaSemana = [
    c.horas_dom, c.horas_seg, c.horas_ter, c.horas_qua, c.horas_qui, c.horas_sex, c.horas_sab,
  ];
  const diasNoMes = new Date(ano, mes, 0).getDate();
  let total = 0;
  for (let dia = 1; dia <= diasNoMes; dia++) {
    total += Number(porDiaSemana[new Date(ano, mes - 1, dia).getDay()]) || 0;
  }
  return Math.round(total * 10) / 10;
}

/** Bonificação da sessão: se presenças > N, (presenças − N) × valor do bônus. */
export function calcularBonificacao(atividade: Atividade | null | undefined, presencas: number): number {
  if (!atividade || !atividade.tem_bonificacao) return 0;
  const excedente = presencas - atividade.bonus_min_presencas;
  return excedente > 0 ? Math.round(excedente * Number(atividade.valor_bonus) * 100) / 100 : 0;
}
