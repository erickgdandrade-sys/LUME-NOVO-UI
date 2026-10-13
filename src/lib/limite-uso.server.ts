/// <reference types="node" />

const JANELA_MS = 60 * 60 * 1000;
const PADRAO_POR_HORA = 10;

const usos = new Map<string, number[]>();

function limitePorHora() {
  const valor = Number(globalThis.process?.env?.["LIMITE_ADAPTACOES_POR_HORA"]);
  return Number.isInteger(valor) && valor > 0 ? valor : PADRAO_POR_HORA;
}

export function consumirAdaptacao(
  visitante: string,
  porHora = limitePorHora(),
): { ok: true } | { ok: false; minutos: number } {
  const agora = Date.now();
  const recentes = (usos.get(visitante) ?? []).filter((t) => agora - t < JANELA_MS);

  if (recentes.length >= porHora) {
    const maisAntigo = recentes[0] ?? agora;
    return {
      ok: false,
      minutos: Math.max(1, Math.ceil((maisAntigo + JANELA_MS - agora) / 60_000)),
    };
  }

  recentes.push(agora);
  usos.set(visitante, recentes);
  if (usos.size > 5000) {
    for (const [chave, lista] of usos) {
      if (lista.every((t) => agora - t >= JANELA_MS)) usos.delete(chave);
    }
  }
  return { ok: true };
}
