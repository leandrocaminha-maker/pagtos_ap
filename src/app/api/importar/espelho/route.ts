import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseEspelhoTexto } from "@/lib/parseEspelho";
import { encontrarPorNome } from "@/lib/nomes";
import { Colaborador } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    return await importar(req);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function importar(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const competencia = String(form.get("competencia") || "");
  if (!file) return NextResponse.json({ error: "Envie o arquivo PDF" }, { status: 400 });
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ error: "Competência inválida" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let texto: string;
  try {
    texto = (await pdfParse(buffer)).text;
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o PDF" }, { status: 400 });
  }

  const { competenciaDetectada, itens } = parseEspelhoTexto(texto);
  if (itens.length === 0) {
    return NextResponse.json(
      { error: "Nenhum colaborador encontrado no PDF. Confira se é o espelho da folha." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data: colaboradores, error: errCol } = await db.from("colaboradores").select("*");
  if (errCol) return NextResponse.json({ error: errCol.message }, { status: 500 });

  const lista = (colaboradores || []) as Colaborador[];
  const resultado: { nome: string; liquido: number; novo: boolean }[] = [];

  for (const item of itens) {
    let colab = encontrarPorNome(lista, item.nome);
    if (!colab) {
      const { data: novo, error } = await db
        .from("colaboradores")
        .insert({ nome: item.nome, tipo_contrato: item.tipoDetectado })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      colab = novo as Colaborador;
      lista.push(colab);
      resultado.push({ nome: item.nome, liquido: item.liquido, novo: true });
    } else {
      resultado.push({ nome: colab.nome, liquido: item.liquido, novo: false });
    }

    const { error: errSal } = await db
      .from("salarios_dp")
      .upsert(
        { competencia, colaborador_id: colab.id, salario_liquido: item.liquido },
        { onConflict: "competencia,colaborador_id" }
      );
    if (errSal) return NextResponse.json({ error: errSal.message }, { status: 500 });
  }

  return NextResponse.json({
    competencia,
    competenciaDetectada,
    avisoCompetencia:
      competenciaDetectada && competenciaDetectada !== competencia
        ? `Atenção: o PDF parece ser de ${competenciaDetectada}, mas foi importado em ${competencia}.`
        : null,
    importados: resultado,
  });
}
