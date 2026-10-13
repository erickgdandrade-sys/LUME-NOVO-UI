import { useEffect } from "react";
import { carregarAlunosDaNuvem, esquecerAlunos } from "./alunos-store";
import { capacitacaoStore, type Conclusao } from "./capacitacao-store";
import { definirAoMudarProgresso, definirContextoNuvem } from "./contexto-nuvem";
import { estrategiasSalvasStore } from "./estrategias-salvas";
import { createLocalStore, usarSomenteMemoria } from "./local-store";
import { carregarPlanosDaNuvem, planosStore } from "./planos-store";
import { carregarProvasDaNuvem, provasStore } from "./provas-store";
import { progressoStore } from "./progresso-store";
import { contasReais, supabase } from "./supabase";

if (contasReais) usarSomenteMemoria(true);

export type Turma = { id: string; nome: string; serie: string | null; disciplina: string | null };

type Estado = { situacao: "parada" | "carregando" | "pronta" | "erro"; usuario: string | null };

const estadoStore = createLocalStore<Estado>("lume:nuvem-estado", {
  situacao: "parada",
  usuario: null,
});
const turmasStore = createLocalStore<Turma[]>("lume:nuvem-turmas", []);

export const useEstadoNuvem = estadoStore.use;
export const useMinhasTurmas = turmasStore.use;

type LinhaProgresso = {
  xp: number;
  dias: string[];
  respostas: number;
  acertos: number;
  licoes: Record<string, Conclusao>;
  estrategias_salvas: string[];
};

let espera: ReturnType<typeof setTimeout> | null = null;
let usuarioAtual: string | null = null;
let chaveAtual = "";

function agendarSalvarProgresso() {
  if (!usuarioAtual) return;
  if (espera) clearTimeout(espera);
  const usuario = usuarioAtual;
  espera = setTimeout(() => {
    const p = progressoStore.get();
    void supabase()
      .from("progresso_professor")
      .upsert({
        usuario,
        xp: p.xp,
        dias: p.dias,
        respostas: p.respostas,
        acertos: p.acertos,
        licoes: capacitacaoStore.get().concluidas,
        estrategias_salvas: estrategiasSalvasStore.get(),
      })
      .select("xp")
      .single()
      .then(({ data, error }) => {
        if (error) return console.error("progresso: não salvou", error.message);
        // O banco limita quanto XP entra por vez e por dia; desconta o que ele não aceitou.
        const salvo = (data as { xp: number } | null)?.xp;
        if (salvo === undefined || salvo >= p.xp) return;
        const atual = progressoStore.get();
        progressoStore.set({ ...atual, xp: Math.max(salvo, atual.xp - (p.xp - salvo)) });
      });
  }, 800);
}

async function carregarProgresso(usuario: string) {
  const { data, error } = await supabase()
    .from("progresso_professor")
    .select("xp, dias, respostas, acertos, licoes, estrategias_salvas")
    .eq("usuario", usuario)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const p = data as LinhaProgresso | null;
  progressoStore.set({
    xp: p?.xp ?? 0,
    dias: p?.dias ?? [],
    respostas: p?.respostas ?? 0,
    acertos: p?.acertos ?? 0,
  });
  capacitacaoStore.set({ concluidas: p?.licoes ?? {} });
  estrategiasSalvasStore.set(p?.estrategias_salvas ?? []);
}

async function carregarTurmas(escola: string, usuario: string) {
  const { data, error } = await supabase()
    .from("turma_professores")
    .select("disciplina, turmas!inner(id, nome, serie, ativa, escola)")
    .eq("professor", usuario)
    .eq("turmas.escola", escola)
    .eq("turmas.ativa", true);
  if (error) throw new Error(error.message);
  const linhas = data as unknown as {
    disciplina: string | null;
    turmas: { id: string; nome: string; serie: string | null };
  }[];
  turmasStore.set(
    linhas
      .map((l) => ({
        id: l.turmas.id,
        nome: l.turmas.nome,
        serie: l.turmas.serie,
        disciplina: l.disciplina,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  );
}

export async function recarregarNuvem() {
  const atual = estadoStore.get();
  const [usuario, escola] = chaveAtual.split("|");
  if (!usuario || !escola || atual.situacao === "parada") return;
  await ativar(usuario, escola);
}

async function ativar(usuario: string, escola: string) {
  definirAoMudarProgresso(null);
  usuarioAtual = null;
  definirContextoNuvem({ usuario, escola });
  estadoStore.set({ situacao: "carregando", usuario });
  try {
    await Promise.all([
      carregarAlunosDaNuvem(escola),
      carregarProgresso(usuario),
      carregarTurmas(escola, usuario),
    ]);
    await carregarPlanosDaNuvem(escola, usuario);
    await carregarProvasDaNuvem(escola, usuario).catch((e: unknown) =>
      console.error("nuvem: não carregou as provas", e),
    );
    usuarioAtual = usuario;
    definirAoMudarProgresso(agendarSalvarProgresso);
    estadoStore.set({ situacao: "pronta", usuario });
  } catch (e) {
    console.error("nuvem: não carregou os dados", e);
    estadoStore.set({ situacao: "erro", usuario });
  }
}

function desativar() {
  definirAoMudarProgresso(null);
  definirContextoNuvem(null);
  usuarioAtual = null;
  chaveAtual = "";
  esquecerAlunos();
  planosStore.set([]);
  provasStore.set([]);
  turmasStore.set([]);
  estadoStore.set({ situacao: "parada", usuario: null });
}

export function useSincronizarNuvem(escolaDoProfessor: string | null) {
  useEffect(() => {
    if (!contasReais) return;
    if (!escolaDoProfessor) {
      if (chaveAtual) desativar();
      return;
    }
    let cancelado = false;
    void supabase()
      .auth.getSession()
      .then(({ data }) => {
        const usuario = data.session?.user.id;
        if (cancelado || !usuario) return;
        const chave = `${usuario}|${escolaDoProfessor}`;
        if (chave === chaveAtual) return;
        chaveAtual = chave;
        void ativar(usuario, escolaDoProfessor);
      });
    return () => {
      cancelado = true;
    };
  }, [escolaDoProfessor]);
}
