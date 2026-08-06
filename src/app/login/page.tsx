"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    setCarregando(false);
    if (res.ok) {
      router.push("/folha");
      router.refresh();
    } else {
      setErro("Senha incorreta");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={entrar} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">AP Academia · Pagamentos</h1>
        <input
          type="password"
          className="input w-full"
          placeholder="Senha de acesso"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
        />
        {erro && <p className="text-sm text-rose-600">{erro}</p>}
        <button className="btn w-full justify-center" disabled={carregando || !senha}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
