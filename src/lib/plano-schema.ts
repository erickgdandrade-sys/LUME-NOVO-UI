import { z } from "zod/v4";
import { textoMatematico } from "./texto-atividade";

export const EtapaSchema = z.object({
  titulo: z.string().describe("Nome da etapa com o tempo, ex.: 'Abertura (10 min)'"),
  descricao: z
    .string()
    .describe(
      "O passo a passo da etapa em 3 a 6 frases: o que a professora faz e fala (com exemplos de perguntas ou falas) e o que os alunos fazem",
    ),
  inclusao: z
    .string()
    .describe("Como garantir, nessa etapa, que todos participem — 1 a 3 frases concretas"),
});

export const AtividadeSchema = z.object({
  titulo: z.string(),
  enunciado: z.string().describe("Enunciado exatamente como será entregue aos alunos"),
  itens: z
    .array(z.string())
    .describe(
      "5 a 8 questões ou tarefas prontas, com o conteúdo real. Sem número na frente. Se uma questão tiver partes (a, b, c), elas ficam dentro do mesmo item",
    ),
  versaoAdaptada: z
    .array(z.string())
    .describe(
      "A MESMA atividade já reescrita na versão com mais apoio, pronta para entregar: os itens com o conteúdo real, em linguagem mais simples, com exemplo resolvido no primeiro item e passos menores. Sem mudar o objetivo",
    ),
  apoios: z
    .array(z.string())
    .describe(
      "O que acompanha a versão com mais apoio, já pronto: o banco de palavras, a legenda das imagens, o exemplo resolvido, a régua de números etc.",
    ),
});

export const AdaptacaoSchema = z.object({
  aluno: z.string().describe("Rótulo recebido (ex.: 'Aluno 1') ou vazio se for por perfil"),
  perfil: z.string().describe("Necessidades do aluno, ex.: 'Apoio visual e tempo extra'"),
  itens: z
    .array(z.string())
    .describe("3 a 6 ações concretas, cada uma dizendo o que fazer e em que momento da aula"),
  atividade: z
    .array(z.string())
    .describe(
      "A atividade principal reescrita para este aluno, pronta para entregar: os MESMOS itens da atividade principal, na mesma quantidade e cobrando as mesmas habilidades, com o conteúdo real, aproveitando os interesses e as preferências dele e respeitando o que evitar. Sem número na frente",
    ),
});

export const PlanoAdaptadoSchema = z.object({
  titulo: z.string().describe("Título curto, ex.: 'Plano de aula – Matemática'"),
  disciplina: z.string(),
  serie: z.string().describe("Série/ano, ou 'Não informado'"),
  duracao: z.string().describe("Duração estimada, ex.: '50 minutos'"),
  objetivo: z.string().describe("Objetivo geral da aula"),
  objetivosEspecificos: z
    .array(z.string())
    .describe("3 a 5 objetivos específicos com verbos observáveis (identificar, explicar…)"),
  habilidadesBncc: z
    .array(z.string())
    .describe(
      "Habilidades da BNCC no formato 'EF04LP07 – descrição'. Só cite um código se tiver certeza; se não tiver, descreva a habilidade sem código",
    ),
  conteudos: z.array(z.string()).describe("Conteúdos trabalhados na aula"),
  materiais: z.array(z.string()).describe("Materiais necessários, comuns em escola pública"),
  estrategias: z
    .array(z.string())
    .describe("4 a 6 estratégias inclusivas para a turma toda, dizendo como aplicar cada uma"),
  etapas: z
    .array(EtapaSchema)
    .describe("4 a 6 etapas em sequência, com tempos que somam a duração da aula"),
  atividade: AtividadeSchema.describe("A atividade principal da aula, pronta para usar"),
  avaliacao: z
    .array(z.string())
    .describe(
      "Como avaliar: critérios observáveis, instrumento e formas alternativas de o aluno mostrar o que aprendeu",
    ),
  adaptacoes: z.array(AdaptacaoSchema).describe("Adaptações específicas por aluno ou perfil"),
  barreiras: z.array(z.string()).describe("Barreiras que o plano original tinha e como evitá-las"),
  recomendacoes: z.array(z.string()),
  recursos: z
    .array(z.string())
    .describe("Recursos complementares: jogos, vídeos, materiais para imprimir"),
});

