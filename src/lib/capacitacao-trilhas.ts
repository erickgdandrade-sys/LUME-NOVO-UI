import type { Tom } from "./lume-data";

export type Pergunta = {
  id: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
};

export type Licao = { id: string; titulo: string; perguntas: Pergunta[] };

export type Trilha = { id: string; titulo: string; descricao: string; cor: Tom; licoes: Licao[] };

export const trilhas: Trilha[] = [
  {
    id: "introducao",
    titulo: "Introdução à Educação Inclusiva",
    descricao: "O que é inclusão, as barreiras e os direitos de cada aluno.",
    cor: "tangerine",
    licoes: [
      {
        id: "introducao-1",
        titulo: "O que é inclusão",
        perguntas: [
          {
            id: "int-1-1",
            enunciado: "O que significa uma escola inclusiva?",
            alternativas: [
              "Uma escola com uma sala separada para alunos com deficiência",
              "Uma escola onde todos aprendem juntos, com os apoios de que cada um precisa",
              "Uma escola que só aceita alunos com laudo",
              "Uma escola que dá a mesma atividade para todos, sem ajustes",
            ],
            correta: 1,
            explicacao:
              "Inclusão é todos aprendendo no mesmo espaço, com ajustes e apoios para que cada aluno participe de verdade. Separar ou ignorar as diferenças não é incluir.",
          },
          {
            id: "int-1-2",
            enunciado: "Qual é a diferença entre integração e inclusão?",
            alternativas: [
              "Não há diferença, são sinônimos",
              "Na integração o aluno se adapta à escola; na inclusão a escola se adapta ao aluno",
              "A inclusão vale só para escolas públicas",
              "A integração é mais moderna que a inclusão",
            ],
            correta: 1,
            explicacao:
              "Na integração, o aluno precisa se encaixar no que já existe. Na inclusão, a escola muda práticas, materiais e ambiente para receber todos.",
          },
          {
            id: "int-1-3",
            enunciado: "No modelo social da deficiência, onde está a principal barreira?",
            alternativas: [
              "No próprio aluno",
              "Na família do aluno",
              "No ambiente, nas atitudes e nas práticas que impedem a participação",
              "No diagnóstico médico",
            ],
            correta: 2,
            explicacao:
              "O modelo social mostra que a deficiência aparece na interação com barreiras do ambiente. Tirar essas barreiras é responsabilidade de toda a escola.",
          },
          {
            id: "int-1-4",
            enunciado: "Quem se beneficia de práticas inclusivas na sala de aula?",
            alternativas: [
              "Só os alunos com deficiência",
              "Só os alunos com laudo",
              "A turma inteira",
              "Só o professor de apoio",
            ],
            correta: 2,
            explicacao:
              "Instruções claras, apoio visual e mais de um jeito de mostrar o que se aprendeu ajudam todos os alunos, não só quem tem alguma necessidade específica.",
          },
        ],
      },
      {
        id: "introducao-2",
        titulo: "Barreiras e o DUA",
        perguntas: [
          {
            id: "int-2-1",
            enunciado: "O que é o DUA (Desenho Universal para a Aprendizagem)?",
            alternativas: [
              "Um teste para identificar deficiências",
              "Um jeito de planejar a aula pensando desde o início na diversidade da turma",
              "Uma atividade extra só para alunos com laudo",
              "Um aplicativo de reforço escolar",
            ],
            correta: 1,
            explicacao:
              "O DUA propõe planejar já pensando em todos, com várias formas de engajar, apresentar o conteúdo e deixar o aluno mostrar o que aprendeu, em vez de adaptar só depois.",
          },
          {
            id: "int-2-2",
            enunciado: "Quais são os três princípios do DUA?",
            alternativas: [
              "Disciplina, silêncio e repetição",
              "Múltiplos meios de engajamento, de representação e de ação e expressão",
              "Prova, nota e recuperação",
              "Diagnóstico, laudo e encaminhamento",
            ],
            correta: 1,
            explicacao:
              "Engajamento (o porquê de aprender), representação (o quê, de vários jeitos) e ação e expressão (o como, mostrando o aprendizado de várias formas).",
          },
          {
            id: "int-2-3",
            enunciado:
              "Um texto longo, só escrito, na lousa. Qual ajuste segue o princípio de representação do DUA?",
            alternativas: [
              "Pedir que copiem mais rápido",
              "Oferecer o conteúdo também com imagem, áudio ou esquema",
              "Dar menos tempo para quem atrasa",
              "Tirar o texto da aula",
            ],
            correta: 1,
            explicacao:
              "Apresentar a mesma informação em mais de um formato (texto, imagem, fala, esquema) garante que mais alunos tenham acesso ao conteúdo.",
          },
          {
            id: "int-2-4",
            enunciado: "Qual é um exemplo de barreira atitudinal?",
            alternativas: [
              "Uma escada sem rampa",
              "Achar que um aluno com deficiência não vai conseguir aprender",
              "Um livro com letra pequena",
              "Uma sala barulhenta",
            ],
            correta: 1,
            explicacao:
              "Barreiras atitudinais são crenças e expectativas baixas. Elas limitam as oportunidades do aluno tanto quanto uma barreira física.",
          },
        ],
      },
      {
        id: "introducao-3",
        titulo: "Direitos e legislação",
        perguntas: [
          {
            id: "int-3-1",
            enunciado: "Qual lei é conhecida como Lei Brasileira de Inclusão (LBI)?",
            alternativas: [
              "Lei 9.394/1996",
              "Lei 13.146/2015",
              "Lei 8.069/1990",
              "Lei 14.254/2021",
            ],
            correta: 1,
            explicacao:
              "A Lei 13.146/2015, o Estatuto da Pessoa com Deficiência, garante o direito a um sistema educacional inclusivo em todos os níveis.",
          },
          {
            id: "int-3-2",
            enunciado:
              "Uma escola particular pode cobrar valor extra na mensalidade por atender um aluno com deficiência?",
            alternativas: [
              "Sim, se o aluno precisar de apoio",
              "Sim, desde que avise a família",
              "Não, a LBI proíbe a cobrança de valores adicionais",
              "Só se o aluno tiver laudo",
            ],
            correta: 2,
            explicacao:
              "A LBI proíbe que escolas particulares cobrem qualquer valor adicional nas mensalidades ou matrículas para cumprir as obrigações de inclusão.",
          },
          {
            id: "int-3-3",
            enunciado: "O que é o AEE (Atendimento Educacional Especializado)?",
            alternativas: [
              "Uma escola especial que substitui a escola comum",
              "Um apoio complementar, em geral no contraturno, que não substitui a sala comum",
              "Um reforço só para quem tirou nota baixa",
              "Uma consulta médica dentro da escola",
            ],
            correta: 1,
            explicacao:
              "O AEE complementa ou suplementa a formação do aluno, geralmente na sala de recursos e no contraturno. Ele não substitui a frequência na turma comum.",
          },
          {
            id: "int-3-4",
            enunciado: "O laudo médico é obrigatório para a escola fazer adaptações para o aluno?",
            alternativas: [
              "Sim, sem laudo não pode adaptar nada",
              "Não, as necessidades pedagógicas podem ser atendidas mesmo sem laudo",
              "Só para alunos do ensino médio",
              "Só se a família pagar uma avaliação",
            ],
            correta: 1,
            explicacao:
              "O laudo ajuda, mas não é condição para atender o aluno. As orientações do MEC deixam claro que o atendimento pedagógico não depende de diagnóstico.",
          },
        ],
      },
    ],
  },
  {
    id: "tea",
    titulo: "TEA na prática",
    descricao: "Rotina, comunicação e questões sensoriais no Transtorno do Espectro Autista.",
    cor: "leaf",
    licoes: [
      {
        id: "tea-1",
        titulo: "Rotina e previsibilidade",
        perguntas: [
          {
            id: "tea-1-1",
            enunciado: "Por que uma rotina visual ajuda muitos alunos com TEA?",
            alternativas: [
              "Porque deixa a aula mais longa",
              "Porque mostra o que vai acontecer e reduz a ansiedade",
              "Porque substitui a explicação do professor",
              "Porque serve para punir quem sai da rotina",
            ],
            correta: 1,
            explicacao:
              "Saber o que vem a seguir traz previsibilidade. Um quadro com as etapas do dia, com imagens, diminui a ansiedade e facilita as transições.",
          },
          {
            id: "tea-1-2",
            enunciado: "A aula vai mudar de última hora. Como avisar um aluno com TEA?",
            alternativas: [
              "Não avisar, para ele se acostumar com surpresas",
              "Avisar com antecedência, de forma clara e, se possível, com apoio visual",
              "Avisar só depois que a mudança acontecer",
              "Pedir para um colega explicar no meio da atividade",
            ],
            correta: 1,
            explicacao:
              "Antecipar mudanças e mostrar a nova sequência ajuda o aluno a se preparar. Mudanças sem aviso costumam gerar crises que poderiam ser evitadas.",
          },
          {
            id: "tea-1-3",
            enunciado: "O que ajuda na transição entre uma atividade e outra?",
            alternativas: [
              "Encerrar a atividade de repente",
              'Avisar o tempo restante, como "faltam 5 minutos", e usar um sinal combinado',
              "Gritar para chamar atenção",
              "Começar a próxima atividade sem explicar",
            ],
            correta: 1,
            explicacao:
              "Avisos de tempo e sinais combinados (um timer, uma música, um cartão) tornam a transição previsível e menos difícil.",
          },
          {
            id: "tea-1-4",
            enunciado: "Qual destas é uma boa prática para organizar uma tarefa?",
            alternativas: [
              "Dar todas as instruções de uma vez, só falando",
              "Dividir a tarefa em passos curtos, com começo e fim claros",
              "Deixar o aluno descobrir sozinho o que fazer",
              "Mudar as regras no meio da tarefa",
            ],
            correta: 1,
            explicacao:
              'Passos curtos e um final claro ("quando terminar os 3 exercícios, coloque na caixa") dão segurança e autonomia.',
          },
        ],
      },
      {
        id: "tea-2",
        titulo: "Sensorial e autorregulação",
        perguntas: [
          {
            id: "tea-2-1",
            enunciado: "Um aluno tapa os ouvidos quando a turma fica barulhenta. O que fazer?",
            alternativas: [
              "Mandar tirar as mãos dos ouvidos",
              "Oferecer um abafador de ruído ou um canto mais calmo",
              "Ignorar, porque é manha",
              "Tirar o aluno da sala como castigo",
            ],
            correta: 1,
            explicacao:
              "Tapar os ouvidos indica sobrecarga sensorial. Reduzir o barulho ou oferecer um abafador ajuda o aluno a continuar participando.",
          },
          {
            id: "tea-2-2",
            enunciado:
              "Um aluno balança as mãos (estereotipia) enquanto faz a atividade. Qual atitude é mais adequada?",
            alternativas: [
              "Proibir o movimento imediatamente",
              "Permitir, se não machuca ninguém, porque pode ajudar na autorregulação",
              "Chamar a atenção dele na frente da turma",
              "Tirar pontos da nota",
            ],
            correta: 1,
            explicacao:
              "Muitas estereotipias ajudam o aluno a se regular e a se concentrar. Só é preciso intervir quando há risco de machucar a si ou aos outros.",
          },
          {
            id: "tea-2-3",
            enunciado: 'Para que serve um "cantinho da calma" na sala?',
            alternativas: [
              "Para deixar o aluno de castigo",
              "Para o aluno se regular quando estiver sobrecarregado e depois voltar à atividade",
              "Para guardar materiais",
              "Para o aluno ficar o dia todo sozinho",
            ],
            correta: 1,
            explicacao:
              "O cantinho da calma é um recurso de autorregulação, não um castigo. O aluno usa por um tempo e volta quando estiver pronto.",
          },
          {
            id: "tea-2-4",
            enunciado: "Durante uma crise de sobrecarga, o que costuma ajudar mais?",
            alternativas: [
              "Falar muito e fazer várias perguntas",
              "Reduzir estímulos, falar pouco e com calma, e garantir a segurança",
              "Segurar o aluno com força",
              "Repreender na frente de todos",
            ],
            correta: 1,
            explicacao:
              "Na crise, o aluno já está sobrecarregado. Menos estímulo, poucas palavras e um ambiente seguro ajudam a passar o momento. A conversa fica para depois.",
          },
        ],
      },
      {
        id: "tea-3",
        titulo: "Comunicação e interação",
        perguntas: [
          {
            id: "tea-3-1",
            enunciado:
              "Como dar uma instrução a um aluno que entende a linguagem de forma literal?",
            alternativas: [
              'Usar ironias e expressões como "tá chovendo canivete"',
              'Ser direto e concreto, por exemplo "abra o caderno na página 10"',
              "Dar a instrução de forma vaga para estimular a interpretação",
              "Falar mais alto",
            ],
            correta: 1,
            explicacao:
              "Instruções diretas e concretas evitam confusão. Ironias e expressões figuradas podem ser entendidas ao pé da letra.",
          },
          {
            id: "tea-3-2",
            enunciado: "Um aluno repete frases que ouviu (ecolalia). Isso significa que...",
            alternativas: [
              "Ele está desobedecendo",
              "Ela pode ser uma forma de comunicação e merece atenção",
              "Ele não entende nada do que é dito",
              "É preciso proibir a repetição",
            ],
            correta: 1,
            explicacao:
              "A ecolalia muitas vezes tem função: pedir algo, se acalmar ou responder. Observar o contexto ajuda a entender o que o aluno quer comunicar.",
          },
          {
            id: "tea-3-3",
            enunciado: "O aluno tem um interesse intenso por trens. Como usar isso na aula?",
            alternativas: [
              "Proibir o assunto para ele focar no conteúdo",
              "Usar o interesse como ponte, como problemas de matemática com trens",
              "Ignorar o interesse",
              "Deixar ele falar de trens a aula inteira, sem relação com o conteúdo",
            ],
            correta: 1,
            explicacao:
              "Interesses intensos aumentam o engajamento. Conectar o conteúdo ao interesse do aluno é uma estratégia poderosa.",
          },
          {
            id: "tea-3-4",
            enunciado:
              "Um aluno não olha nos olhos quando você fala com ele. O que isso quer dizer?",
            alternativas: [
              "Que ele não está prestando atenção",
              "Que ele está sendo desrespeitoso",
              "Nada necessariamente: muitos alunos com TEA prestam atenção sem contato visual",
              "Que é preciso obrigar o contato visual",
            ],
            correta: 2,
            explicacao:
              "Para muitas pessoas com TEA, o contato visual é desconfortável e atrapalha a concentração. Não exija: confira a compreensão de outras formas.",
          },
        ],
      },
    ],
  },
  {
    id: "tdah",
    titulo: "TDAH na sala de aula",
    descricao: "Atenção, organização e movimento para alunos com TDAH.",
    cor: "sky",
    licoes: [
      {
        id: "tdah-1",
        titulo: "Atenção e organização",
        perguntas: [
          {
            id: "tdah-1-1",
            enunciado: "Onde costuma ser melhor um aluno com TDAH se sentar?",
            alternativas: [
              "No fundo da sala, perto da janela",
              "Perto do professor e longe de distrações como portas e janelas",
              "Sempre sozinho, longe da turma",
              "Ao lado da porta, para sair quando quiser",
            ],
            correta: 1,
            explicacao:
              "Ficar perto do professor e longe de estímulos visuais e sonoros ajuda a manter o foco, sem isolar o aluno da turma.",
          },
          {
            id: "tdah-1-2",
            enunciado: "Como apresentar uma tarefa longa para um aluno com TDAH?",
            alternativas: [
              "Entregar tudo de uma vez e esperar",
              "Dividir em partes menores, com pausas e confirmação a cada etapa",
              "Dar menos tempo para ele não se distrair",
              "Deixar para ele fazer em casa",
            ],
            correta: 1,
            explicacao:
              "Partes menores tornam a tarefa mais possível e dão sensação de progresso. Conferir cada etapa evita que o aluno se perca.",
          },
          {
            id: "tdah-1-3",
            enunciado: "O que ajuda o aluno a lembrar o que precisa fazer?",
            alternativas: [
              "Repetir a instrução só uma vez, em voz baixa",
              "Deixar a instrução escrita ou desenhada à vista, como um checklist",
              "Confiar que ele vai lembrar sozinho",
              "Dar bronca quando esquecer",
            ],
            correta: 1,
            explicacao:
              "O TDAH afeta a memória de trabalho. Um checklist ou a instrução escrita na mesa funcionam como um lembrete externo.",
          },
          {
            id: "tdah-1-4",
            enunciado: "Qual lei garante acompanhamento a alunos com TDAH e dislexia na escola?",
            alternativas: [
              "Lei 14.254/2021",
              "Lei 12.764/2012",
              "Lei 10.436/2002",
              "Lei 9.394/1996, sem mais nenhuma outra",
            ],
            correta: 0,
            explicacao:
              "A Lei 14.254/2021 prevê acompanhamento integral, na escola, para alunos com dislexia, TDAH ou outros transtornos de aprendizagem.",
          },
        ],
      },
      {
        id: "tdah-2",
        titulo: "Movimento e impulsividade",
        perguntas: [
          {
            id: "tdah-2-1",
            enunciado: "Um aluno não consegue ficar parado na cadeira. O que pode ajudar?",
            alternativas: [
              "Proibir qualquer movimento",
              "Dar oportunidades de se movimentar, como entregar materiais ou fazer pausas ativas",
              "Tirar o recreio",
              "Mandar para a direção",
            ],
            correta: 1,
            explicacao:
              "Movimento planejado ajuda a regular a atenção. Tarefas como distribuir folhas ou apagar a lousa canalizam a energia de forma positiva.",
          },
          {
            id: "tdah-2-2",
            enunciado: "O aluno responde antes de você terminar a pergunta. Qual estratégia ajuda?",
            alternativas: [
              "Ignorar o aluno sempre",
              "Combinar um sinal, como levantar a mão ou anotar a resposta antes de falar",
              "Mandar ele sair da sala",
              "Nunca fazer perguntas para a turma",
            ],
            correta: 1,
            explicacao:
              'Combinar sinais e dar um jeito de "guardar" a resposta (anotando, por exemplo) ensina a esperar sem tirar a participação do aluno.',
          },
          {
            id: "tdah-2-3",
            enunciado: "Qual tipo de retorno costuma funcionar melhor com alunos com TDAH?",
            alternativas: [
              "Só apontar os erros, no fim do bimestre",
              "Retorno imediato e específico, valorizando o que deu certo",
              "Nenhum retorno, para não distrair",
              "Comparar com os colegas",
            ],
            correta: 1,
            explicacao:
              'Retornos rápidos e concretos ("você terminou os 3 primeiros, ótimo!") mantêm a motivação e mostram o caminho.',
          },
          {
            id: "tdah-2-4",
            enunciado: "Tirar o recreio como castigo de um aluno com TDAH é uma boa ideia?",
            alternativas: [
              "Sim, ensina disciplina",
              "Não, o movimento do recreio ajuda na regulação e no foco depois",
              "Sim, se for só às vezes",
              "Depende da nota dele",
            ],
            correta: 1,
            explicacao:
              "O recreio é um momento importante de movimento e regulação. Tirá-lo costuma piorar o comportamento e a atenção nas aulas seguintes.",
          },
        ],
      },
      {
        id: "tdah-3",
        titulo: "Avaliação justa",
        perguntas: [
          {
            id: "tdah-3-1",
            enunciado: "Qual ajuste de prova costuma ajudar um aluno com TDAH?",
            alternativas: [
              "Uma prova bem mais difícil",
              "Tempo extra e um local com menos distrações",
              "Fazer a prova em pé",
              "Proibir o uso de rascunho",
            ],
            correta: 1,
            explicacao:
              "Tempo extra e menos distrações não facilitam o conteúdo: eles tiram barreiras para que o aluno mostre o que sabe.",
          },
          {
            id: "tdah-3-2",
            enunciado: "Como formatar uma prova para um aluno com dificuldade de atenção?",
            alternativas: [
              "Muitas questões apertadas na mesma página",
              "Poucas questões por página, letra legível e enunciados curtos",
              "Sem numerar as questões",
              "Tudo em um único parágrafo",
            ],
            correta: 1,
            explicacao:
              "Uma prova visualmente limpa reduz a sobrecarga e ajuda o aluno a não pular questões.",
          },
          {
            id: "tdah-3-3",
            enunciado: "Ler as questões da prova em voz alta para o aluno é...",
            alternativas: [
              "Dar a resposta para ele",
              "Um apoio legítimo, quando a leitura é uma barreira e não o que se está avaliando",
              "Proibido em qualquer situação",
              "Só permitido para alunos do 1º ano",
            ],
            correta: 1,
            explicacao:
              "Se o objetivo da prova é avaliar matemática, por exemplo, ler o enunciado tira uma barreira sem mudar o que está sendo avaliado.",
          },
          {
            id: "tdah-3-4",
            enunciado: "Além da prova escrita, como o aluno pode mostrar o que aprendeu?",
            alternativas: [
              "Não há outra forma válida",
              "Apresentação oral, maquete, mapa mental ou vídeo, conforme o objetivo",
              "Só copiando o livro",
              "Só com trabalho em casa",
            ],
            correta: 1,
            explicacao:
              "Esse é o princípio de ação e expressão do DUA: oferecer mais de um caminho para o aluno demonstrar o aprendizado.",
          },
        ],
      },
    ],
  },
  {
    id: "comunicacao",
    titulo: "Comunicação inclusiva",
    descricao: "Instruções claras, comunicação alternativa e conversa com as famílias.",
    cor: "lilac",
    licoes: [
      {
        id: "comunicacao-1",
        titulo: "Instruções claras",
        perguntas: [
          {
            id: "com-1-1",
            enunciado: "Qual é a melhor forma de dar uma instrução com várias etapas?",
            alternativas: [
              "Falar tudo de uma vez, rapidamente",
              "Escrever só na lousa, em letra pequena",
              "Dividir em etapas curtas, com apoio visual",
              "Pedir que um colega repita depois",
            ],
            correta: 2,
            explicacao:
              "Etapas curtas com apoio visual reduzem a carga de memória e beneficiam a turma inteira.",
          },
          {
            id: "com-1-2",
            enunciado: "Como conferir se o aluno entendeu a instrução?",
            alternativas: [
              'Perguntar "entendeu?" e seguir',
              "Pedir que ele explique com as próprias palavras o que vai fazer",
              "Não conferir, para não constranger",
              "Repetir a instrução mais alto",
            ],
            correta: 1,
            explicacao:
              '"Entendeu?" costuma receber um "sim" automático. Pedir para o aluno contar o próximo passo mostra se ele realmente entendeu.',
          },
          {
            id: "com-1-3",
            enunciado: "Para alunos com dificuldade de leitura, o enunciado ideal é...",
            alternativas: [
              "Longo e cheio de detalhes",
              "Curto, com palavras simples e uma ação por frase",
              "Escrito em letra cursiva pequena",
              "Sem nenhuma imagem",
            ],
            correta: 1,
            explicacao:
              "Frases curtas, linguagem simples e uma ação por vez tornam o enunciado acessível sem diminuir o desafio da tarefa.",
          },
          {
            id: "com-1-4",
            enunciado: "Qual destes é um bom apoio visual para a turma?",
            alternativas: [
              "Um quadro com as etapas da atividade e ícones",
              "Um cartaz com muitas cores e informações misturadas",
              "Nenhum, o visual distrai",
              "Só a fala do professor",
            ],
            correta: 0,
            explicacao:
              "Apoios visuais simples e organizados orientam sem sobrecarregar. Excesso de informação no cartaz atrapalha.",
          },
        ],
      },
      {
        id: "comunicacao-2",
        titulo: "Comunicação alternativa",
        perguntas: [
          {
            id: "com-2-1",
            enunciado: "O que é CAA (Comunicação Aumentativa e Alternativa)?",
            alternativas: [
              "Um tipo de prova oral",
              "Recursos como pranchas de figuras, gestos ou aplicativos que ajudam a pessoa a se comunicar",
              "Uma terapia que substitui a escola",
              "Um idioma estrangeiro",
            ],
            correta: 1,
            explicacao:
              "A CAA amplia ou substitui a fala com figuras, gestos, símbolos ou tecnologia, para que o aluno consiga se expressar.",
          },
          {
            id: "com-2-2",
            enunciado: "Usar CAA atrapalha o desenvolvimento da fala?",
            alternativas: [
              "Sim, a criança deixa de tentar falar",
              "Não, os estudos indicam que a CAA não impede e pode até favorecer a fala",
              "Só se for usada na escola",
              "Só em crianças pequenas",
            ],
            correta: 1,
            explicacao:
              "Esse é um mito comum. A CAA dá ao aluno um meio de se comunicar já e não impede o desenvolvimento da fala.",
          },
          {
            id: "com-2-3",
            enunciado: "Um aluno usa uma prancha de figuras. Como o professor pode ajudar?",
            alternativas: [
              "Guardar a prancha durante a aula",
              "Usar a prancha também ao falar com ele e deixá-la sempre ao alcance",
              "Só deixar usar no recreio",
              "Pedir que ele fale em vez de apontar",
            ],
            correta: 1,
            explicacao:
              "Quando o professor também usa a prancha (modelagem), o aluno aprende mais rápido a se comunicar com ela.",
          },
          {
            id: "com-2-4",
            enunciado: "Um aluno não fala. Isso significa que ele não entende o que é dito?",
            alternativas: [
              "Sim, sempre",
              "Não: muitos alunos não verbais entendem bem e precisam de outro meio para responder",
              "Só se ele tiver mais de 10 anos",
              "Sim, por isso não é preciso explicar nada a ele",
            ],
            correta: 1,
            explicacao:
              "Não falar não é o mesmo que não entender. Fale com o aluno normalmente e ofereça formas alternativas de resposta.",
          },
        ],
      },
      {
        id: "comunicacao-3",
        titulo: "Conversa com as famílias",
        perguntas: [
          {
            id: "com-3-1",
            enunciado: "Como começar uma conversa com a família sobre uma dificuldade do aluno?",
            alternativas: [
              "Listando todos os problemas de uma vez",
              "Começando pelos pontos fortes do aluno e pelo que já está funcionando",
              "Sugerindo um diagnóstico",
              "Por mensagem rápida no fim do dia",
            ],
            correta: 1,
            explicacao:
              "Começar pelo que vai bem cria confiança. A família se sente parceira, e não acusada.",
          },
          {
            id: "com-3-2",
            enunciado: 'O professor pode dizer à família que o aluno "tem autismo"?',
            alternativas: [
              "Sim, se ele tiver certeza",
              "Não: diagnóstico é papel de profissionais de saúde; o professor descreve o que observa",
              "Sim, para agilizar o laudo",
              "Só se a família perguntar",
            ],
            correta: 1,
            explicacao:
              "O professor relata comportamentos e situações concretas e pode sugerir uma avaliação. Diagnosticar é papel de médicos e outros profissionais de saúde.",
          },
          {
            id: "com-3-3",
            enunciado: "Qual informação da família mais ajuda o professor?",
            alternativas: [
              "Nenhuma, a escola resolve sozinha",
              "O que acalma o aluno, do que ele gosta e o que funciona em casa",
              "Só a nota do ano anterior",
              "O salário dos pais",
            ],
            correta: 1,
            explicacao:
              "A família conhece o aluno como ninguém. Saber o que acalma, motiva e funciona em casa ajuda a planejar a aula.",
          },
          {
            id: "com-3-4",
            enunciado: "Como manter a família informada ao longo do ano?",
            alternativas: [
              "Só chamando quando houver problema",
              "Com uma comunicação regular, contando também os avanços",
              "Só na reunião de fim de ano",
              "Não é necessário",
            ],
            correta: 1,
            explicacao:
              "Contar os avanços, e não só os problemas, fortalece a parceria e mostra que o trabalho está dando resultado.",
          },
        ],
      },
    ],
  },
  {
    id: "grupo",
    titulo: "Participação em grupo",
    descricao: "Atividades em grupo em que todos participam de verdade.",
    cor: "coral",
    licoes: [
      {
        id: "grupo-1",
        titulo: "Papéis e estrutura",
        perguntas: [
          {
            id: "gru-1-1",
            enunciado:
              "Um aluno tem dificuldade durante atividades em grupo. Qual estratégia pode ajudar?",
            alternativas: [
              "Tirar o aluno da atividade",
              "Aplicar uma punição",
              "Definir papéis claros para cada integrante",
              "Fazer a atividade individualmente",
            ],
            correta: 2,
            explicacao:
              "Papéis claros reduzem a incerteza, dão previsibilidade e deixam cada aluno contribuir a partir das suas forças, sem excluir ninguém.",
          },
          {
            id: "gru-1-2",
            enunciado: "Qual é um bom tamanho de grupo para garantir que todos participem?",
            alternativas: [
              "O maior possível",
              "Grupos pequenos, de 3 a 4 alunos",
              "A turma inteira junta",
              "Duplas fixas o ano todo, sempre iguais",
            ],
            correta: 1,
            explicacao:
              "Em grupos pequenos fica mais difícil alguém ficar de fora, e cada aluno tem mais espaço para falar.",
          },
          {
            id: "gru-1-3",
            enunciado: "Como escolher os papéis de um aluno com dificuldade de escrita?",
            alternativas: [
              "Dar sempre o papel de escritor, para ele treinar",
              "Oferecer papéis em que ele possa contribuir com suas forças, como apresentar ou desenhar",
              "Não dar nenhum papel",
              "Deixar o grupo decidir sem orientação",
            ],
            correta: 1,
            explicacao:
              "Começar pelas forças do aluno garante participação real. Com o tempo, dá para variar os papéis com apoio.",
          },
          {
            id: "gru-1-4",
            enunciado: "O que deixar visível para o grupo durante a atividade?",
            alternativas: [
              "Nada, para não atrapalhar",
              "O objetivo, as etapas, o tempo e o papel de cada um",
              "Só a nota que eles vão tirar",
              "As respostas certas",
            ],
            correta: 1,
            explicacao:
              "Com objetivo, etapas e papéis à vista, o grupo se organiza sozinho e o professor pode circular para apoiar.",
          },
        ],
      },
      {
        id: "grupo-2",
        titulo: "Convivência e conflitos",
        perguntas: [
          {
            id: "gru-2-1",
            enunciado: "Um colega zomba de um aluno com deficiência. O que fazer?",
            alternativas: [
              "Ignorar, é coisa de criança",
              "Intervir na hora com calma e depois conversar sobre respeito com a turma",
              "Trocar o aluno com deficiência de sala",
              "Rir junto para não criar clima ruim",
            ],
            correta: 1,
            explicacao:
              "Agir na hora mostra que o desrespeito não é aceito. Depois, uma conversa sobre diferenças e empatia ajuda a prevenir novos casos.",
          },
          {
            id: "gru-2-2",
            enunciado: "Como ajudar a turma a entender as diferenças entre os colegas?",
            alternativas: [
              "Expor o diagnóstico do aluno para todos",
              "Falar sobre como cada pessoa aprende de um jeito, sem expor ninguém",
              "Não falar sobre o assunto",
              "Pedir que o aluno explique a deficiência dele",
            ],
            correta: 1,
            explicacao:
              "Falar sobre diversidade de forma geral educa a turma sem expor nenhum aluno. Diagnóstico é informação sensível e só a família decide se compartilha.",
          },
          {
            id: "gru-2-3",
            enunciado: "Dois alunos brigam no grupo. Qual é o primeiro passo?",
            alternativas: [
              "Separar e dar zero aos dois",
              "Acalmar a situação e depois ouvir cada um",
              "Deixar resolverem sozinhos",
              "Chamar os pais na hora",
            ],
            correta: 1,
            explicacao:
              "Primeiro, acalmar. Com todos mais tranquilos, ouvir cada lado ajuda a resolver e ensina a lidar com conflitos.",
          },
          {
            id: "gru-2-4",
            enunciado: 'O que é "tutoria entre pares"?',
            alternativas: [
              "Um aluno fazer a tarefa pelo outro",
              "Alunos se ajudarem a aprender, com orientação do professor",
              "Deixar só os melhores alunos trabalharem",
              "Um castigo para quem termina antes",
            ],
            correta: 1,
            explicacao:
              "Na tutoria entre pares, os dois aprendem: quem explica consolida o conteúdo, e quem recebe ajuda tem uma linguagem mais próxima da sua.",
          },
        ],
      },
      {
        id: "grupo-3",
        titulo: "Avaliação em grupo",
        perguntas: [
          {
            id: "gru-3-1",
            enunciado: "Como avaliar um trabalho em grupo de forma justa?",
            alternativas: [
              "Uma nota igual para todos, sem observar a participação",
              "Combinar a nota do grupo com a observação da contribuição de cada um",
              "Dar nota só para quem apresentou",
              "Não avaliar trabalhos em grupo",
            ],
            correta: 1,
            explicacao:
              "Observar a contribuição individual evita que alguém carregue o grupo e valoriza cada forma de participação.",
          },
          {
            id: "gru-3-2",
            enunciado: "O que é autoavaliação no trabalho em grupo?",
            alternativas: [
              "O aluno dar a própria nota final, sem critério",
              "O aluno refletir, com critérios claros, sobre como participou",
              "O professor não avaliar",
              "Os alunos votarem em quem foi pior",
            ],
            correta: 1,
            explicacao:
              'Com critérios simples ("eu ouvi os colegas?", "eu cumpri meu papel?"), a autoavaliação desenvolve a responsabilidade e a reflexão.',
          },
          {
            id: "gru-3-3",
            enunciado: "Um aluno participou do seu jeito, desenhando o cartaz. Ele contribuiu?",
            alternativas: [
              "Não, só conta quem escreveu",
              "Sim, cada forma de contribuição deve ser reconhecida",
              "Só se o desenho estiver perfeito",
              "Não, ele deveria ter apresentado",
            ],
            correta: 1,
            explicacao:
              "Reconhecer diferentes formas de contribuir é inclusão na prática e motiva o aluno a participar mais.",
          },
          {
            id: "gru-3-4",
            enunciado: "Depois da atividade em grupo, o que vale fazer com a turma?",
            alternativas: [
              "Passar direto para a próxima matéria",
              "Uma conversa rápida sobre o que funcionou e o que melhorar",
              "Anunciar só o grupo vencedor",
              "Nada",
            ],
            correta: 1,
            explicacao:
              "Uma conversa curta no fim ajuda a turma a aprender a trabalhar junta e melhora as próximas atividades.",
          },
        ],
      },
    ],
  },
];

export const todasAsLicoes = trilhas.flatMap((t) => t.licoes.map((l) => ({ ...l, trilha: t })));
