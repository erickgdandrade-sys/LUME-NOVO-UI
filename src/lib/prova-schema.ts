import { z } from "zod/v4";
import { AnexoSchema, PerfilAnonimoSchema } from "./plano-schema";
import { textoMatematico } from "./texto-atividade";

export const DIFICULDADES = ["facil", "media", "dificil"] as const;
export type Dificuldade = (typeof DIFICULDADES)[number];
export type TipoQuestao = "objetiva" | "dissertativa";

export const NOME_DIFICULDADE: Record<Dificuldade, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

export const QuestaoGeradaSchema = z.object({
  tipo: z.enum(["objetiva", "dissertativa"]),
  enunciado: z
    .string()
    .describe(
      "Enunciado completo, pronto para o aluno, sem número na frente. Se precisar de um texto de apoio, ele vem antes da pergunta",
    ),
  alternativas: z
    .array(z.string())
    .describe(
      "Na objetiva, as alternativas sem letra nem número na frente. Na dissertativa, lista vazia",
    ),
  correta: z
    .number()
    .int()
    .describe("Na objetiva, a posição da alternativa correta, começando em 0. Na dissertativa, -1"),
  resposta: z
    .string()
    .describe(
      "Na objetiva, por que a alternativa correta está certa, em 1 ou 2 frases. Na dissertativa, a resposta esperada e os critérios de correção",
    ),
  dificuldade: z.enum(DIFICULDADES),
  habilidade: z.string().describe("O que a questão avalia, em poucas palavras"),
});

export type QuestaoGerada = z.infer<typeof QuestaoGeradaSchema>;

export const ProvaGeradaSchema = z.object({
  titulo: z
    .string()
    .describe("Título curto, ex.: 'Avaliação de Ciências – Estados físicos da água'"),
  disciplina: z.string(),
  serie: z.string().describe("Série/ano, ou 'Não informado'"),
  instrucoes: z
    .array(z.string())
    .describe("2 a 4 instruções curtas para o aluno, em linguagem simples"),
  questoes: z.array(QuestaoGeradaSchema),
});

export type ProvaGerada = z.infer<typeof ProvaGeradaSchema>;

export type Questao = QuestaoGerada & { id: string; valor: number | null; linhas: number };

export type Cabecalho = {
  escola: string;
  professor: string;
  disciplina: string;
  turma: string;
  serie: string;
  data: string;
  valorTotal: string;
  instrucoes: string;
  camposDoAluno: boolean;
};

export type QuestaoAdaptada = {
  base: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  apoio: string;
};

export type VersaoAdaptada = {
  id: string;
  alunoId: string | null;
  rotulo: string;
  perfil: string;
  orientacoes: string[];
  questoes: QuestaoAdaptada[];
  assinatura: string;
  geradaEm: string;
};

export type Prova = {
  titulo: string;
  cabecalho: Cabecalho;
  questoes: Questao[];
  alternativas: number;
  origem: string;
  versoes?: VersaoAdaptada[];
};

export const MAX_ALUNOS_POR_VEZ = 6;

const QuestaoAdaptadaGeradaSchema = z.object({
  numero: z.number().int().describe("Número da questão na prova original, começando em 1"),
  enunciado: z.string().describe("O enunciado adaptado, pronto para o aluno, sem número na frente"),
  alternativas: z
    .array(z.string())
    .describe(
      "Na objetiva, as alternativas adaptadas, sem letra na frente. Na dissertativa, lista vazia",
    ),
  correta: z
    .number()
    .int()
    .describe(
      "Na objetiva, a posição da alternativa correta NA NOVA LISTA, começando em 0. Na dissertativa, -1",
    ),
  apoio: z
    .string()
    .describe(
      "O apoio impresso junto da questão (banco de palavras, exemplo resolvido, começo de resposta, dica visual), já pronto. Vazio se não precisar",
    ),
});

const VersaoGeradaSchema = z.object({
  aluno: z.string().describe("O rótulo do aluno exatamente como recebido, ex.: 'Aluno 1'"),
  perfil: z
    .string()
    .describe("As necessidades do aluno em poucas palavras, ex.: 'Apoio na leitura e tempo extra'"),
  orientacoes: z
    .array(z.string())
    .describe("2 a 5 orientações para a professora aplicar a prova a este aluno"),
  questoes: z.array(QuestaoAdaptadaGeradaSchema),
});

export const VersoesGeradasSchema = z.object({ versoes: z.array(VersaoGeradaSchema) });
export type VersoesGeradas = z.infer<typeof VersoesGeradasSchema>;

export type AdaptarProvaResposta =
  { ok: true; versoes: VersoesGeradas["versoes"] } | { ok: false; erro: string };

