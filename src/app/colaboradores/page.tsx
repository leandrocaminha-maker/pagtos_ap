"use client";

import { useEffect, useState } from "react";
import { Colaborador, TipoContrato, TIPO_CONTRATO_LABEL, contratoLabel } from "@/lib/types";
import { fmtBRL, fmtHoras } from "@/lib/format";

const VAZIO: Omit<Colaborador, "id"> = {
  nome: "",
  tipo_contrato: "nenhum",
  autonomo: false,
  valor_transporte: 0,
  valor_bolsa_hora: 0,
  horas_dom: 0,
  horas_seg: 0,
  horas_ter: 0,
  horas_qua: 0,
  horas_qui: 0,
  horas_sex: 0,
  horas_sab: 0,
  ativo: true,
};

const DIAS: { campo: keyof Colaborador; label: string }[] = [
  { campo: "horas_seg", label: "Seg" },
  { campo: "horas_ter", label: "Ter" },
  { campo: "horas_qua", label: "Qua" },
  { campo: "horas_qui", label: "Qui" },
  { campo: "horas_sex", label: "Sex" },
  { campo: "horas_sab", label: "Sáb" },
  { campo: "horas_dom", label: "Dom" },
];

export default function ColaboradoresPage() {
  const [lista, setLista] = useState<Colaborador[]>([]);
  const [form, setForm] = useState<Partial<Colaborador>>(VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  async function carregar() {
    const res = await fetch("/api/colaboradores");
    if (res.ok) setLista(await res.json());
    else setErro((await res.json()).error || "Erro ao carregar");
  }
  useEffect(() => {
    carregar();
  }, []);

  const usaHoras = form.tipo_contrato === "clt_horista" || form.tipo_contrato === "estagio";

  function editar(c: Colaborador) {
    setForm({ ...c });
    setEditandoId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpar() {
    setForm(VAZIO);
    setEditandoId(null);
    setErro("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const url = editandoId ? `/api/colaboradores/${editandoId}` : "/api/colaboradores";
    const res = await fetch(url, {
      method: editandoId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    if (res.ok) {
      limpar();
      carregar();
    } else {
      setErro((await res.json()).error || "Erro ao salvar");
    }
  }

  async function excluir(c: Colaborador) {
    if (!window.confirm(`Excluir ${c.nome}? Todas as aulas e lançamentos dele serão removidos.`)) return;
    const res = await fetch(`/api/colaboradores/${c.id}`, { method: "DELETE" });
    if (res.ok) carregar();
    else setErro((await res.json()).error || "Erro ao excluir");
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));
  const visiveis = lista.filter((c) => mostrarInativos || c.ativo);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Colaboradores</h1>

      <form onSubmit={salvar} className="card space-y-4">
        <h2 className="font-semibold">{editandoId ? "Editar colaborador" : "Novo colaborador"}</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm grow min-w-64">
            Nome
            <input
              className="input"
              value={form.nome || ""}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tipo de contrato
            <select
              className="input"
              value={form.tipo_contrato}
              onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value as TipoContrato })}
            >
              <option value="nenhum">Nenhum (apenas autônomo)</option>
              <option value="clt_mensalista">CLT Mensalista</option>
              <option value="clt_horista">CLT Horista</option>
              <option value="estagio">Estágio</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm mt-5">
            <input
              type="checkbox"
              checked={!!form.autonomo}
              onChange={(e) => setForm({ ...form, autonomo: e.target.checked })}
            />
            Também autônomo / freelancer
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Vale transporte (R$/mês)
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-36"
              value={form.valor_transporte ?? 0}
              onChange={(e) => setForm({ ...form, valor_transporte: num(e.target.value) })}
            />
          </label>
          {form.tipo_contrato === "estagio" && (
            <label className="flex flex-col gap-1 text-sm">
              Bolsa (R$/hora)
              <input
                type="number"
                step="0.01"
                min="0"
                className="input w-36"
                value={form.valor_bolsa_hora ?? 0}
                onChange={(e) => setForm({ ...form, valor_bolsa_hora: num(e.target.value) })}
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm mt-5">
            <input
              type="checkbox"
              checked={form.ativo !== false}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Ativo
          </label>
        </div>

        {usaHoras && (
          <div>
            <p className="text-sm font-medium mb-2">Horas por dia da semana</p>
            <div className="flex flex-wrap gap-3">
              {DIAS.map((d) => (
                <label key={d.campo} className="flex flex-col gap-1 text-sm items-center">
                  {d.label}
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    className="input w-20"
                    value={(form[d.campo] as number) ?? 0}
                    onChange={(e) => setForm({ ...form, [d.campo]: num(e.target.value) })}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {erro && <p className="text-sm text-rose-600">{erro}</p>}
        <div className="flex gap-2">
          <button className="btn" disabled={salvando}>
            {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar"}
          </button>
          {editandoId && (
            <button type="button" className="btn btn-secondary" onClick={limpar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">
            Cadastrados <span className="text-slate-400 font-normal">({visiveis.length})</span>
          </h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
            />
            Mostrar inativos
          </label>
        </div>
        <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contrato</th>
              <th>Transporte</th>
              <th>Bolsa/h</th>
              <th>Horas semana (Seg–Dom)</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => (
              <tr key={c.id} className={c.ativo ? "" : "opacity-50"}>
                <td className="font-medium">{c.nome}</td>
                <td>{contratoLabel(c)}</td>
                <td>{Number(c.valor_transporte) ? fmtBRL(c.valor_transporte) : "—"}</td>
                <td>{c.tipo_contrato === "estagio" ? fmtBRL(c.valor_bolsa_hora) : "—"}</td>
                <td>
                  {c.tipo_contrato === "clt_horista" || c.tipo_contrato === "estagio"
                    ? [c.horas_seg, c.horas_ter, c.horas_qua, c.horas_qui, c.horas_sex, c.horas_sab, c.horas_dom]
                        .map(fmtHoras)
                        .join(" · ")
                    : "—"}
                </td>
                <td>{c.ativo ? "Ativo" : "Inativo"}</td>
                <td className="text-right">
                  <button className="btn btn-secondary mr-1" onClick={() => editar(c)}>
                    Editar
                  </button>
                  <button className="btn btn-danger" onClick={() => excluir(c)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-6">
                  Nenhum colaborador cadastrado. Cadastre acima ou importe arquivos na aba Importar.
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
