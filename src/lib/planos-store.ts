import { alunosAtuais } from "./alunos-store";
import { contextoNuvem } from "./contexto-nuvem";
import { createLocalStore } from "./local-store";
import type { PlanoAdaptado } from "./plano-schema";
import { supabase } from "./supabase";

type PlanoSalvo = {
  id: string;
  criadoEm: string;
  original: string;
  resultado: PlanoAdaptado;
  nomes: Record<string, string>;
  alunosIds?: (string | null)[];
};

export const planosStore = createLocalStore<PlanoSalvo[]>("lume:planos:v1", []);

type LinhaPlano = {
  id: string;
  criado_em: string;
  plano_original: string;
  resultado: PlanoAdaptado;
  alunos_ids: (string | null)[];
};

function nomesDosAlunos(ids: (string | null)[]) {
  const alunos = new Map(alunosAtuais().map((a) => [a.id, a.nome]));
  const nomes: Record<string, string> = {};
  ids.forEach((id, i) => {
    const nome = id ? alunos.get(id) : undefined;
    if (nome) nomes[`Aluno ${i + 1}`] = nome;
  });
  return nomes;
}

const titulo = (texto: string) => {
  const linha = texto.trim().split("\n")[0] ?? "Plano de aula";
  return linha.length > 80 ? `${linha.slice(0, 77)}…` : linha;
};

export async function carregarPlanosDaNuvem(escola: string, usuario: string) {
  const { data, error } = await supabase()
    .from("planejamentos")
    .select("id, criado_em, plano_original, resultado, alunos_ids")
    .eq("escola", escola)
    .eq("professor", usuario)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  planosStore.set(
    (data as LinhaPlano[]).map((l) => ({
      id: l.id,
      criadoEm: l.criado_em,
      original: l.plano_original,
      resultado: l.resultado,
      nomes: nomesDosAlunos(l.alunos_ids),
      alunosIds: l.alunos_ids,
    })),
  );
}

export async function salvarPlano(plano: {
  original: string;
  resultado: PlanoAdaptado;
  nomes: Record<string, string>;
  alunosIds: (string | null)[];
}): Promise<PlanoSalvo> {
  const c = contextoNuvem();
  if (c) {
    const { data, error } = await supabase()
      .from("planejamentos")
      .insert({
        escola: c.escola,
        professor: c.usuario,
        titulo: titulo(plano.original),
        plano_original: plano.original,
        resultado: plano.resultado,
        alunos_ids: plano.alunosIds,
      })
      .select("id, criado_em")
      .single();
    if (error) throw new Error(error.message);
    const novo: PlanoSalvo = {
      id: data.id as string,
      criadoEm: data.criado_em as string,
      original: plano.original,
      resultado: plano.resultado,
      nomes: plano.nomes,
      alunosIds: plano.alunosIds,
    };
    planosStore.set([novo, ...planosStore.get()]);
    return novo;
  }
  const novo: PlanoSalvo = {
    original: plano.original,
    resultado: plano.resultado,
    nomes: plano.nomes,
    alunosIds: plano.alunosIds,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    criadoEm: new Date().toISOString(),
  };
  planosStore.set([novo, ...planosStore.get()]);
  return novo;
}

export async function removerPlano(id: string) {
  if (contextoNuvem()) {
    const { error } = await supabase().from("planejamentos").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  planosStore.set(planosStore.get().filter((p) => p.id !== id));
}

export async function atualizarPlano(id: string, resultado: PlanoAdaptado) {
  planosStore.set(planosStore.get().map((p) => (p.id === id ? { ...p, resultado } : p)));
  if (contextoNuvem()) {
    const { error } = await supabase().from("planejamentos").update({ resultado }).eq("id", id);
    if (error) throw new Error(error.message);
  }
}
