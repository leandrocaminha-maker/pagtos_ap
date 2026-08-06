"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompetencia } from "@/lib/CompetenciaContext";
import { FolhaRow, contratoLabel } from "@/lib/types";
import { fmtBRL, fmtCompetencia, fmtHoras } from "@/lib/format";
import { baixarPdfFolha } from "@/lib/pdf";

type CampoEditavel = "ajuste_horas" | "valor_extras" | "valor_servicos" | "valor_adiantado";

export default function FolhaPage() {
  const { competencia } = useCompetencia();
  const [rows, setRows] = useState<FolhaRow[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalHoristas, setModalHoristas] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  async function carregar(silencioso = false) {
    if (!silencioso) setCarregando(true);
    setErro("");
    const res = await fetch(`/api/folha?competencia=${competencia}`);
    if (res.ok) setRows(await res.json());
    else setErro((await res.json()).error || "Erro ao carregar a folha");
    setCarregando(false);
  }
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  function atualizarLocal(id: string, campos: Partial<FolhaRow>) {
    setRows((l) => l.map((r) => (r.colaborador_id === id ? { ...r, ...campos } : r)));
  }

  async function salvarCampo(id: string, campo: CampoEditavel | "status_pagamento", valor: unknown) {
    const res = await fetch("/api/folha", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencia, colaborador_id: id, [campo]: valor }),
    });
    if (!res.ok) {
      setErro((await res.json()).error || "Erro ao salvar");
    }
    carregar(true); // recarrega para recalcular horas totais, bolsa e total
  }

  async function alternarStatus(r: FolhaRow) {
    const novo = r.status_pagamento === "pago" ? "pendente" : "pago";
    atualizarLocal(r.colaborador_id, { status_pagamento: novo });
    await salvarCampo(r.colaborador_id, "status_pagamento", novo);
  }

  const horistas = useMemo(() => rows.filter((r) => r.tipo_contrato === "clt_horista"), [rows]);

  const textoHoristas = useMemo(() => {
    const linhas = horistas.map((r) => `${r.nome}: ${fmtHoras(r.horas_totais)} horas`);
    return `Horas dos horistas — ${fmtCompetencia(competencia)}\n\n${linhas.join("\n")}`;
  }, [horistas, competencia]);

  async function copiarHoristas() {
    await navigator.clipboard.writeText(textoHoristas);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const totalGeral = rows.reduce((acc, r) => acc + r.total, 0);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const celulaEditavel = (r: FolhaRow, campo: CampoEditavel, step = "0.01") => (
    <input
      type="number"
      step={step}
      className="input w-24 text-right"
      value={r[campo]}
      onChange={(e) => atualizarLocal(r.colaborador_id, { [campo]: num(e.target.value) })}
      onBlur={(e) => salvarCampo(r.colaborador_id, campo, num(e.target.value))}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Folha — {fmtCompetencia(competencia)}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ajuste de horas, extras, serviços e adiantamento são editáveis na própria tabela (salvos
            ao sair da célula).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-secondary"
            disabled={rows.length === 0 || gerandoPdf}
            onClick={async () => {
              setGerandoPdf(true);
              try {
                await baixarPdfFolha(rows, competencia);
              } catch (e) {
                setErro(`Erro ao gerar o PDF: ${(e as Error).message}`);
              } finally {
                setGerandoPdf(false);
              }
            }}
          >
            {gerandoPdf ? "Gerando..." : "📄 Baixar folha em PDF"}
          </button>
          <button className="btn" onClick={() => setModalHoristas(true)} disabled={horistas.length === 0}>
            Horas dos horistas p/ DP
          </button>
        </div>
      </div>

      {erro && <p className="text-sm text-rose-600">{erro}</p>}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contrato</th>
                <th className="text-right">Horas calc.</th>
                <th className="text-right">Ajuste horas</th>
                <th className="text-right">Horas totais</th>
                <th className="text-right">Salário DP</th>
                <th className="text-right">Bolsa estágio</th>
                <th className="text-right">Valor aulas</th>
                <th className="text-right">Transporte</th>
                <th className="text-right">Extras</th>
                <th className="text-right">Serviços</th>
                <th className="text-right">Adiantado (−)</th>
                <th className="text-right">Total a pagar</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.colaborador_id}>
                  <td className="font-medium">{r.nome}</td>
                  <td>{contratoLabel(r)}</td>
                  <td className="text-right">{fmtHoras(r.horas_calculadas)}</td>
                  <td className="text-right">{celulaEditavel(r, "ajuste_horas", "0.5")}</td>
                  <td className="text-right font-medium">{fmtHoras(r.horas_totais)}</td>
                  <td className="text-right">{fmtBRL(r.salario_dp)}</td>
                  <td className="text-right">{fmtBRL(r.bolsa_estagio)}</td>
                  <td className="text-right">{fmtBRL(r.valor_aulas)}</td>
                  <td className="text-right">{fmtBRL(r.valor_transporte)}</td>
                  <td className="text-right">{celulaEditavel(r, "valor_extras")}</td>
                  <td className="text-right">{celulaEditavel(r, "valor_servicos")}</td>
                  <td className="text-right">{celulaEditavel(r, "valor_adiantado")}</td>
                  <td className="text-right font-bold">{fmtBRL(r.total)}</td>
                  <td>
                    <button
                      onClick={() => alternarStatus(r)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                        r.status_pagamento === "pago"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-800"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800"
                      }`}
                    >
                      {r.status_pagamento === "pago" ? "Pago ✓" : "Pendente"}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center text-slate-400 py-6">
                    Sem dados para esta competência. Importe os arquivos ou cadastre colaboradores.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={12}>Total geral</td>
                  <td className="text-right">{fmtBRL(totalGeral)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>
      )}

      {modalHoristas && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setModalHoristas(false)}
        >
          <div className="card max-w-lg w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">Horas dos horistas — {fmtCompetencia(competencia)}</h2>
            <p className="text-sm text-slate-500">
              Copie e cole no corpo do e-mail para o DP gerar a folha.
            </p>
            <textarea
              readOnly
              className="input w-full h-48 font-mono text-xs"
              value={textoHoristas}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn btn-secondary" onClick={() => setModalHoristas(false)}>
                Fechar
              </button>
              <button className="btn" onClick={copiarHoristas}>
                {copiado ? "Copiado ✓" : "Copiar texto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