export type PlanoAdaptado = z.infer<typeof PlanoAdaptadoSchema>;

const NUMERO_NA_FRENTE = /^\s*(?:\d{1,2}\s*[.)]\s+)+/;
const PARTE_DE_QUESTAO = /^\s*\(?[a-h]\)\s+/i;

export function limparItens(itens: string[]): string[] {
  const saida: string[] = [];
  for (const bruto of itens) {
    const item = bruto.replace(NUMERO_NA_FRENTE, "").trim();
    if (!item) continue;
    if (PARTE_DE_QUESTAO.test(item) && saida.length) {
      saida[saida.length - 1] = `${saida[saida.length - 1]}\n${item}`;
    } else {
      saida.push(item);
    }
  }
  return saida;
}

function textosLegiveis<T>(valor: T): T {
  if (typeof valor === "string") return textoMatematico(valor) as T;
  if (Array.isArray(valor)) return valor.map(textosLegiveis) as T;
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, textosLegiveis(v)])) as T;
  }
  return valor;
}

export function completarPlano(plano: PlanoAdaptado): PlanoAdaptado {
  const p = textosLegiveis(plano) as Partial<PlanoAdaptado>;
  return {
    ...(p as PlanoAdaptado),
    objetivosEspecificos: p.objetivosEspecificos ?? [],
    habilidadesBncc: p.habilidadesBncc ?? [],
    conteudos: p.conteudos ?? [],
    materiais: p.materiais ?? [],
    estrategias: p.estrategias ?? [],
    etapas: (p.etapas ?? []).map((e) => ({ ...e, inclusao: (e as Partial<Etapa>).inclusao ?? "" })),
    atividade: {
      titulo: p.atividade?.titulo ?? "",
      enunciado: p.atividade?.enunciado ?? "",
      itens: limparItens(p.atividade?.itens ?? []),
      versaoAdaptada: limparItens(p.atividade?.versaoAdaptada ?? []),
      apoios: p.atividade?.apoios ?? [],
    },
    avaliacao: p.avaliacao ?? [],
    adaptacoes: (p.adaptacoes ?? []).map((a) => ({
      ...a,
      atividade: limparItens(a.atividade ?? []),
    })),
    barreiras: p.barreiras ?? [],
    recomendacoes: p.recomendacoes ?? [],
    recursos: p.recursos ?? [],
  };
}

export const PerfilAnonimoSchema = z.object({
  rotulo: z.string().max(20),
  serie: z.string().max(40),
  suporte: z.string().max(10),
  necessidades: z.array(z.string().max(60)).max(20),
  tags: z.array(z.string().max(60)).max(20),
  funcionam: z.array(z.string().max(300)).max(20),
  naoFuncionam: z.array(z.string().max(300)).max(20),
  sensorial: z.array(z.string().max(300)).max(20),
  preferencias: z.array(z.string().max(300)).max(20).default([]),
  caracteristicas: z.array(z.string().max(300)).max(20).default([]),
});

export type PerfilAnonimo = z.infer<typeof PerfilAnonimoSchema>;

export const TIPOS_DE_ANEXO = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
] as const;

export const AnexoSchema = z.object({
  nome: z.string().max(200),
  tipo: z.enum(TIPOS_DE_ANEXO),
  dados: z.string().max(12_000_000),
});

export type Anexo = z.infer<typeof AnexoSchema>;

export const AdaptarAulaInputSchema = z
  .object({
    plano: z.string().trim().max(20000),
    alunos: z.array(PerfilAnonimoSchema).max(60),
    anexos: z.array(AnexoSchema).max(3).default([]),
  })
  .refine((d) => d.plano.length >= 15 || d.anexos.length > 0, {
    message: "Escreva o plano ou anexe um arquivo.",
  });

