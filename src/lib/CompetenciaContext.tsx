"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { competenciaPadrao } from "./calc";

interface Ctx {
  competencia: string;
  setCompetencia: (c: string) => void;
}

const CompetenciaCtx = createContext<Ctx>({
  competencia: competenciaPadrao(),
  setCompetencia: () => {},
});

export function CompetenciaProvider({ children }: { children: React.ReactNode }) {
  const [competencia, setCompetenciaState] = useState(competenciaPadrao());

  useEffect(() => {
    const salvo = window.localStorage.getItem("pagtos_competencia");
    if (salvo && /^\d{4}-\d{2}$/.test(salvo)) setCompetenciaState(salvo);
  }, []);

  const setCompetencia = (c: string) => {
    if (!/^\d{4}-\d{2}$/.test(c)) return;
    setCompetenciaState(c);
    window.localStorage.setItem("pagtos_competencia", c);
  };

  return (
    <CompetenciaCtx.Provider value={{ competencia, setCompetencia }}>
      {children}
    </CompetenciaCtx.Provider>
  );
}

export const useCompetencia = () => useContext(CompetenciaCtx);
