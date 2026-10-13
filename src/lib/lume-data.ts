export type Tom = "coral" | "tangerine" | "sun" | "leaf" | "sky" | "lilac";

export type Aluno = {
  id: string;
  nome: string;
  serie: string;
  idade: number;
  atualizado: string;
  suporte: "Alto" | "Médio" | "Leve";
  necessidades?: string[];
  tags: string[];
  resumo: string;
  caracteristicas: string[];
  preferencias: string[];
  sensorial: string[];
  funcionam: string[];
  naoFuncionam: string[];
  historico: { titulo: string; texto: string }[];
  familia: string;
  evolucao: { mes: string; participacao: number }[];
  exemplo?: boolean;
  turma?: string | null;
  foto?: string | null;
};

export const alunos: Aluno[] = [
  {
    id: "lucas-almeida",
    nome: "Lucas Almeida",
    serie: "4º ano",
    idade: 9,
    atualizado: "12 de maio",
    suporte: "Médio",
    exemplo: true,
    necessidades: ["Apoio visual", "Rotina previsível", "Instruções em etapas", "Apoio na leitura"],
    tags: ["TEA", "TDAH", "Dislexia"],
    resumo: "Lucas responde melhor a instruções visuais e se beneficia de ambientes previsíveis.",
    caracteristicas: [
      "Comunicativo, mas com dificuldade em interações de grupo.",
      "Prefere rotinas e se sente inseguro com mudanças.",
      "Tem grande interesse por tecnologia e dinossauros.",
    ],
    preferencias: [
      "Trabalhar em duplas com colega de confiança.",
      "Atividades com apoio de imagens e vídeos curtos.",
      "Registrar respostas por desenho ou áudio.",
    ],
    sensorial: [
      "Incomoda-se com ruídos altos e repentinos.",
      "Prefere luz natural a lâmpadas fortes.",
      "Usa fone abafador em momentos de sobrecarga.",
    ],
    funcionam: [
      "Instruções em etapas curtas e numeradas.",
      "Aviso antecipado de mudanças na rotina.",
      "Reforço positivo imediato após a tarefa.",
    ],
    naoFuncionam: [
      "Pedidos verbais longos sem apoio visual.",
      "Exposição para responder em voz alta sem preparo.",
      "Retirar o intervalo como punição.",
    ],
    historico: [
      {
        titulo: "Desempenho acadêmico",
        texto: "Evolução constante em matemática e ciências. Dificuldade em leitura e escrita.",
      },
      {
        titulo: "Comportamento",
        texto: "Pode se distrair facilmente. Reage bem a reforços positivos.",
      },
      {
        titulo: "Notas importantes",
        texto: "Já apresentou crises de ansiedade em momentos de sobrecarga.",
      },
    ],
    familia:
      "A família relata que Lucas dorme melhor com rotina fixa e que atividades com imagens ajudam na lição de casa.",
    evolucao: [
      { mes: "Fev", participacao: 42 },
      { mes: "Mar", participacao: 51 },
      { mes: "Abr", participacao: 63 },
      { mes: "Mai", participacao: 74 },
    ],
  },
  {
    id: "marina-souza",
    nome: "Marina Souza",
    serie: "3º ano",
    idade: 8,
    atualizado: "08 de maio",
    suporte: "Leve",
    exemplo: true,
    necessidades: ["Pausas frequentes", "Instruções em etapas"],
    tags: ["TDAH"],
    resumo: "Marina se engaja mais quando a aula alterna explicação curta e prática.",
    caracteristicas: [
      "Muito criativa e participativa nas rodas de conversa.",
      "Perde o foco em tarefas longas.",
      "Gosta de assumir papéis de liderança.",
    ],
    preferencias: ["Tarefas com tempo marcado", "Movimento entre atividades", "Trabalho em grupo"],
    sensorial: ["Tolera bem ruído moderado", "Prefere sentar perto da janela"],
    funcionam: ["Blocos de 10 minutos", "Checklists visíveis", "Papel definido no grupo"],
    naoFuncionam: ["Cópia longa da lousa", "Instruções acumuladas de uma só vez"],
    historico: [
      { titulo: "Desempenho acadêmico", texto: "Boa oralidade, escrita em desenvolvimento." },
      { titulo: "Comportamento", texto: "Colabora bem quando tem uma função clara." },
    ],
    familia: "A família apoia o uso de timers em casa e relata melhora na organização.",
    evolucao: [
      { mes: "Fev", participacao: 55 },
      { mes: "Mar", participacao: 60 },
      { mes: "Abr", participacao: 68 },
      { mes: "Mai", participacao: 79 },
    ],
  },
  {
    id: "pedro-lima",
    nome: "Pedro Lima",
    serie: "5º ano",
    idade: 10,
    atualizado: "02 de maio",
    suporte: "Alto",
    exemplo: true,
    necessidades: ["Comunicação alternativa", "Tempo extra", "Ambiente com menos ruído"],
    tags: ["TEA"],
    resumo: "Pedro comunica-se melhor com apoio de pranchas visuais e tempo extra de resposta.",
    caracteristicas: [
      "Comunicação verbal reduzida em grupos grandes.",
      "Demonstra interesse intenso por mapas.",
      "Responde bem a rotinas visuais na parede.",
    ],
    preferencias: ["Ambiente silencioso", "Trabalho individual antes do coletivo"],
    sensorial: ["Sensível a luzes piscantes", "Busca objetos de pressão para se regular"],
    funcionam: ["Prancha de comunicação", "Tempo extra para responder", "Antecipação da rotina"],
    naoFuncionam: ["Mudança repentina de sala", "Perguntas rápidas em sequência"],
    historico: [
      { titulo: "Desempenho acadêmico", texto: "Excelente memória visual e raciocínio espacial." },
      { titulo: "Comportamento", texto: "Momentos de sobrecarga em dias de evento escolar." },
    ],
    familia: "A família usa a mesma prancha de comunicação em casa.",
    evolucao: [
      { mes: "Fev", participacao: 30 },
      { mes: "Mar", participacao: 38 },
      { mes: "Abr", participacao: 47 },
      { mes: "Mai", participacao: 58 },
    ],
  },
  {
    id: "beatriz-rocha",
    nome: "Beatriz Rocha",
    serie: "4º ano",
    idade: 9,
    atualizado: "28 de abril",
    suporte: "Leve",
    exemplo: true,
    necessidades: ["Apoio na leitura", "Tempo extra"],
    tags: ["Dislexia"],
    resumo: "Beatriz avança bem com fonte ampliada, leitura em voz alta e mais tempo.",
    caracteristicas: ["Ótima compreensão oral", "Insegurança ao ler em público"],
    preferencias: ["Material com fonte ampliada", "Leitura em dupla"],
    sensorial: ["Sem restrições relevantes"],
    funcionam: ["Espaçamento maior no texto", "Audiolivros", "Correção sem exposição"],
    naoFuncionam: ["Leitura em voz alta sem aviso", "Textos densos sem divisão"],
    historico: [{ titulo: "Desempenho acadêmico", texto: "Avanço consistente com adaptações." }],
    familia: "A família acompanha a leitura diária em casa por 15 minutos.",
    evolucao: [
      { mes: "Fev", participacao: 60 },
      { mes: "Mar", participacao: 66 },
      { mes: "Abr", participacao: 72 },
      { mes: "Mai", participacao: 81 },
    ],
  },
];

export const tomSoft: Record<Tom, string> = {
  coral: "bg-coral-soft",
  tangerine: "bg-tangerine-soft",
  sun: "bg-sun-soft",
  leaf: "bg-leaf-soft",
  sky: "bg-sky-soft",
  lilac: "bg-lilac-soft",
};

export const suporteTom: Record<Aluno["suporte"], string> = {
  Alto: "bg-coral-soft",
  Médio: "bg-sun-soft",
  Leve: "bg-leaf-soft",
};

export const tomSolid: Record<Tom, string> = {
  coral: "bg-coral",
  tangerine: "bg-tangerine",
  sun: "bg-sun",
  leaf: "bg-leaf",
  sky: "bg-sky",
  lilac: "bg-lilac",
};
