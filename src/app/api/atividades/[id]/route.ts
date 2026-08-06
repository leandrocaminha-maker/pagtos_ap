import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calcularBonificacao } from "@/lib/calc";
import { Atividade } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  delete body.id;
  // competência cujas aulas devem ser recalculadas com os novos valores
  const recalcularCompetencia: string | null = body.recalcular_competencia || null;
  delete body.recalcular_competencia;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("atividades")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sessoesAtualizadas = 0;
  if (recalcularCompetencia && /^\d{4}-\d{2}$/.test(recalcularCompetencia)) {
    const atividade = data as Atividade;
    const { data: sessoes, error: errSes } = await db
      .from("sessoes")
      .select("id, presencas")
      .eq("atividade_id", id)
      .eq("competencia", recalcularCompetencia);
    if (errSes) return NextResponse.json({ error: errSes.message }, { status: 500 });

    for (const s of sessoes || []) {
      const { error: errUpd } = await db
        .from("sessoes")
        .update({
          valor_sessao: Number(atividade.valor_sessao) || 0,
          valor_bonificacao: calcularBonificacao(atividade, Number(s.presencas) || 0),
        })
        .eq("id", s.id);
      if (errUpd) return NextResponse.json({ error: errUpd.message }, { status: 500 });
      sessoesAtualizadas++;
    }
  }

  return NextResponse.json({ ...data, sessoes_atualizadas: sessoesAtualizadas });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabaseAdmin().from("atividades").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
