/** Normaliza nome para comparação: maiúsculas, sem acentos/pontos, espaços únicos. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Encontra colaborador pelo nome, tolerando variações entre arquivos:
 * 1º igualdade do nome normalizado;
 * 2º primeiro + último nome iguais ("ALINE AP. SILVA CAMARGO" ↔ "ALINE APARECIDA SILVA CAMARGO");
 * 3º nome mais curto é prefixo do mais longo ("VANESSA ROBERT" ↔ "VANESSA ROBERT BATISTA",
 *    "ROGERIO" ↔ "ROGERIO PASSANHA DE SOUSA GUERRA").
 * Nas regras 2 e 3 só considera se houver exatamente UM candidato, para não juntar pessoas erradas.
 */
export function encontrarPorNome<T extends { nome: string }>(lista: T[], nome: string): T | undefined {
  const alvo = normalizarNome(nome);
  const exato = lista.find((c) => normalizarNome(c.nome) === alvo);
  if (exato) return exato;

  const partes = alvo.split(" ");

  if (partes.length >= 2) {
    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    const candidatos = lista.filter((c) => {
      const p = normalizarNome(c.nome).split(" ");
      return p.length >= 2 && p[0] === primeiro && p[p.length - 1] === ultimo;
    });
    if (candidatos.length === 1) return candidatos[0];
  }

  const ehPrefixo = (curto: string[], longo: string[]) =>
    curto.length < longo.length && curto.every((t, i) => t === longo[i]);
  const porPrefixo = lista.filter((c) => {
    const p = normalizarNome(c.nome).split(" ");
    return ehPrefixo(partes, p) || ehPrefixo(p, partes);
  });
  return porPrefixo.length === 1 ? porPrefixo[0] : undefined;
}
