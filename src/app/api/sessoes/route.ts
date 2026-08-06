import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const competencia = req.nextUrl.searchParams.get("competencia");
  if (!competencia) {
    return NextResponse.json({ error: "competencia é obrigatória" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from("sessoes")
    .select("*, colaborador:colaboradores(id, nome), atividade:atividades(id, nome)")
    .eq("competencia", competencia)
    .order("data")
    .order("horario");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.competencia || !body.colaborador_id) {
    return NextResponse.json(
      { error: "competencia e colaborador_id são obrigatórios" },
      { status: 400 }
    );
  }
  body.origem = "manual";
  const { data, error } = await supabaseAdmin()
    .from("sessoes")
    .insert(body)
    .select("*, colaborador:colaboradores(id, nome), atividade:atividades(id, nome)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
