import type { jsPDF } from "jspdf";
import { FolhaRow, Sessao, contratoLabel } from "./types";
import { fmtCompetencia, fmtData, fmtHoras, fmtNum, slug } from "./format";

const AZUL_ESCURO: [number, number, number] = [15, 23, 42];
const CINZA_CLARO: [number, number, number] = [241, 245, 249];
const MARGEM = 8;

interface DocComTabela extends jsPDF {
  lastAutoTable: { finalY: number };
}

/** jsPDF e o autotable só são baixados quando o usuário pede um PDF. */
async function carregarPdf() {
  const [{ jsPDF: JsPDF }, autoTable] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable").then((m) => m.default),
  ]);
  return { JsPDF, autoTable };
}

function cabecalho(doc: jsPDF, titulo: string, subtitulo?: string) {
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("AP Academia · Pagamentos", MARGEM, 10);

  const agora = new Date();
  doc.text(
    `Gerado em ${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    doc.internal.pageSize.getWidth() - MARGEM,
    10,
    { align: "right" }
  );

  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text(titulo, MARGEM, 18);

  if (subtitulo) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(subtitulo, MARGEM, 23.5);
  }
  doc.setTextColor(20);
  return subtitulo ? 27 : 22;
}

/** Numera as páginas no rodapé depois que o documento inteiro está montado. */
function rodapePaginas(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(`Página ${i} de ${total}`, largura - MARGEM, altura - 5, { align: "right" });
  }
}

/** Folha completa do mês, em paisagem (14 colunas). */
export async function baixarPdfFolha(rows: FolhaRow[], competencia: string) {
  const { JsPDF, autoTable } = await carregarPdf();
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const y = cabecalho(
    doc,
    `Folha de pagamento — ${fmtCompetencia(competencia)}`,
    "Valores em R$. Horas totais = horas calculadas + ajuste."
  );

  const soma = (campo: keyof FolhaRow) =>
    rows.reduce((acc, r) => acc + (Number(r[campo]) || 0), 0);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGEM, right: MARGEM },
    head: [
      [
        "Nome",
        "Contrato",
        "Horas calc.",
        "Ajuste",
        "Horas tot.",
        "Salário DP",
        "Bolsa estágio",
        "Valor aulas",
        "Transporte",
        "Extras",
        "Serviços",
        "Adiantado",
        "Total a pagar",
        "Status",
      ],
    ],
    body: rows.map((r) => [
      r.nome,
      contratoLabel(r),
      fmtHoras(r.horas_calculadas),
      fmtHoras(r.ajuste_horas),
      fmtHoras(r.horas_totais),
      fmtNum(r.salario_dp),
      fmtNum(r.bolsa_estagio),
      fmtNum(r.valor_aulas),
      fmtNum(r.valor_transporte),
      fmtNum(r.valor_extras),
      fmtNum(r.valor_servicos),
      fmtNum(r.valor_adiantado),
      fmtNum(r.total),
      r.status_pagamento === "pago" ? "Pago" : "Pendente",
    ]),
    foot: [
      [
        `Total (${rows.length} colaboradores)`,
        "",
        "",
        "",
        "",
        fmtNum(soma("salario_dp")),
        fmtNum(soma("bolsa_estagio")),
        fmtNum(soma("valor_aulas")),
        fmtNum(soma("valor_transporte")),
        fmtNum(soma("valor_extras")),
        fmtNum(soma("valor_servicos")),
        fmtNum(soma("valor_adiantado")),
        fmtNum(soma("total")),
        "",
      ],
    ],
    styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: { fillColor: AZUL_ESCURO, fontSize: 6.5, halign: "right" },
    footStyles: { fillColor: CINZA_CLARO, textColor: 20, fontStyle: "bold", halign: "right" },
    columnStyles: {
      0: { cellWidth: 46, halign: "left" },
      1: { cellWidth: 30, halign: "left" },
      13: { halign: "center" },
    },
    bodyStyles: { halign: "right" },
    didParseCell: (data) => {
      if (data.section === "head" && (data.column.index === 0 || data.column.index === 1)) {
        data.cell.styles.halign = "left";
      }
      if (data.section === "foot" && data.column.index === 0) {
        data.cell.styles.halign = "left";
      }
    },
  });

  rodapePaginas(doc);
  doc.save(`folha-${competencia}.pdf`);
}

export interface GrupoAulas {
  nome: string;
  sessoes: Sessao[];
}

/**
 * Aulas do mês. Um grupo gera o PDF de um professor;
 * vários geram um PDF único com um professor por página.
 */
export async function baixarPdfAulas(
  grupos: GrupoAulas[],
  competencia: string,
  nomeArquivo?: string
) {
  const { JsPDF, autoTable } = await carregarPdf();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  grupos.forEach((grupo, i) => {
    if (i > 0) doc.addPage();

    const total = grupo.sessoes.reduce(
      (acc, s) => acc + Number(s.valor_sessao) + Number(s.valor_bonificacao),
      0
    );
    const presencas = grupo.sessoes.reduce((acc, s) => acc + Number(s.presencas), 0);

    const y = cabecalho(doc, grupo.nome, `Aulas de ${fmtCompetencia(competencia)}`);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGEM, right: MARGEM },
      head: [["Data", "Horário", "Atividade", "Presenças", "Valor sessão", "Bonificação", "Total"]],
      body: grupo.sessoes.map((s) => [
        fmtData(s.data),
        s.horario || "",
        s.atividade?.nome || "—",
        String(s.presencas),
        fmtNum(s.valor_sessao),
        fmtNum(s.valor_bonificacao),
        fmtNum(Number(s.valor_sessao) + Number(s.valor_bonificacao)),
      ]),
      foot: [
        [
          `Total: ${grupo.sessoes.length} sessões`,
          "",
          "",
          String(presencas),
          "",
          "",
          fmtNum(total),
        ],
      ],
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: AZUL_ESCURO, halign: "right" },
      footStyles: { fillColor: CINZA_CLARO, textColor: 20, fontStyle: "bold", halign: "right" },
      bodyStyles: { halign: "right" },
      columnStyles: {
        0: { cellWidth: 20, halign: "left" },
        1: { cellWidth: 17, halign: "center" },
        2: { halign: "left" },
        3: { cellWidth: 18 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
      },
      didParseCell: (data) => {
        if (data.column.index <= 2 && data.section !== "body") {
          data.cell.styles.halign = data.column.index === 1 ? "center" : "left";
        }
      },
    });

    if (grupos.length > 1) {
      const finalY = (doc as DocComTabela).lastAutoTable.finalY;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Valor total a pagar: R$ ${fmtNum(total)}`, MARGEM, finalY + 6);
      doc.setTextColor(20);
    }
  });

  rodapePaginas(doc);
  const sufixo = nomeArquivo || (grupos.length === 1 ? slug(grupos[0].nome) : "todos");
  doc.save(`aulas-${competencia}-${sufixo}.pdf`);
}
