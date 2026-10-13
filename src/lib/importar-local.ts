import { adicionarAluno, adicionarNota, registrarParticipacao } from "./alunos-store";
import { capacitacaoStore, type Conclusao } from "./capacitacao-store";
import { avisarMudancaDeProgresso } from "./contexto-nuvem";
import type { Aluno } from "./lume-data";
import { lerDoNavegador } from "./local-store";
import type { PlanoAdaptado } from "./plano-schema";
import { salvarPlano } from "./planos-store";
import { progressoStore, type Progresso } from "./progresso-store";

type PlanoLocal = { original: string; resultado: PlanoAdaptado; nomes: Record<string, string> };

const marca = (usuario: string) => `lume:importado:${usuario}`;

export function dadosNoNavegador(usuario: string) {
  if (lerDoNavegador<boolean>(marca(usuario))) return null;
  const alunos = (lerDoNavegador<Aluno[]>("lume:alunos:v1") ?? []).filter((a) => !a.exemplo);
  const planos = lerDoNavegador<PlanoLocal[]>("lume:planos:v1") ?? [];
  const licoes = Object.keys(
    lerDoNavegador<{ concluidas: Record<string, Conclusao> }>("lume:capacitacao:v1")?.concluidas ??
      {},
  ).length;
  if (!alunos.length && !planos.length && !licoes) return null;
  return { alunos: alunos.length, planos: planos.length, licoes };
}

export function naoImportar(usuario: string) {
  try {
    window.localStorage.setItem(marca(usuario), "true");
  } catch {}
}

export async function importarDoNavegador(usuario: string, turma: string | null) {
  const alunos = (lerDoNavegador<Aluno[]>("lume:alunos:v1") ?? []).filter((a) => !a.exemplo);
  const idsPorNome = new Map<string, string>();
  for (const a of alunos) {
    const novo = await adicionarAluno({ ...a, turma });
    idsPorNome.set(a.nome, novo.id);
    for (const nota of a.historico) await adicionarNota(novo.id, nota.titulo, nota.texto);
    for (const e of a.evolucao) await registrarParticipacao(novo.id, e.mes, e.participacao);
  }

  for (const p of (lerDoNavegador<PlanoLocal[]>("lume:planos:v1") ?? []).reverse()) {
    const rotulos = Object.keys(p.nomes);
    const total = Math.max(0, ...rotulos.map((r) => Number(r.replace(/\D/g, "")) || 0));
    const alunosIds = Array.from(
      { length: total },
      (_, i) => idsPorNome.get(p.nomes[`Aluno ${i + 1}`] ?? "") ?? null,
    );
    await salvarPlano({ ...p, alunosIds });
  }

  const local = lerDoNavegador<Progresso>("lume:progresso:v1");
  const licoesLocais =
    lerDoNavegador<{ concluidas: Record<string, Conclusao> }>("lume:capacitacao:v1")?.concluidas ??
    {};
  const atual = progressoStore.get();
  if (local) {
    progressoStore.set({
      xp: Math.max(atual.xp, local.xp),
      dias: [...new Set([...atual.dias, ...local.dias])].sort().slice(-400),
      respostas: Math.max(atual.respostas, local.respostas),
      acertos: Math.max(atual.acertos, local.acertos),
    });
  }
  capacitacaoStore.set({ concluidas: { ...licoesLocais, ...capacitacaoStore.get().concluidas } });
  avisarMudancaDeProgresso();
  naoImportar(usuario);
}
