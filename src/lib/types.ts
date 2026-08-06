export type TipoContrato = "clt_mensalista" | "clt_horista" | "estagio" | "nenhum";

export interface Colaborador {
  id: string;
  nome: string;
  tipo_contrato: TipoContrato;
  autonomo: boolean;
  valor_transporte: number;
  valor_bolsa_hora: number;
  horas_dom: number;
  horas_seg: number;
  horas_ter: number;
  horas_qua: number;
  horas_qui: number;
  horas_sex: number;
  horas_sab: number;
  ativo: boolean;
}

export interface Atividade {
  id: string;
  nome: string;
  valor_sessao: number;
  tem_bonificacao: boolean;
  bonus_min_presencas: number;
  valor_bonus: number;
}

export interface Sessao {
  id: string;
  competencia: string;
  colaborador_id: string;
  atividade_id: string | null;
  data: string | null;
  horario: string | null;
  presencas: number;
  valor_sessao: number;
  valor_bonificacao: number;
  origem: string;
  colaborador?: { id: string; nome: string };
  atividade?: { id: string; nome: string } | null;
}

export interface FolhaRow {
  colaborador_id: string;
  nome: string;
  tipo_contrato: TipoContrato;
  autonomo: boolean;
  horas_calculadas: number;
  ajuste_horas: number;
  horas_totais: number;
  salario_dp: number;
  bolsa_estagio: number;
  valor_aulas: number;
  valor_transporte: number;
  valor_extras: number;
  valor_servicos: number;
  valor_adiantado: number;
  total: number;
  status_pagamento: "pendente" | "pago";
}

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  clt_mensalista: "CLT Mensalista",
  clt_horista: "CLT Horista",
  estagio: "Estágio",
  nenhum: "—",
};

export function contratoLabel(c: Pick<Colaborador, "tipo_contrato" | "autonomo">): string {
  const base = TIPO_CONTRATO_LABEL[c.tipo_contrato];
  if (c.autonomo) return c.tipo_contrato === "nenhum" ? "Autônomo" : `${base} + Autônomo`;
  return base;
}
