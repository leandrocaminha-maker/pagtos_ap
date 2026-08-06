"use client";

import { useEffect, useState } from "react";
import { Atividade } from "@/lib/types";
import { useCompetencia } from "@/lib/CompetenciaContext";
import { fmtCompetencia } from "@/lib/format";

export default function AtividadesPage() {
  const { competencia } = useCompetencia();
  const [lista, setLista] = useState<Atividade[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [erro, setErro] = useState("");
  const [salvos, setSalvos] = useState<Record<string, string>>({});

  async function carregar() {
    const res = await fetch("/api/atividades");
    if (res.ok) setLista(await res.json());
    else setErro((await res.json()).error || "Erro ao carregar");
  }
  useEffect(() => {
    carregar();
  }, []);

  function alterar(id: string, campo: keyof Atividade, valor: unknown) {
    setLista((l) => l.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
    setSalvos((s) => ({ ...s, [id]: "" }));
  }

  async function salvar(a: Atividade) {
    setErro("");
    const res = await fetch(`/api/atividades/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: a.nome,
        valor_sessao: Number(a.valor_sessao) || 0,
        tem_bonificacao: a.tem_bonificacao,
        bonus_min_presencas: Number(a.bonus_min_presencas) || 0,
        valor_bonus: Number(a.valor_bonus) || 0,
        recalcular_competencia: competencia,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      const n = Number(json.sessoes_atualizadas) || 0;
      setSalvos((s) => ({ ...s, [a.id]: n > 0 ? `Salvo ✓ (${n} aulas atualizadas)` : "Salvo ✓" }));
    } else {
      setErro((await res.json()).error || "Erro ao salvar");
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const res = await fetch("/api/atividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome }),
    });
    if (res.ok) {
      setNovoNome("");
      carregar();
    } else {
      setErro((await res.json()).error || "Erro ao criar");
    }
  }

  async function excluir(a: Atividade) {
    if (!window.confirm(`Excluir a atividade "${a.nome}"?`)) return;
    const res = await fetch(`/api/atividades/${a.id}`, { method: "DELETE" });
    if (res.ok) carregar();
    else setErro((await res.json()).error || "Erro ao excluir");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Atividades</h1>
        <p className="text-slate-500 text-sm mt-1">
          Valor pago por sessão e regra de bonificação: se as presenças da sessão passarem de N,
          o professor recebe (presenças − N) × valor do bônus. Ao salvar, os novos valores são
          reaplicados a todas as aulas da atividade em <b>{fmtCompetencia(competencia)}</b>{" "}
          (inclusive células editadas manualmente nessa atividade).
        </p>
      </div>

      <form onSubmit={criar} className="card flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm grow max-w-md">
          Nova atividade
          <input
            className="input"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex.: MAT PILATES"
            required
          />
        </label>
        <button className="btn">Adicionar</button>
        <p className="text-xs text-slate-400 w-full">
          Dica: ao importar o arquivo de aulas, as atividades novas são criadas automaticamente —
          depois basta configurar os valores aqui.
        </p>
      </form>

      {erro && <p className="text-sm text-rose-600">{erro}</p>}

      <div className="card">
        <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Atividade</th>
              <th>Valor da sessão (R$)</th>
              <th>Tem bonificação?</th>
              <th>Presenças mínimas (N)</th>
              <th>Bônus por presença excedente (R$)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id}>
                <td>
                  <input
                    className="input w-56"
                    value={a.nome}
                    onChange={(e) => alterar(a.id, "nome", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input w-28"
                    value={a.valor_sessao}
                    onChange={(e) => alterar(a.id, "valor_sessao", e.target.value)}
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={a.tem_bonificacao}
                    onChange={(e) => alterar(a.id, "tem_bonificacao", e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    className="input w-24"
                    value={a.bonus_min_presencas}
                    disabled={!a.tem_bonificacao}
                    onChange={(e) => alterar(a.id, "bonus_min_presencas", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input w-28"
                    value={a.valor_bonus}
                    disabled={!a.tem_bonificacao}
                    onChange={(e) => alterar(a.id, "valor_bonus", e.target.value)}
                  />
                </td>
                <td className="text-right">
                  <button className="btn mr-1" onClick={() => salvar(a)}>
                    {salvos[a.id] || "Salvar"}
                  </button>
                  <button className="btn btn-danger" onClick={() => excluir(a)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-6">
                  Nenhuma atividade. Adicione acima ou importe o arquivo de aulas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
