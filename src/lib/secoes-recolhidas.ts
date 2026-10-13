import { createLocalStore } from "./local-store";

const fechadas = createLocalStore<string[]>("lume:secoes-fechadas:v1", [], { preferencia: true });

export function useRecolhida(chave: string, fechadaPorPadrao = false) {
  const lista = fechadas.use();
  const marcada = lista.includes(chave);
  const fechada = fechadaPorPadrao ? !marcada : marcada;
  const alternar = () => {
    const atual = fechadas.get();
    fechadas.set(atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]);
  };
  return [fechada, alternar] as const;
}

export function definirRecolhidas(chaves: string[], marcar: boolean) {
  const atual = new Set(fechadas.get());
  for (const c of chaves) {
    if (marcar) atual.add(c);
    else atual.delete(c);
  }
  fechadas.set([...atual]);
}
