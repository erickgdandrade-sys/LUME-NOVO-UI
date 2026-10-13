import { useSyncExternalStore } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { contextoNuvem } from "./contexto-nuvem";
import { alunos as alunosExemplo, type Aluno } from "./lume-data";
import { estaSomenteNaMemoria } from "./local-store";
import type { PerfilAnonimo } from "./plano-schema";
import { registrarAtividade } from "./progresso-store";
import { supabase } from "./supabase";

const CHAVE = "lume:alunos:v1";

export const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export type AlunoDados = Omit<
  Aluno,
  "id" | "atualizado" | "evolucao" | "historico" | "exemplo" | "turma"
> & { turma?: string | null };

let cache: Aluno[] | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());

function ler(): Aluno[] {
  if (cache) return cache;
  if (estaSomenteNaMemoria()) {
    cache = [];
    return cache;
  }
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lista: unknown = bruto ? JSON.parse(bruto) : null;
    cache = Array.isArray(lista) ? (lista as Aluno[]) : alunosExemplo;
  } catch {
    cache = alunosExemplo;
  }
  return cache;
}

function guardar(lista: Aluno[]) {
  cache = lista;
  if (!estaSomenteNaMemoria()) {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(lista));
    } catch {}
  }
  avisar();
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const aoMudarStorage = (e: StorageEvent) => {
    if (e.key === CHAVE && !estaSomenteNaMemoria()) {
      cache = null;
      ouvinte();
    }
  };
  window.addEventListener("storage", aoMudarStorage);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", aoMudarStorage);
  };
}

export function useAlunos(): Aluno[] {
  return useSyncExternalStore(inscrever, ler, () => alunosExemplo);
}

export function useAluno(id: string): Aluno | undefined {
  return useAlunos().find((a) => a.id === id);
}

export function alunosAtuais() {
  return ler();
}

export function esquecerAlunos() {
  cache = null;
  avisar();
}

const dataCurta = (d: Date) => format(d, "dd 'de' MMMM", { locale: ptBR });

function slug(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "aluno"
  );
}

type LinhaAluno = {
  id: string;
  turma: string | null;
  nome: string;
  idade: number | null;
  serie: string | null;
  suporte: Aluno["suporte"];
  necessidades: string[];
  diagnosticos: string[];
  resumo: string;
  caracteristicas: string[];
  preferencias: string[];
  sensorial: string[];
  funcionam: string[];
  nao_funcionam: string[];
  familia: string;
  exemplo: boolean;
  foto: string | null;
  atualizado_em: string;
  anotacoes_aluno?: { titulo: string; texto: string; criado_em: string }[];
  participacoes?: { mes: string; participacao: number }[];
};

const COLUNAS =
  "id, turma, nome, idade, serie, suporte, necessidades, diagnosticos, resumo, caracteristicas, preferencias, sensorial, funcionam, nao_funcionam, familia, exemplo, foto, atualizado_em, anotacoes_aluno(titulo, texto, criado_em), participacoes(mes, participacao)";

export function mesDoRotulo(rotulo: string, ano = new Date().getFullYear()) {
  const i = MESES.indexOf(rotulo as (typeof MESES)[number]);
  return `${ano}-${String(i + 1).padStart(2, "0")}-01`;
}

function deLinha(l: LinhaAluno): Aluno {
  return {
    id: l.id,
    turma: l.turma,
    nome: l.nome,
    serie: l.serie ?? "",
    idade: l.idade ?? 0,
    atualizado: dataCurta(new Date(l.atualizado_em)),
    suporte: l.suporte,
    necessidades: l.necessidades,
    tags: l.diagnosticos,
    resumo: l.resumo,
    caracteristicas: l.caracteristicas,
    preferencias: l.preferencias,
    sensorial: l.sensorial,
    funcionam: l.funcionam,
    naoFuncionam: l.nao_funcionam,
    familia: l.familia,
    exemplo: l.exemplo,
    foto: l.foto,
    historico: [...(l.anotacoes_aluno ?? [])]
      .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
      .map(({ titulo, texto }) => ({ titulo, texto })),
    evolucao: [...(l.participacoes ?? [])]
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((p) => ({
        mes: MESES[Number(p.mes.slice(5, 7)) - 1] ?? "Jan",
        participacao: p.participacao,
      })),
  };
}

export function paraLinha(dados: AlunoDados) {
  return {
    nome: dados.nome.trim(),
    idade: dados.idade >= 2 && dados.idade <= 20 ? dados.idade : null,
    serie: dados.serie || null,
    suporte: dados.suporte,
    necessidades: dados.necessidades ?? [],
    diagnosticos: dados.tags,
    resumo: dados.resumo,
    caracteristicas: dados.caracteristicas,
    preferencias: dados.preferencias,
    sensorial: dados.sensorial,
    funcionam: dados.funcionam,
    nao_funcionam: dados.naoFuncionam,
    familia: dados.familia,
    ...(dados.foto === undefined ? {} : { foto: dados.foto }),
  };
}

