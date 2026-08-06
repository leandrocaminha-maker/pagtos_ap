"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CompetenciaProvider, useCompetencia } from "@/lib/CompetenciaContext";

function ThemeToggle() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle("dark", novo);
    window.localStorage.setItem("pagtos_theme", novo ? "dark" : "light");
  }

  return (
    <button
      onClick={alternar}
      title={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className="rounded-lg px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 hover:bg-slate-700 cursor-pointer"
    >
      {escuro ? "☀️" : "🌙"}
    </button>
  );
}

const LINKS = [
  { href: "/folha", label: "Folha do mês" },
  { href: "/aulas", label: "Aulas" },
  { href: "/importar", label: "Importar" },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/atividades", label: "Atividades" },
];

function TopBar() {
  const pathname = usePathname();
  const { competencia, setCompetencia } = useCompetencia();

  if (pathname === "/login") return null;

  return (
    <header className="bg-slate-900 text-white">
      <div className="px-4 py-3 flex flex-wrap items-center gap-4">
        <span className="font-bold text-lg tracking-tight">AP Academia · Pagamentos</span>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                pathname.startsWith(l.href)
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <label htmlFor="competencia" className="text-slate-300">Competência:</label>
          <input
            id="competencia"
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-white [color-scheme:dark]"
          />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <CompetenciaProvider>
      <TopBar />
      <main className="px-4 py-6">{children}</main>
    </CompetenciaProvider>
  );
}