export type AdaptarAulaResposta = { ok: true; plano: PlanoAdaptado } | { ok: false; erro: string };

export type StatusIA = {
  configurada: boolean;
  provedor: "gemini" | null;
  gratuita: boolean;
};

export const planoExemplo: PlanoAdaptado = {
  titulo: "Plano de aula – Adição e subtração no dia a dia",
  disciplina: "Matemática",
  serie: "4º ano",
  duracao: "50 minutos",
  objetivo:
    "Resolver problemas de adição e subtração ligados ao cotidiano, escolhendo uma estratégia de cálculo e explicando como chegou ao resultado.",
  objetivosEspecificos: [
    "Identificar se uma situação-problema pede adição ou subtração.",
    "Resolver problemas com números até 1.000 usando material concreto, desenho ou algoritmo.",
    "Explicar para um colega a estratégia usada, por fala, desenho ou escrita.",
    "Conferir o resultado estimando se ele faz sentido.",
  ],
  habilidadesBncc: [
    "EF04MA03 – Resolver e elaborar problemas com números naturais envolvendo adição e subtração, utilizando estratégias diversas, como cálculo, cálculo mental e algoritmos, além de fazer estimativas do resultado.",
  ],
  conteudos: [
    "Adição e subtração com números naturais",
    "Situações-problema do cotidiano",
    "Estimativa e conferência de resultados",
  ],
  materiais: [
    "Tampinhas de garrafa ou palitos (cerca de 30 por dupla)",
    "Folha da atividade em duas versões (padrão e com apoio visual)",
    "Encarte de supermercado ou cartões com preços",
    "Lápis de cor e cartolina para o painel de estratégias",
  ],
  estrategias: [
    "Rotina visual no quadro: escreva as 4 etapas da aula e marque com um ímã onde a turma está.",
    "Instrução em 3 passos: fale, escreva no quadro e mostre um exemplo resolvido antes de cada tarefa.",
    "Duplas com papéis definidos: um lê o problema, o outro organiza o material; trocam a cada questão.",
    "Múltiplas formas de resposta: o aluno pode resolver com tampinhas, desenho ou conta armada.",
    "Correção sem exposição: as duplas mostram a resposta no caderno, e a professora circula para conferir.",
  ],
  etapas: [
    {
      titulo: "Abertura com uma situação real (10 min)",
      descricao:
        "Mostre um encarte de supermercado e pergunte: “Se eu tenho R$ 50 e compro um pacote de arroz de R$ 18, quanto sobra?”. Deixe a turma pensar por 1 minuto e ouça 3 ou 4 estratégias diferentes. Registre no quadro as ideias (contar para trás, desenhar notas, fazer a conta) e diga que hoje todas as formas de resolver valem.",
      inclusao:
        "Leia a pergunta em voz alta e deixe-a escrita no quadro com o desenho das notas. Quem preferir pode responder mostrando os dedos ou apontando no desenho.",
    },
    {
      titulo: "Exemplo resolvido juntos (8 min)",
      descricao:
        "Resolva um problema no quadro pensando em voz alta: “Primeiro eu leio. Depois pergunto: vai aumentar ou diminuir? Então escolho como calcular.” Mostre a mesma conta com tampinhas, com desenho e armada, lado a lado.",
      inclusao:
        "Use cores diferentes para os números e para a pergunta do problema. Deixe o exemplo no quadro até o fim da aula para consulta.",
    },
    {
      titulo: "Prática em duplas (20 min)",
      descricao:
        "Entregue a atividade às duplas. Explique os papéis (leitor e organizador) e combine que trocam a cada questão. Circule pela sala fazendo perguntas como “Como você sabe que é de tirar?” e “Esse resultado faz sentido?”.",
      inclusao:
        "Ofereça a versão com apoio visual para quem precisar, sem anunciar para a turma. Avise quando faltarem 5 e 2 minutos para acabar.",
    },
    {
      titulo: "Painel de estratégias (7 min)",
      descricao:
        "Peça que algumas duplas contem como resolveram uma questão, escolhendo se querem falar, mostrar o desenho ou o material. Monte na cartolina um painel com as estratégias da turma.",
      inclusao:
        "Convide as duplas antes, em particular, para ninguém ser pego de surpresa. Quem não quiser falar pode colar o desenho no painel.",
    },
    {
      titulo: "Fechamento (5 min)",
      descricao:
        "Retome a pergunta da abertura e pergunte: “Qual estratégia você vai usar da próxima vez?”. Cada aluno marca no caderno um desenho de carinha para dizer como se sentiu com a aula.",
      inclusao:
        "A autoavaliação por carinhas permite que todos respondam, inclusive quem ainda não escreve com autonomia.",
    },
  ],
  atividade: {
    titulo: "Compras na feira",
    enunciado:
      "Leia cada problema com sua dupla. Decida se é de juntar ou de tirar e resolva do jeito que preferir: com tampinhas, desenho ou conta.",
    itens: [
      "Ana comprou 24 laranjas e 15 maçãs. Quantas frutas ela comprou?",
      "O feirante tinha 60 ovos e vendeu 23. Quantos ovos sobraram?",
      "Pedro tinha R$ 45 e gastou R$ 18 na feira. Quanto dinheiro sobrou?",
      "Na barraca havia 38 bananas. Chegaram mais 25. Quantas bananas há agora?",
      "Uma turma juntou 132 tampinhas na segunda e 95 na terça. Quantas tampinhas juntou ao todo?",
      "Invente um problema de tirar com os preços do encarte e troque com outra dupla.",
    ],
    versaoAdaptada: [
      "EXEMPLO RESOLVIDO: Ana tem 4 laranjas. Ela ganhou mais 3. Quantas laranjas ela tem agora? Desenhe 4 bolinhas, depois mais 3. Conte todas: 7 laranjas. É um problema de JUNTAR.",
      "Ana comprou 24 laranjas e 15 maçãs. Ela JUNTOU as frutas na sacola. Quantas frutas ela comprou?",
      "O feirante tinha 60 ovos. Ele vendeu 23. Quantos ovos SOBRARAM?",
      "Pedro tinha R$ 45. Ele gastou R$ 18. Quanto dinheiro SOBROU? Use as notas de brinquedo.",
    ],
    apoios: [
      "Banco de palavras no topo da folha: JUNTAR = juntou, ganhou, chegaram mais · TIRAR = vendeu, gastou, sobrou.",
      "Uma imagem ao lado de cada problema: a sacola de frutas, a bandeja de ovos e as notas de dinheiro.",
      "Só 3 problemas por página, letra ampliada e um quadro em branco para desenhar.",
    ],
  },
  avaliacao: [
    "Observe, durante a prática, se o aluno identifica quando o problema é de juntar ou de tirar.",
    "Registre em uma lista de checagem quem resolveu ao menos 3 problemas, com qualquer estratégia.",
    "Aceite como evidência de aprendizagem a explicação oral, o desenho ou o material organizado — não só a conta armada.",
    "Use a autoavaliação por carinhas para planejar quem precisa de retomada na próxima aula.",
  ],
  adaptacoes: [
    {
      aluno: "",
      perfil: "Aluno com necessidade de apoio visual e rotina previsível (ex.: TEA)",
      itens: [
        "Antes da aula, mostre a rotina visual e avise que haverá trabalho em dupla.",
        "Na prática, entregue a versão com imagens e o exemplo resolvido.",
        "Forme a dupla com um colega de confiança e mantenha a mesma dupla até o fim.",
        "No painel, ofereça colar o desenho em vez de falar para a turma.",
      ],
      atividade: [
        "Olhe a figura: 3 dinossauros + 2 dinossauros. Quantos dinossauros ao todo? (é de JUNTAR)",
        "O museu tinha 9 fósseis. Emprestou 4. Quantos fósseis ficaram? (é de TIRAR)",
        "Na feira, 24 laranjas + 15 maçãs. Quantas frutas? Desenhe ou use tampinhas.",
      ],
    },
    {
      aluno: "",
      perfil: "Aluno que perde o foco em tarefas longas (ex.: TDAH)",
      itens: [
        "Divida a atividade em blocos de 2 problemas e confira cada bloco antes de seguir.",
        "Dê a ele o papel de organizador do material, que envolve movimento.",
        "Use um cronômetro visível durante a prática em duplas.",
      ],
      atividade: [
        "Bloco 1 (5 min): Ana comprou 24 laranjas e 15 maçãs. Quantas frutas ela comprou?",
        "Bloco 1 (5 min): O feirante tinha 60 ovos e vendeu 23. Quantos sobraram?",
        "Bloco 2 (5 min): Na barraca havia 38 bananas. Chegaram mais 25. Quantas há agora?",
        "Desafio final: leve o cartão de preços até a mesa do professor e invente um problema.",
      ],
    },
    {
      aluno: "",
      perfil: "Aluno com dificuldade de leitura (ex.: dislexia)",
      itens: [
        "Leia os problemas em voz alta para a dupla ou deixe o colega ler.",
        "Entregue a versão com letra ampliada e palavras-chave destacadas.",
        "Aceite a resposta oral ou por desenho como resultado completo.",
      ],
      atividade: [
        "(Leia com o colega) Ana comprou 24 laranjas e 15 maçãs. Quantas FRUTAS?",
        "(Leia com o colega) O feirante tinha 60 ovos. Vendeu 23. Quantos SOBRARAM?",
        "Mostre a resposta com tampinhas ou desenho e conte para o professor.",
      ],
    },
  ],
  barreiras: [
    "Explicação só oral: acrescente o exemplo resolvido no quadro e o material concreto.",
    "Lista de 10 problemas individuais: reduza para 6 e trabalhe em duplas.",
    "Correção no quadro na frente da turma: troque pelo painel de estratégias com convite prévio.",
  ],
  recomendacoes: [
    "Guarde o painel de estratégias na parede para as próximas aulas de problemas.",
    "Na aula seguinte, comece pelos alunos que marcaram a carinha triste na autoavaliação.",
    "Peça às famílias que façam um problema com preços reais durante as compras da semana.",
  ],
  recursos: [
    "Jogo “Mercadinho da turma”: preços em cartões e dinheiro de brinquedo para simular compras.",
    "Folha de problemas em versão com imagens, para imprimir.",
    "Material dourado ou ábaco, se a escola tiver, para números maiores que 100.",
  ],
};