function exigirNuvem() {
  const c = contextoNuvem();
  if (!c) throw new Error("Sem conexão com a sua conta.");
  return c;
}

export async function carregarAlunosDaNuvem(escola: string) {
  const { data, error } = await supabase()
    .from("alunos")
    .select(COLUNAS)
    .eq("escola", escola)
    .order("nome");
  if (error) throw new Error(error.message);
  cache = (data as unknown as LinhaAluno[]).map(deLinha);
  avisar();
}

export async function adicionarAluno(dados: AlunoDados, exemplo = false): Promise<Aluno> {
  const c = contextoNuvem();
  if (c) {
    const { data, error } = await supabase()
      .from("alunos")
      .insert({
        ...paraLinha(dados),
        escola: c.escola,
        turma: dados.turma ?? null,
        criado_por: c.usuario,
        exemplo,
      })
      .select(COLUNAS)
      .single();
    if (error) throw new Error(error.message);
    const aluno = deLinha(data as unknown as LinhaAluno);
    guardar([aluno, ...ler()]);
    return aluno;
  }
  const lista = ler();
  const base = slug(dados.nome);
  let id = base;
  for (let n = 2; lista.some((a) => a.id === id); n++) id = `${base}-${n}`;
  const aluno: Aluno = {
    ...dados,
    id,
    turma: null,
    atualizado: dataCurta(new Date()),
    evolucao: [],
    historico: [],
  };
  guardar([aluno, ...lista]);
  return aluno;
}

export async function atualizarAluno(id: string, dados: AlunoDados) {
  if (contextoNuvem()) {
    const { data, error } = await supabase()
      .from("alunos")
      .update({ ...paraLinha(dados), turma: dados.turma ?? null })
      .eq("id", id)
      .select(COLUNAS)
      .single();
    if (error) throw new Error(error.message);
    const aluno = deLinha(data as unknown as LinhaAluno);
    guardar(ler().map((a) => (a.id === id ? aluno : a)));
    return;
  }
  guardar(
    ler().map((a) => (a.id === id ? { ...a, ...dados, atualizado: dataCurta(new Date()) } : a)),
  );
}

export async function removerAluno(id: string) {
  if (contextoNuvem()) {
    const { error } = await supabase().from("alunos").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  guardar(ler().filter((a) => a.id !== id));
}

export async function registrarParticipacao(id: string, mes: string, participacao: number) {
  const c = contextoNuvem();
  if (c) {
    const { error } = await supabase()
      .from("participacoes")
      .upsert(
        { aluno: id, mes: mesDoRotulo(mes), participacao, registrado_por: c.usuario },
        { onConflict: "aluno,mes" },
      );
    if (error) throw new Error(error.message);
  }
  const ordem = (m: string) => MESES.indexOf(m as (typeof MESES)[number]);
  guardar(
    ler().map((a) => {
      if (a.id !== id) return a;
      const evolucao = [...a.evolucao.filter((e) => e.mes !== mes), { mes, participacao }].sort(
        (x, y) => ordem(x.mes) - ordem(y.mes),
      );
      return { ...a, evolucao, atualizado: dataCurta(new Date()) };
    }),
  );
  registrarAtividade();
}

export async function adicionarNota(id: string, titulo: string, texto: string) {
  const c = contextoNuvem();
  if (c) {
    const { error } = await supabase()
      .from("anotacoes_aluno")
      .insert({ aluno: id, autor: c.usuario, titulo, texto });
    if (error) throw new Error(error.message);
  }
  guardar(
    ler().map((a) =>
      a.id === id
        ? {
            ...a,
            historico: [...a.historico, { titulo, texto }],
            atualizado: dataCurta(new Date()),
          }
        : a,
    ),
  );
  registrarAtividade();
}

export async function carregarExemplosNaNuvem() {
  exigirNuvem();
  const atuais = ler();
  for (const e of alunosExemplo) {
    if (atuais.some((a) => a.exemplo && a.nome === e.nome)) continue;
    await adicionarAluno(e, true);
  }
}

export async function adicionarAoQueFunciona(id: string, texto: string) {
  const aluno = ler().find((x) => x.id === id);
  if (!aluno) throw new Error("Aluno não encontrado.");
  if (aluno.funcionam.includes(texto)) return;
  const { id: _id, atualizado: _a, evolucao: _e, historico: _h, exemplo: _x, ...dados } = aluno;
  await atualizarAluno(id, { ...dados, funcionam: [...aluno.funcionam, texto] });
}

export function necessidadesDe(aluno: Aluno) {
  return aluno.necessidades ?? [];
}

export function perfilAnonimoDe(a: Aluno, rotulo: string): PerfilAnonimo {
  return {
    rotulo,
    serie: a.serie,
    suporte: a.suporte,
    necessidades: necessidadesDe(a),
    tags: a.tags,
    funcionam: a.funcionam,
    naoFuncionam: a.naoFuncionam,
    sensorial: a.sensorial,
    preferencias: a.preferencias,
    caracteristicas: a.caracteristicas,
  };
}
