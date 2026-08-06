import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseAulasXlsx } from "@/lib/parseAulas";
import { calcularBonificacao } from "@/lib/calc";
import { encontrarPorNome, normalizarNome } from "@/lib/nomes";
import { Atividade, Colaborador } from "@/lib/types";

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
  if (!file) return NextResponse.json({ error: "Envie o arquivo XLSX" }, { status: 400 });
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ error: "Competência inválida" }, { status: 400 });
  }

  let aulas;
  try {
    aulas = parseAulasXlsx(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o XLSX" }, { status: 400 });
  }
  if (aulas.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma aula encontrada. Confira as colunas (Data, Hora, Atividade, Participantes, Professor)." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const [{ data: colabData, error: e1 }, { data: ativData, error: e2 }] = await Promise.all([
    db.from("colaboradores").select("*"),
    db.from("atividades").select("*"),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 || e2)!.message }, { status: 500 });

  const colaboradores = (colabData || []) as Colaborador[];
  const atividades = (ativData || []) as Atividade[];
  const novosColabs: string[] = [];
  const novasAtividades: string[] = [];

  // resolve/cria atividades e colaboradores citados no arquivo
  const mapaAtividade = new Map<string, Atividade>();
  const mapaColab = new Map<string, Colaborador>();

  for (const aula of aulas) {
    const chaveAtiv = normalizarNome(aula.atividade);
    if (!mapaAtividade.has(chaveAtiv)) {
      let ativ = atividades.find((a) => normalizarNome(a.nome) === chaveAtiv);
      if (!ativ) {
        const { data, error } = await db
          .from("atividades")
          .insert({ nome: aula.atividade })
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        ativ = data as Atividade;
        atividades.push(ativ);
        novasAtividades.push(ativ.nome);
      }
      mapaAtividade.set(chaveAtiv, ativ);
    }

    const chaveColab = normalizarNome(aula.professor);
    if (!mapaColab.has(chaveColab)) {
      let colab = encontrarPorNome(colaboradores, aula.professor);
      if (!colab) {
        const { data, error } = await db
          .from("colaboradores")
          .insert({ nome: aula.professor, tipo_contrato: "nenhum", autonomo: true })
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        colab = data as Colaborador;
        colaboradores.push(colab);
        novosColabs.push(colab.nome);
      } else if (!colab.autonomo) {
        await db.from("colaboradores").update({ autonomo: true }).eq("id", colab.id);
        colab.autonomo = true;
      }
      mapaColab.set(chaveColab, colab);
    }
  }

  // substitui as sessões importadas anteriormente nesta competência (mantém as manuais)
  const { error: errDel } = await db
    .from("sessoes")
    .delete()
    .eq("competencia", competencia)
    .eq("origem", "importacao");
  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 });

  const linhas = aulas.map((aula) => {
    const ativ = mapaAtividade.get(normalizarNome(aula.atividade))!;
    const colab = mapaColab.get(normalizarNome(aula.professor))!;
    return {
      competencia,
      colaborador_id: colab.id,
      atividade_id: ativ.id,
      data: aula.data,
      horario: aula.horario,
      presencas: aula.presencas,
      valor_sessao: Number(ativ.valor_sessao) || 0,
      valor_bonificacao: calcularBonificacao(ativ, aula.presencas),
      origem: "importacao",
    };
  });

  const { error: errIns } = await db.from("sessoes").insert(linhas);
  if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 });

  const semValor = [...mapaAtividade.values()]
    .filter((a) => !Number(a.valor_sessao))
    .map((a) => a.nome);

  return NextResponse.json({
    competencia,
    totalSessoes: linhas.length,
    professores: [...mapaColab.values()].map((c) => c.nome).sort(),
    novosColaboradores: novosColabs,
    novasAtividades,
    avisoValores:
      semValor.length > 0
        ? `Atividades sem valor de sessão configurado (valores importados como R$ 0): ${semValor.join(", ")}. Configure em Atividades e reimporte, ou edite na tela Aulas.`
        : null,
  });
}
