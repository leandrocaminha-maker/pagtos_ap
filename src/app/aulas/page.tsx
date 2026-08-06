"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompetencia } from "@/lib/CompetenciaContext";
import { Atividade, Colaborador, Sessao } from "@/lib/types";
import { fmtBRL, fmtCompetencia } from "@/lib/format";
import { calcularBonificacao } from "@/lib/calc";

export default function AulasPage() {
  const { competencia } = useCompetencia();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  // formulário de nova sessão
  const [novo, setNovo] = useState({ atividade_id: "", data: "", horario: "", presencas: 0 });
  const [novoProfessor, setNovoProfessor] = useState("");

  async function carregar() {
    setCarregando(true);
    setErro("");
    const [rSes, rAtiv, rCol] = await Promise.all([
      fetch(`/api/sessoes?competencia=${competencia}`),
      fetch("/api/atividades"),
      fetch("/api/colaboradores"),
    ]);
    if (rSes.ok) setSessoes(await rSes.json());
    else setErro((await rSes.json()).error || "Erro ao carregar aulas");
    if (rAtiv.ok) setAtividades(await rAtiv.json());
    if (rCol.ok) setColaboradores(await rCol.json());
    setCarregando(false);
  }
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  // abas: professores com sessões no mês + autônomos cadastrados
  const professores = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of colaboradores) if (c.autonomo && c.ativo) mapa.set(c.id, c.nome);
    for (const s of sessoes) if (s.colaborador) mapa.set(s.colaborador.id, s.colaborador.nome);
    return [...mapa.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [colaboradores, sessoes]);

  const profAtivo = abaAtiva && professores.some((p) => p.id === abaAtiva)
    ? abaAtiva
    : professores[0]?.id || null;

  const sessoesProf = useMemo(
    () =>
      sessoes
        .filter((s) => s.colaborador_id === profAtivo)
        .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`)),
    [sessoes, profAtivo]
  );

  const totalProf = sessoesProf.reduce(
    (acc, s) => acc + Number(s.valor_sessao) + Number(s.valor_bonificacao),
    0
  );

  function atualizarLocal(id: string, campos: Partial<Sessao>) {
    setSessoes((l) => l.map((s) => (s.id === id ? { ...s, ...campos } : s)));
  }

  async function salvarSessao(id: string, campos: Partial<Sessao>) {
    const res = await fetch(`/api/sessoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      setErro((await res.json()).error || "Erro ao salvar");
      carregar();
    }
  }

  /** Ao mudar presenças ou atividade, recalcula a bonificação pela regra configurada. */
  function camposComBonus(s: Sessao, campos: Partial<Sessao>): Partial<Sessao> {
    const atividadeId = (campos.atividade_id ?? s.atividade_id) as string | null;
    const presencas = Number(campos.presencas ?? s.presencas) || 0;
    const ativ = atividades.find((a) => a.id === atividadeId);
    const out: Partial<Sessao> = { ...campos };
    if ("presencas" in campos || "atividade_id" in campos) {
      out.valor_bonificacao = calcularBonificacao(ativ, presencas);
      if ("atividade_id" in campos && ativ) out.valor_sessao = Number(ativ.valor_sessao) || 0;
    }
    return out;
  }

  async function excluirSessao(id: string) {
    if (!window.confirm("Excluir esta sessão?")) return;
    const res = await fetch(`/api/sessoes/${id}`, { method: "DELETE" });
    if (res.ok) setSessoes((l) => l.filter((s) => s.id !== id));
    else setErro((await res.json()).error || "Erro ao excluir");
  }

  async function incluirSessao(e: React.FormEvent) {
    e.preventDefault();
    if (!profAtivo) return;
    const ativ = atividades.find((a) => a.id === novo.atividade_id);
    const res = await fetch("/api/sessoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competencia,
        colaborador_id: profAtivo,
        atividade_id: novo.atividade_id || null,
        data: novo.data || null,
        horario: novo.horario || null,
        presencas: Number(novo.presencas) || 0,
        valor_sessao: Number(ativ?.valor_sessao) || 0,
        valor_bonificacao: calcularBonificacao(ativ, Number(novo.presencas) || 0),
      }),
    });
    if (res.ok) {
      const criada = await res.json();
      setSessoes((l) => [...l, criada]);
      setNovo({ atividade_id: novo.atividade_id, data: novo.data, horario: "", presencas: 0 });
    } else {
      setErro((await res.json()).error || "Erro ao incluir");
    }
  }

  async function criarProfessor(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoProfessor, tipo_contrato: "nenhum", autonomo: true }),
    });
    if (res.ok) {
      const c = await res.json();
      setNovoProfessor("");
      await carregar();
      setAbaAtiva(c.id);
    } else {
      setErro((await res.json()).error || "Erro ao criar professor");
    }
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Aulas — {fmtCompetencia(competencia)}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Aulas capturadas do arquivo + lançamentos manuais. As células são editáveis; o valor é
            salvo ao sair do campo. Bonificação recalculada ao alterar presenças.
          </p>
        </div>
        <form onSubmit={criarProfessor} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Novo professor autônomo
            <input
              className="input"
              value={novoProfessor}
              onChange={(e) => setNovoProfessor(e.target.value)}
              placeholder="Nome"
              required
            />
          </label>
          <button className="btn btn-secondary">Adicionar</button>
        </form>
      </div>

      {erro && <p className="text-sm text-rose-600">{erro}</p>}

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : professores.length === 0 ? (
        <div className="card text-slate-500">
          Nenhum professor autônomo. Importe o arquivo de aulas na aba <b>Importar</b> ou cadastre um
          professor acima.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {professores.map((p) => (
              <button
                key={p.id}
                onClick={() => setAbaAtiva(p.id)}
                className={`px-3 py-1.5 rounded-t-lg text-sm font-medium border border-b-0 cursor-pointer ${
                  p.id === profAtivo
                    ? "bg-white border-slate-200 text-sky-700 dark:bg-slate-900 dark:border-slate-800 dark:text-sky-400"
                    : "bg-slate-200 border-transparent text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>

          <div className="card !rounded-tl-none space-y-4 -mt-6">
            <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Atividade</th>
                  <th>Presenças</th>
                  <th>Valor sessão (R$)</th>
                  <th>Bonificação (R$)</th>
                  <th>Origem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessoesProf.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        type="date"
                        className="input"
                        value={s.data || ""}
                        onChange={(e) => atualizarLocal(s.id, { data: e.target.value })}
                        onBlur={(e) => salvarSessao(s.id, { data: e.target.value || null })}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="input"
                        value={s.horario || ""}
                        onChange={(e) => atualizarLocal(s.id, { horario: e.target.value })}
                        onBlur={(e) => salvarSessao(s.id, { horario: e.target.value || null })}
                      />
                    </td>
                    <td>
                      <select
                        className="input"
                        value={s.atividade_id || ""}
                        onChange={(e) => {
                          const campos = camposComBonus(s, { atividade_id: e.target.value || null });
                          atualizarLocal(s.id, campos);
                          salvarSessao(s.id, campos);
                        }}
                      >
                        <option value="">—</option>
                        {atividades.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="input w-20"
                        value={s.presencas}
                        onChange={(e) => atualizarLocal(s.id, { presencas: num(e.target.value) })}
                        onBlur={(e) => {
                          const campos = camposComBonus(s, { presencas: num(e.target.value) });
                          atualizarLocal(s.id, campos);
                          salvarSessao(s.id, campos);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input w-24"
                        value={s.valor_sessao}
                        onChange={(e) => atualizarLocal(s.id, { valor_sessao: num(e.target.value) })}
                        onBlur={(e) => salvarSessao(s.id, { valor_sessao: num(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input w-24"
                        value={s.valor_bonificacao}
                        onChange={(e) =>
                          atualizarLocal(s.id, { valor_bonificacao: num(e.target.value) })
                        }
                        onBlur={(e) => salvarSessao(s.id, { valor_bonificacao: num(e.target.value) })}
                      />
                    </td>
                    <td className="text-xs text-slate-400">
                      {s.origem === "manual" ? "manual" : "arquivo"}
                    </td>
                    <td>
                      <button className="btn btn-danger" onClick={() => excluirSessao(s.id)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {sessoesProf.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-400 py-6">
                      Nenhuma aula neste mês para este professor.
                    </td>
                  </tr>
                )}
              </tbody>
              {sessoesProf.length > 0 && (
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={4}>Total ({sessoesProf.length} sessões)</td>
                    <td colSpan={4}>{fmtBRL(totalProf)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            </div>

            <form onSubmit={incluirSessao} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <span className="text-sm font-medium w-full">Inserir sessão</span>
              <label className="flex flex-col gap-1 text-sm">
                Atividade
                <select
                  className="input"
                  value={novo.atividade_id}
                  onChange={(e) => setNovo({ ...novo, atividade_id: e.target.value })}
                >
                  <option value="">—</option>
                  {atividades.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Data
                <input
                  type="date"
                  className="input"
                  value={novo.data}
                  onChange={(e) => setNovo({ ...novo, data: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Horário
                <input
                  type="time"
                  className="input"
                  value={novo.horario}
                  onChange={(e) => setNovo({ ...novo, horario: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Presenças
                <input
                  type="number"
                  min="0"
                  className="input w-24"
                  value={novo.presencas}
                  onChange={(e) => setNovo({ ...novo, presencas: num(e.target.value) })}
                />
              </label>
              <button className="btn">Incluir</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