export const planoOriginalExemplo = `Aula de Matemática – 4º ano (50 min)
Objetivo: compreender os conceitos de adição e subtração.
1. Abertura (10 min): explicação oral sobre adição e subtração.
2. Exercícios (25 min): lista de 10 problemas no caderno, individualmente.
3. Correção (15 min): alunos resolvem no quadro na frente da turma.`;

export type Etapa = z.infer<typeof EtapaSchema>;
export type Atividade = z.infer<typeof AtividadeSchema>;
export type Adaptacao = z.infer<typeof AdaptacaoSchema>;

export const PARTES_DO_PLANO = ["etapa", "atividade", "adaptacao"] as const;
export type ParteDoPlano = (typeof PARTES_DO_PLANO)[number];

export const RefazerParteSchema = z.object({
  parte: z.enum(PARTES_DO_PLANO),
  titulo: z.string().max(300),
  disciplina: z.string().max(100),
  serie: z.string().max(60),
  duracao: z.string().max(60),
  objetivo: z.string().max(2000),
  etapas: z.array(z.string().max(300)).max(12),
  atual: z.string().max(15000),
  pedido: z.string().trim().max(500),
  perfil: PerfilAnonimoSchema.optional(),
});

export type RefazerParte = z.infer<typeof RefazerParteSchema>;

export type RefazerParteResposta =
  | { ok: true; parte: "etapa"; etapa: Etapa }
  | { ok: true; parte: "atividade"; atividade: Atividade }
  | { ok: true; parte: "adaptacao"; adaptacao: Adaptacao }
  | { ok: false; erro: string };
