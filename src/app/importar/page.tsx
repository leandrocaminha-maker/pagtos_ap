"use client";

import { useRef, useState } from "react";
import { useCompetencia } from "@/lib/CompetenciaContext";
import { fmtBRL, fmtCompetencia } from "@/lib/format";

interface ResultadoEspelho {
  avisoCompetencia: string | null;
  importados: { nome: string; liquido: number; novo: boolean }[];
}

interface ResultadoAulas {
  totalSessoes: number;
  professores: string[];
  novosColaboradores: string[];
  novasAtividades: string[];
  avisoValores: string | null;
}

function CardUpload({
  titulo,
  descricao,
  accept,
  onEnviar,
  children,
}: {
  titulo: string;
  descricao: string;
  accept: string;
  onEnviar: (file: File) => Promise<void>;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">{titulo}</h2>
      <p className="text-sm text-slate-500">{descricao}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="text-sm"
          onChange={(e) => setArquivo(e.target.files?.[0] || null)}
        />
        <button
          className="btn"
          disabled={!arquivo || enviando}
          onClick={async () => {
            if (!arquivo) return;
            setEnviando(true);
            try {
              await onEnviar(arquivo);
              setArquivo(null);
              if (inputRef.current) inputRef.current.value = "";
            } finally {
              setEnviando(false);
            }
          }}
        >
          {enviando ? "Importando..." : "Importar"}
        </button>
      </div>
      {children}
    </div>
  );
}

export default function ImportarPage() {
  const { competencia } = useCompetencia();
  const [erroEspelho, setErroEspelho] = useState("");
  const [erroAulas, setErroAulas] = useState("");
  const [resEspelho, setResEspelho] = useState<ResultadoEspelho | null>(null);
  const [resAulas, setResAulas] = useState<ResultadoAulas | null>(null);

  async function enviar<T>(url: string, file: File): Promise<T> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("competencia", competencia);
    const res = await fetch(url, { method: "POST", body: fd });
    const texto = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(texto);
    } catch {
      // resposta não-JSON (erro interno do servidor)
    }
    if (!res.ok || json === null) {
      throw new Error(
        (json?.error as string) || `Falha na importação (HTTP ${res.status}). Veja o log do servidor.`
      );
    }
    return json as T;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar arquivos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Os dados serão lançados na competência <b>{fmtCompetencia(competencia)}</b> (altere no topo
          da página se necessário). Colaboradores e atividades novos são cadastrados automaticamente.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <CardUpload
          titulo="Espelho de pagamento (PDF do DP)"
          descricao="PDF do departamento pessoal com o salário líquido dos colaboradores CLT. Reimportar substitui os salários da competência."
          accept=".pdf"
          onEnviar={async (f) => {
            setErroEspelho("");
            setResEspelho(null);
            try {
              setResEspelho(await enviar<ResultadoEspelho>("/api/importar/espelho", f));
            } catch (e) {
              setErroEspelho((e as Error).message);
            }
          }}
        >
          {erroEspelho && <p className="text-sm text-rose-600">{erroEspelho}</p>}
          {resEspelho && (
            <div className="text-sm space-y-2">
              {resEspelho.avisoCompetencia && (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
                  {resEspelho.avisoCompetencia}
                </p>
              )}
              <p className="text-emerald-700 font-medium dark:text-emerald-400">
                {resEspelho.importados.length} colaboradores importados ✓
              </p>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Líquido</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {resEspelho.importados.map((i) => (
                    <tr key={i.nome}>
                      <td>{i.nome}</td>
                      <td>{fmtBRL(i.liquido)}</td>
                      <td>
                        {i.novo && (
                          <span className="text-xs bg-sky-100 text-sky-700 rounded px-1.5 py-0.5 dark:bg-sky-900 dark:text-sky-300">
                            novo cadastro
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardUpload>

        <CardUpload
          titulo="Aulas do mês (XLSX)"
          descricao="Planilha com as aulas dadas pelos autônomos (Data, Hora, Atividade, Participantes, Professor). Reimportar substitui as aulas importadas da competência; as lançadas manualmente são mantidas."
          accept=".xlsx,.xls"
          onEnviar={async (f) => {
            setErroAulas("");
            setResAulas(null);
            try {
              setResAulas(await enviar<ResultadoAulas>("/api/importar/aulas", f));
            } catch (e) {
              setErroAulas((e as Error).message);
            }
          }}
        >
          {erroAulas && <p className="text-sm text-rose-600">{erroAulas}</p>}
          {resAulas && (
            <div className="text-sm space-y-2">
              {resAulas.avisoValores && (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
                  {resAulas.avisoValores}
                </p>
              )}
              <p className="text-emerald-700 font-medium dark:text-emerald-400">
                {resAulas.totalSessoes} aulas importadas para {resAulas.professores.length} professores ✓
              </p>
              {resAulas.novosColaboradores.length > 0 && (
                <p>
                  <b>Novos cadastros:</b> {resAulas.novosColaboradores.join(", ")}
                </p>
              )}
              {resAulas.novasAtividades.length > 0 && (
                <p>
                  <b>Novas atividades</b> (configure os valores na aba Atividades):{" "}
                  {resAulas.novasAtividades.join(", ")}
                </p>
              )}
              <p className="text-slate-500">
                Confira e ajuste as aulas na aba <b>Aulas</b>.
              </p>
            </div>
          )}
        </CardUpload>
      </div>
    </div>
  );
}
