import { avisarMudancaDeProgresso } from "./contexto-nuvem";
import { createLocalStore } from "./local-store";

export type Progresso = { xp: number; dias: string[]; respostas: number; acertos: number };

export const progressoStore = createLocalStore<Progresso>("lume:progresso:v1", {
  xp: 0,
  dias: [],
  respostas: 0,
  acertos: 0,
});

export const useProgresso = progressoStore.use;

export const XP_POR_NIVEL = 200;
export const XP_PLANO = 30;

function diaLocal(data: Date) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function registrarAtividade(xp = 0) {
  const atual = progressoStore.get();
  const hoje = diaLocal(new Date());
  const dias = atual.dias.includes(hoje) ? atual.dias : [...atual.dias, hoje].slice(-400);
  progressoStore.set({ ...atual, xp: atual.xp + xp, dias });
  avisarMudancaDeProgresso();
}

export function registrarResposta(acertou: boolean) {
  registrarAtividade();
  const atual = progressoStore.get();
  progressoStore.set({
    ...atual,
    respostas: atual.respostas + 1,
    acertos: atual.acertos + (acertou ? 1 : 0),
  });
  avisarMudancaDeProgresso();
}

export function sequenciaDias(dias: string[]) {
  const ativos = new Set(dias);
  const cursor = new Date();
  if (!ativos.has(diaLocal(cursor))) cursor.setDate(cursor.getDate() - 1);
  let total = 0;
  while (ativos.has(diaLocal(cursor))) {
    total++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return total;
}

export function nivel(xp: number) {
  return Math.floor(xp / XP_POR_NIVEL) + 1;
}

export function textoSequencia(dias: number) {
  if (dias === 0) return "Comece sua sequência hoje";
  return dias === 1 ? "1 dia seguido" : `${dias} dias seguidos`;
}