export function assinaturaDaProva(questoes: Questao[]) {
  const texto = JSON.stringify(
    questoes.map((q) => [q.id, q.tipo, q.enunciado, q.alternativas, q.correta]),
  );
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function paraVersao(
  gerada: VersoesGeradas["versoes"][number],
  questoes: Questao[],
  alunoId: string | null,
): VersaoAdaptada {
  const porNumero = new Map(gerada.questoes.map((q) => [q.numero, q]));
  return {
    id: novoIdQuestao(),
    alunoId,
    rotulo: gerada.aluno,
    perfil: gerada.perfil,
    orientacoes: gerada.orientacoes.filter((o) => o.trim()),
    assinatura: assinaturaDaProva(questoes),
    geradaEm: new Date().toISOString(),
    questoes: questoes.map((base, i) => {
      const a = porNumero.get(i + 1);
      const original = {
        base: base.id,
        enunciado: base.enunciado,
        alternativas: base.alternativas,
        correta: base.correta,
        apoio: "",
      };
      if (!a || !a.enunciado.trim()) return original;
      if (base.tipo === "dissertativa") {
        return {
          ...original,
          enunciado: textoMatematico(a.enunciado),
          apoio: textoMatematico(a.apoio.trim()),
        };
      }
      const n = normalizarQuestao(
        { ...base, enunciado: a.enunciado, alternativas: a.alternativas, correta: a.correta },
        base.alternativas.length,
      );
      if (n.tipo !== "objetiva")
        return {
          ...original,
          enunciado: textoMatematico(a.enunciado),
          apoio: textoMatematico(a.apoio.trim()),
        };
      return {
        base: base.id,
        enunciado: n.enunciado,
        alternativas: n.alternativas,
        correta: n.correta,
        apoio: textoMatematico(a.apoio.trim()),
      };
    }),
  };
}

export type QuestaoDaFolha = {
  tipo: TipoQuestao;
  enunciado: string;
  alternativas: string[];
  correta: number;
  resposta: string;
  habilidade: string;
  valor: number | null;
  linhas: number;
  apoio: string;
};

export function questoesDaFolha(prova: Prova, versao?: VersaoAdaptada): QuestaoDaFolha[] {
  const adaptadas = new Map((versao?.questoes ?? []).map((q) => [q.base, q]));
  return prova.questoes.map((q) => {
    const a = versao ? adaptadas.get(q.id) : undefined;
    return {
      tipo: q.tipo,
      enunciado: a?.enunciado ?? q.enunciado,
      alternativas: q.tipo === "objetiva" ? (a?.alternativas ?? q.alternativas) : [],
      correta: q.tipo === "objetiva" ? (a?.correta ?? q.correta) : -1,
      resposta: q.resposta,
      habilidade: q.habilidade,
      valor: q.valor,
      linhas: a && q.tipo === "dissertativa" && a.apoio ? q.linhas + 2 : q.linhas,
      apoio: a?.apoio ?? "",
    };
  });
}

export function nomeArquivo(titulo: string, extra = "") {
  const base = `${titulo || "Prova"}${extra ? ` - ${extra}` : ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return base || "Prova";
}

export const DIFICULDADES_DA_PROVA = ["facil", "media", "dificil", "misturada"] as const;
export type DificuldadeDaProva = (typeof DIFICULDADES_DA_PROVA)[number];

export const MAX_OBJETIVAS = 20;
export const MAX_DISSERTATIVAS = 10;

/** Uma prova importada pode ter alternativas de A a F. */
export const MAX_ALTERNATIVAS_IMPORTADAS = 6;

export const ConfigProvaSchema = z
  .object({
    modo: z.enum(["criar", "importar"]).default("criar"),
    pedido: z.string().trim().max(20000),
    serie: z.string().trim().max(40),
    disciplina: z.string().trim().max(60),
    objetivas: z.number().int().min(0).max(MAX_OBJETIVAS),
    dissertativas: z.number().int().min(0).max(MAX_DISSERTATIVAS),
    alternativas: z.number().int().min(3).max(5),
    dificuldade: z.enum(DIFICULDADES_DA_PROVA),
    anexos: z.array(AnexoSchema).max(3).default([]),
  })
  .refine((c) => c.modo === "importar" || c.objetivas + c.dissertativas >= 1, {
    message: "Escolha pelo menos uma questão.",
  })
  .refine((c) => c.pedido.length >= 15 || c.anexos.length > 0, {
    message: "Escreva o conteúdo da prova ou anexe um arquivo.",
  });

/** Quantas alternativas a prova usa por padrão, a partir das questões que vieram. */
export function alternativasDaProva(questoes: QuestaoGerada[], padrao = 4) {
  const maior = Math.max(0, ...questoes.map((q) => q.alternativas.length));
  return maior ? Math.min(5, Math.max(3, maior)) : padrao;
}

export type ConfigProva = z.infer<typeof ConfigProvaSchema>;

export const QuestaoEnviadaSchema = z.object({
  tipo: z.enum(["objetiva", "dissertativa"]),
  enunciado: z.string().max(4000),
  alternativas: z.array(z.string().max(1000)).max(6),
  correta: z.number().int(),
  resposta: z.string().max(4000),
  dificuldade: z.enum(DIFICULDADES),
  habilidade: z.string().max(300),
});

export const RefazerQuestaoSchema = z.object({
  acao: z.enum(["trocar_tipo", "outra"]),
  questao: QuestaoEnviadaSchema,
  titulo: z.string().max(200),
  disciplina: z.string().max(60),
  serie: z.string().max(40),
  alternativas: z.number().int().min(3).max(5),
  outras: z.array(z.string().max(600)).max(30),
});

export type RefazerQuestao = z.infer<typeof RefazerQuestaoSchema>;

export const AdaptarProvaSchema = z.object({
  titulo: z.string().max(200),
  disciplina: z.string().max(60),
  serie: z.string().max(40),
  questoes: z.array(QuestaoEnviadaSchema).min(1).max(30),
  alunos: z.array(PerfilAnonimoSchema).min(1).max(MAX_ALUNOS_POR_VEZ),
});

export type AdaptarProva = z.infer<typeof AdaptarProvaSchema>;

export type GerarProvaResposta = { ok: true; prova: ProvaGerada } | { ok: false; erro: string };
export type RefazerQuestaoResposta =
  { ok: true; questao: QuestaoGerada } | { ok: false; erro: string };

export const LETRAS = ["A", "B", "C", "D", "E", "F"];

export function linhasPadrao(dificuldade: Dificuldade) {
  return dificuldade === "dificil" ? 8 : dificuldade === "media" ? 6 : 4;
}

export function normalizarQuestao(bruta: QuestaoGerada, alternativas: number): QuestaoGerada {
  const q = {
    ...bruta,
    enunciado: textoMatematico(bruta.enunciado),
    resposta: textoMatematico(bruta.resposta),
    alternativas: bruta.alternativas.map(textoMatematico),
  };
  const dificuldade = DIFICULDADES.includes(q.dificuldade) ? q.dificuldade : "media";
  if (q.tipo === "dissertativa") {
    return { ...q, dificuldade, alternativas: [], correta: -1 };
  }
  const limpas = q.alternativas
    .map((a) => a.replace(/^\s*(?:\(?[A-Fa-f][).:-]|[A-Fa-f]\s+-)\s+/, "").trim())
    .filter(Boolean)
    .slice(0, Math.max(alternativas, 2));
  if (limpas.length < 2) {
    return { ...q, dificuldade, tipo: "dissertativa", alternativas: [], correta: -1 };
  }
  const correta = q.correta >= 0 && q.correta < limpas.length ? q.correta : 0;
  return { ...q, dificuldade, alternativas: limpas, correta };
}

let contador = 0;
export function novoIdQuestao() {
  contador += 1;
  return `q${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function paraQuestao(q: QuestaoGerada, alternativas: number): Questao {
  const n = normalizarQuestao(q, alternativas);
  return { ...n, id: novoIdQuestao(), valor: null, linhas: linhasPadrao(n.dificuldade) };
}

export function questaoEmBranco(tipo: TipoQuestao, alternativas: number): Questao {
  return {
    id: novoIdQuestao(),
    tipo,
    enunciado: "",
    alternativas: tipo === "objetiva" ? Array.from({ length: alternativas }, () => "") : [],
    correta: tipo === "objetiva" ? 0 : -1,
    resposta: "",
    dificuldade: "media",
    habilidade: "",
    valor: null,
    linhas: linhasPadrao("media"),
  };
}

export function cabecalhoVazio(): Cabecalho {
  return {
    escola: "",
    professor: "",
    disciplina: "",
    turma: "",
    serie: "",
    data: "",
    valorTotal: "",
    instrucoes: "",
    camposDoAluno: true,
  };
}

export function numero(texto: string): number | null {
  const n = Number(texto.replace(",", ".").trim());
  return texto.trim() && Number.isFinite(n) && n >= 0 ? n : null;
}

export function formatarValor(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "").replace(".", ",");
}

export function dividirValor(total: number, quantidade: number): number[] {
  if (quantidade <= 0) return [];
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / quantidade);
  const sobra = centavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => (base + (i < sobra ? 1 : 0)) / 100);
}
