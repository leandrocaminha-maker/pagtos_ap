import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { horasCalculadasMes } from "@/lib/calc";
import { Colaborador, FolhaRow } from "@/lib/types";

export async function GET(req: NextRequest) {
  const competencia = req.nextUrl.searchParams.get("competencia");
  if (!competencia) {
    return NextResponse.json({ error: "competencia é obrigatória" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const [colabs, salarios, itens, sessoes] = await Promise.all([
    db.from("colaboradores").select("*").order("nome"),
    db.from("salarios_dp").select("*").eq("competencia", competencia),
    db.from("folha_itens").select("*").eq("competencia", competencia),
    db.from("sessoes").select("colaborador_id, valor_sessao, valor_bonificacao").eq("competencia", competencia),
  ]);
  const erro = colabs.error || salarios.error || itens.error || sessoes.error;
  if (erro) return NextResponse.json({ error: erro.message }, { status: 500 });

  const salarioPor = new Map<string, number>();
  for (const s of salarios.data || []) salarioPor.set(s.colaborador_id, Number(s.salario_liquido));

  type FolhaItem = {
    colaborador_id: string;
    ajuste_horas: number;
    valor_extras: number;
    valor_servicos: number;
    valor_adiantado: number;
    status_pagamento: string;
  };
  const itemPor = new Map<string, FolhaItem>();
  for (const i of (itens.data || []) as FolhaItem[]) itemPor.set(i.colaborador_id, i);

  const aulasPor = new Map<string, number>();
  for (const s of sessoes.data || []) {
    aulasPor.set(
      s.colaborador_id,
      (aulasPor.get(s.colaborador_id) || 0) + Number(s.valor_sessao) + Number(s.valor_bonificacao)
    );
  }

  const rows: FolhaRow[] = [];
  for (const c of (colabs.data || []) as Colaborador[]) {
    const temDados =
      salarioPor.has(c.id) || aulasPor.has(c.id) || itemPor.has(c.id);
    if (!c.ativo && !temDados) continue;

    const item = itemPor.get(c.id);
    const horasCalc = horasCalculadasMes(c, competencia);
    const ajuste = Number(item?.ajuste_horas) || 0;
    const horasTotais = Math.round((horasCalc + ajuste) * 10) / 10;
    const salarioDp = salarioPor.get(c.id) || 0;
    const bolsa =
      c.tipo_contrato === "estagio"
        ? Math.round(horasTotais * Number(c.valor_bolsa_hora) * 100) / 100
        : 0;
    const aulas = Math.round((aulasPor.get(c.id) || 0) * 100) / 100;
    const extras = Number(item?.valor_extras) || 0;
    const servicos = Number(item?.valor_servicos) || 0;
    const adiantado = Number(item?.valor_adiantado) || 0;
    const transporte = Number(c.valor_transporte) || 0;
    const total =
      Math.round((salarioDp + bolsa + aulas + transporte + extras + servicos - adiantado) * 100) / 100;

    rows.push({
      colaborador_id: c.id,
      nome: c.nome,
      tipo_contrato: c.tipo_contrato,
      autonomo: c.autonomo,
      horas_calculadas: horasCalc,
      ajuste_horas: ajuste,
      horas_totais: horasTotais,
      salario_dp: salarioDp,
      bolsa_estagio: bolsa,
      valor_aulas: aulas,
      valor_transporte: transporte,
      valor_extras: extras,
      valor_servicos: servicos,
      valor_adiantado: adiantado,
      total,
      status_pagamento: (item?.status_pagamento as "pendente" | "pago") || "pendente",
    });
  }

  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { competencia, colaborador_id, ...campos } = body;
  if (!competencia || !colaborador_id) {
    return NextResponse.json(
      { error: "competencia e colaborador_id são obrigatórios" },
      { status: 400 }
    );
  }
  const permitidos = [
    "ajuste_horas",
    "valor_extras",
    "valor_servicos",
    "valor_adiantado",
    "status_pagamento",
  ];
  const valores: Record<string, unknown> = {};
  for (const k of permitidos) if (k in campos) valores[k] = campos[k];

  const { error } = await supabaseAdmin()
    .from("folha_itens")
    .upsert(
      { competencia, colaborador_id, ...valores },
      { onConflict: "competencia,colaborador_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
