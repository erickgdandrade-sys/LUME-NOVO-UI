import { todasAsLicoes, trilhas, type Trilha } from "./capacitacao-trilhas";
import { avisarMudancaDeProgresso } from "./contexto-nuvem";
import { createLocalStore } from "./local-store";
import { registrarAtividade } from "./progresso-store";

export type Conclusao = { acertosDePrimeira: number; total: number; em: string };
type Estado = { concluidas: Record<string, Conclusao> };

export const capacitacaoStore = createLocalStore<Estado>("lume:capacitacao:v1", { concluidas: {} });

export const useCapacitacao = capacitacaoStore.use;

export const XP_POR_PERGUNTA = 10;
export const XP_LICAO = 20;

export type EstadoLicao = "concluida" | "atual" | "bloqueada";

export function estadoDasLicoes(concluidas: Record<string, Conclusao>) {
  const estados = new Map<string, EstadoLicao>();
  let liberada = true;
  for (const licao of todasAsLicoes) {
    if (concluidas[licao.id]) estados.set(licao.id, "concluida");
    else if (liberada) {
      estados.set(licao.id, "atual");
      liberada = false;
    } else estados.set(licao.id, "bloqueada");
  }
  return estados;
}

export function estadoDaTrilha(
  trilha: Trilha,
  estados: Map<string, EstadoLicao>,
): "concluida" | "em-andamento" | "bloqueada" {
  const lista = trilha.licoes.map((l) => estados.get(l.id));
  if (lista.every((e) => e === "concluida")) return "concluida";
  if (lista.every((e) => e === "bloqueada")) return "bloqueada";
  return "em-andamento";
}

export function licaoAtual(concluidas: Record<string, Conclusao>) {
  const estados = estadoDasLicoes(concluidas);
  return todasAsLicoes.find((l) => estados.get(l.id) === "atual") ?? null;
}

export function resumoCapacitacao(concluidas: Record<string, Conclusao>) {
  const feitas = todasAsLicoes.filter((l) => concluidas[l.id]).length;
  const trilhasConcluidas = trilhas.filter((t) => t.licoes.every((l) => concluidas[l.id])).length;
  return {
    feitas,
    total: todasAsLicoes.length,
    trilhasConcluidas,
    totalTrilhas: trilhas.length,
    pct: Math.round((feitas / todasAsLicoes.length) * 100),
  };
}

export function concluirLicao(licaoId: string, acertosDePrimeira: number, total: number) {
  const atual = capacitacaoStore.get();
  const jaFeita = Boolean(atual.concluidas[licaoId]);
  const anterior = atual.concluidas[licaoId]?.acertosDePrimeira ?? 0;
  capacitacaoStore.set({
    concluidas: {
      ...atual.concluidas,
      [licaoId]: {
        acertosDePrimeira: Math.max(anterior, acertosDePrimeira),
        total,
        em: new Date().toISOString(),
      },
    },
  });
  avisarMudancaDeProgresso();
  const xp = jaFeita
    ? Math.round((acertosDePrimeira * XP_POR_PERGUNTA) / 2)
    : acertosDePrimeira * XP_POR_PERGUNTA + XP_LICAO;
  registrarAtividade(xp);
  return xp;
}
