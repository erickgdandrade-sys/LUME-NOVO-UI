import { useEffect, useSyncExternalStore } from "react";
import {
  COLUNAS_DA_ESCOLA,
  cabecalhoDaEscola,
  type CabecalhoDaEscola,
  type DadosDaEscola,
} from "./escola-cabecalho";
import { contasReais, supabase } from "./supabase";

const cache = new Map<string, DadosDaEscola | null>();
const carregando = new Set<string>();
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());

export async function carregarDadosDaEscola(id: string): Promise<DadosDaEscola | null> {
  const { data, error } = await supabase()
    .from("escolas")
    .select(COLUNAS_DA_ESCOLA)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const dados = (data as DadosDaEscola | null) ?? null;
  cache.set(id, dados);
  avisar();
  return dados;
}

export async function salvarDadosDaEscola(
  id: string,
  dados: Omit<DadosDaEscola, "id">,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { error } = await supabase()
    .from("escolas")
    .update({
      nome: dados.nome.trim(),
      cidade: dados.cidade?.trim() || null,
      uf: dados.uf?.trim().toUpperCase() || null,
      endereco: dados.endereco?.trim() || null,
      telefone: dados.telefone?.trim() || null,
      email_contato: dados.email_contato?.trim() || null,
      inep: dados.inep?.trim() || null,
      linha_superior: dados.linha_superior?.trim() || null,
      logo_url: dados.logo_url || null,
      logo_secundario: dados.logo_secundario || null,
      cabecalho_modo: dados.cabecalho_modo,
      cabecalho_imagem: dados.cabecalho_imagem || null,
    })
    .eq("id", id);
  if (error) {
    console.error("escola: não salvou", error.message);
    return { ok: false, erro: "Não foi possível salvar. Confira os dados e tente de novo." };
  }
  await carregarDadosDaEscola(id);
  return { ok: true };
}

function assinar(o: () => void) {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}

export function useDadosDaEscola(id: string | null): DadosDaEscola | null {
  const dados = useSyncExternalStore(
    assinar,
    () => (id ? (cache.get(id) ?? null) : null),
    () => null,
  );
  useEffect(() => {
    if (!id || !contasReais || cache.has(id) || carregando.has(id)) return;
    carregando.add(id);
    carregarDadosDaEscola(id)
      .catch((e: unknown) => console.error("escola: não carregou", e))
      .finally(() => carregando.delete(id));
  }, [id]);
  return dados;
}

export function useCabecalhoDaEscola(id: string | null): CabecalhoDaEscola | null {
  const dados = useDadosDaEscola(id);
  return dados ? cabecalhoDaEscola(dados) : null;
}

const LARGURA_MAXIMA = 600;
const ALTURA_MAXIMA = 240;

export async function prepararLogo(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LARGURA_MAXIMA / bitmap.width, ALTURA_MAXIMA / bitmap.height);
  const tela = document.createElement("canvas");
  tela.width = Math.max(1, Math.round(bitmap.width * escala));
  tela.height = Math.max(1, Math.round(bitmap.height * escala));
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.drawImage(bitmap, 0, 0, tela.width, tela.height);
  const png = tela.toDataURL("image/png");
  if (png.length > 300000) throw new Error("logo grande demais");
  return png;
}
