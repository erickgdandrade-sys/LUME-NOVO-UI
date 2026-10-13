import { contextoNuvem } from "./contexto-nuvem";
import { createLocalStore } from "./local-store";
import type { Prova } from "./prova-schema";
import { supabase } from "./supabase";

export type ProvaSalva = { id: string; criadoEm: string; atualizadoEm: string; prova: Prova };

export const provasStore = createLocalStore<ProvaSalva[]>("lume:provas:v1", []);

type LinhaProva = { id: string; criado_em: string; atualizado_em: string; conteudo: Prova };

const tituloDe = (p: Prova) => (p.titulo.trim() || "Prova").slice(0, 200);

export async function carregarProvasDaNuvem(escola: string, usuario: string) {
  const { data, error } = await supabase()
    .from("provas")
    .select("id, criado_em, atualizado_em, conteudo")
    .eq("escola", escola)
    .eq("professor", usuario)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  provasStore.set(
    (data as LinhaProva[]).map((l) => ({
      id: l.id,
      criadoEm: l.criado_em,
      atualizadoEm: l.atualizado_em,
      prova: l.conteudo,
    })),
  );
}

export async function criarProva(prova: Prova): Promise<ProvaSalva> {
  const c = contextoNuvem();
  if (c) {
    const { data, error } = await supabase()
      .from("provas")
      .insert({ escola: c.escola, professor: c.usuario, titulo: tituloDe(prova), conteudo: prova })
      .select("id, criado_em, atualizado_em")
      .single();
    if (error) throw new Error(error.message);
    const nova: ProvaSalva = {
      id: data.id as string,
      criadoEm: data.criado_em as string,
      atualizadoEm: data.atualizado_em as string,
      prova,
    };
    provasStore.set([nova, ...provasStore.get()]);
    return nova;
  }
  const agora = new Date().toISOString();
  const nova: ProvaSalva = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    criadoEm: agora,
    atualizadoEm: agora,
    prova,
  };
  provasStore.set([nova, ...provasStore.get()]);
  return nova;
}

export async function salvarProva(id: string, prova: Prova) {
  const atualizadoEm = new Date().toISOString();
  provasStore.set(provasStore.get().map((p) => (p.id === id ? { ...p, prova, atualizadoEm } : p)));
  if (contextoNuvem()) {
    const { error } = await supabase()
      .from("provas")
      .update({ titulo: tituloDe(prova), conteudo: prova })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export async function removerProva(id: string) {
  if (contextoNuvem()) {
    const { error } = await supabase().from("provas").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  provasStore.set(provasStore.get().filter((p) => p.id !== id));
}
