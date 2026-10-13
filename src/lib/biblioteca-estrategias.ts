import type { Tom } from "./lume-data";

export type Principio = "Engajamento" | "Representação" | "Ação e expressão";

export type Estrategia = {
  id: string;
  categoria: string;
  titulo: string;
  resumo: string;
  principio: Principio;
  necessidades: string[];
  quandoUsar: string[];
  passos: string[];
  exemplo: string;
  materiais: string[];
  evite: string[];
};

export const CATEGORIAS: { nome: string; cor: Tom }[] = [
  { nome: "Participação", cor: "sky" },
  { nome: "Comunicação", cor: "leaf" },
  { nome: "Organização", cor: "tangerine" },
  { nome: "Regulação emocional", cor: "lilac" },
  { nome: "Adaptações pedagógicas", cor: "coral" },
  { nome: "Avaliação", cor: "sun" },
];

export const corDaCategoria = (categoria: string): Tom =>
  CATEGORIAS.find((c) => c.nome === categoria)?.cor ?? "sky";

export const estrategias: Estrategia[] = [
  {
    id: "papeis-rotativos",
    categoria: "Participação",
    titulo: "Papéis rotativos no grupo",
    resumo: "Cada integrante tem uma função clara, que muda a cada atividade.",
    principio: "Engajamento",
    necessidades: ["Instruções em etapas", "Rotina previsível"],
    quandoUsar: [
      "Trabalhos em grupo em que sempre os mesmos alunos falam.",
      "Alunos que ficam perdidos ou isolados no grupo.",
    ],
    passos: [
      "Escolha 3 ou 4 papéis: relator, cronometrista, organizador do material e quem confere.",
      "Escreva cada papel num cartão com o que ele faz, em uma frase e com um ícone.",
      "Entregue os cartões no começo e explique em voz alta o que cada um faz.",
      "Na próxima atividade, gire os cartões para todos passarem por todos os papéis.",
    ],
    exemplo:
      "No experimento da água, o cronometrista marca 5 minutos, o organizador busca o gelo, o relator anota e quem confere checa se todos entenderam.",
    materiais: ["Cartões dos papéis (cartolina ou papel)", "Cronômetro ou relógio da sala"],
    evite: ["Deixar o aluno com dificuldade sempre no mesmo papel, sem desafio."],
  },
  {
    id: "resposta-em-duplas",
    categoria: "Participação",
    titulo: "Pensar, conversar e compartilhar",
    resumo: "Antes de responder para a turma, o aluno pensa sozinho e conversa com um colega.",
    principio: "Engajamento",
    necessidades: ["Tempo extra", "Comunicação alternativa"],
    quandoUsar: [
      "Perguntas abertas em que poucos levantam a mão.",
      "Alunos tímidos ou que precisam de mais tempo para formular a resposta.",
    ],
    passos: [
      "Faça a pergunta e dê 1 minuto de silêncio para cada um pensar.",
      "Peça que conversem em dupla por 2 minutos.",
      "Chame duplas para compartilhar; a dupla decide quem fala.",
    ],
    exemplo:
      "“Por que a planta da janela cresceu mais?” — 1 minuto para pensar, 2 em dupla, e a dupla conta a ideia dela.",
    materiais: [],
    evite: ["Chamar de surpresa quem ainda não teve tempo de pensar."],
  },
  {
    id: "tutoria-entre-pares",
    categoria: "Participação",
    titulo: "Tutoria entre pares",
    resumo: "Um colega orientado ajuda outro a avançar na tarefa.",
    principio: "Engajamento",
    necessidades: ["Apoio na leitura", "Mais desafio"],
    quandoUsar: [
      "Atividades práticas em que alguns terminam rápido e outros travam.",
      "Alunos com altas habilidades que precisam de novos desafios.",
    ],
    passos: [
      "Escolha tutores e explique como ajudar: perguntar, dar dica, não fazer pelo colega.",
      "Forme duplas estáveis por algumas semanas.",
      "Dê ao tutor um roteiro curto de perguntas, como “o que o problema pede?”.",
      "No fim, os dois contam o que aprenderam.",
    ],
    exemplo:
      "Na resolução de problemas, o tutor lê o enunciado com o colega e pergunta “é de juntar ou de tirar?” antes de qualquer conta.",
    materiais: ["Roteiro de perguntas do tutor"],
    evite: ["Usar o tutor para fazer a tarefa no lugar do colega."],
  },
  {
    id: "participacao-por-cartoes",
    categoria: "Participação",
    titulo: "Respostas com cartões",
    resumo: "Todos respondem ao mesmo tempo levantando cartões, sem exposição.",
    principio: "Ação e expressão",
    necessidades: ["Comunicação alternativa", "Apoio visual"],
    quandoUsar: [
      "Revisões rápidas e perguntas de verdadeiro ou falso.",
      "Alunos que evitam falar em voz alta.",
    ],
    passos: [
      "Entregue cartões com A, B, C, D ou com verde (sim) e vermelho (não).",
      "Faça a pergunta, conte até 3 e todos levantam juntos.",
      "Olhe a turma: se muitos erraram, explique de outro jeito antes de seguir.",
    ],
    exemplo:
      "“A água ferve a 100 graus: verdadeiro ou falso?” Todos levantam o cartão ao mesmo tempo.",
    materiais: ["Cartões coloridos ou com letras"],
    evite: ["Comentar em voz alta quem errou."],
  },
  {
    id: "prancha-de-comunicacao",
    categoria: "Comunicação",
    titulo: "Prancha de comunicação visual",
    resumo: "Cartões com imagens para pedir ajuda, pausa ou banheiro sem precisar falar.",
    principio: "Ação e expressão",
    necessidades: ["Comunicação alternativa", "Apoio visual"],
    quandoUsar: [
      "Alunos não verbais ou com fala ainda em desenvolvimento.",
      "Alunos que travam para pedir ajuda em momentos de ansiedade.",
    ],
    passos: [
      "Escolha 6 a 8 pedidos do dia a dia: ajuda, pausa, banheiro, água, não entendi, terminei.",
      "Monte cartões com imagem e a palavra escrita embaixo.",
      "Deixe a prancha sempre ao alcance do aluno, na mesa ou no estojo.",
      "Use a prancha também quando você falar com ele, para ele aprender pelo exemplo.",
    ],
    exemplo:
      "O aluno aponta o cartão “pausa” e vai ao cantinho da calma por 3 minutos, sem precisar explicar.",
    materiais: ["Imagens impressas ou desenhadas", "Papel-cartão e fita adesiva"],
    evite: ["Guardar a prancha ou deixá-la longe do aluno."],
  },
  {
    id: "instrucao-em-tres-passos",
    categoria: "Comunicação",
    titulo: "Fale, escreva e mostre",
    resumo: "Toda instrução importante é dita, escrita no quadro e demonstrada.",
    principio: "Representação",
    necessidades: ["Instruções em etapas", "Apoio visual"],
    quandoUsar: [
      "Antes de qualquer atividade com mais de uma etapa.",
      "Turmas com alunos que perdem parte da explicação oral.",
    ],
    passos: [
      "Fale a instrução em frases curtas, uma ação por frase.",
      "Escreva no quadro numerada: 1, 2, 3.",
      "Mostre fazendo o primeiro passo.",
      "Peça que um aluno conte com as próprias palavras o que vai fazer.",
    ],
    exemplo:
      "“1. Pegue a folha. 2. Leia o problema com a dupla. 3. Resolva desenhando.” — e você mostra o primeiro problema no quadro.",
    materiais: ["Quadro ou cartaz"],
    evite: ["Perguntar só “entenderam?” e seguir em frente."],
  },
  {
    id: "linguagem-concreta",
    categoria: "Comunicação",
    titulo: "Linguagem direta e concreta",
    resumo: "Pedidos claros, sem ironia nem expressões de duplo sentido.",
    principio: "Representação",
    necessidades: ["Instruções em etapas"],
    quandoUsar: [
      "Alunos que entendem a linguagem ao pé da letra, comuns no TEA.",
      "Combinados e regras da sala.",
    ],
    passos: [
      "Diga o que o aluno deve fazer, não o que não deve: “ande” em vez de “não corra”.",
      "Troque expressões figuradas por pedidos diretos.",
      "Diga quanto: “escreva 3 frases” em vez de “escreva um pouco”.",
    ],
    exemplo: "Em vez de “vamos dar uma caprichada”, diga “passe a limpo as 3 primeiras linhas”.",
    materiais: [],
    evite: ["Ironias e brincadeiras de duplo sentido em momentos de instrução."],
  },
  {
    id: "conversa-com-a-familia",
    categoria: "Comunicação",
    titulo: "Conversa com a família em 4 passos",
    resumo: "Roteiro para falar das dificuldades sem afastar a família.",
    principio: "Engajamento",
    necessidades: [],
    quandoUsar: ["Reuniões individuais com responsáveis.", "Quando surge uma preocupação nova."],
    passos: [
      "Comece pelo que o aluno faz bem e pelo que já está funcionando.",
      "Descreva o que você observou, com exemplos concretos, sem diagnosticar.",
      "Pergunte o que funciona em casa e o que acalma o aluno.",
      "Combine um próximo passo e quando vão conversar de novo.",
    ],
    exemplo:
      "“A Ana adora ajudar os colegas. Notei que ela se agita quando a sala fica barulhenta. Em casa, o que ajuda ela a se acalmar?”",
    materiais: [],
    evite: ["Sugerir um diagnóstico. Isso é papel de profissionais de saúde."],
  },
  {
    id: "rotina-visual",
    categoria: "Organização",
    titulo: "Rotina visual na parede",
    resumo: "A sequência da aula em cartões, com um marcador do momento atual.",
    principio: "Engajamento",
    necessidades: ["Rotina previsível", "Apoio visual"],
    quandoUsar: [
      "Todos os dias, principalmente com alunos que se angustiam com o imprevisto.",
      "Dias com mudanças, como passeio ou prova.",
    ],
    passos: [
      "Faça cartões para cada momento: chegada, leitura, atividade, recreio, saída.",
      "Monte a sequência do dia no começo da aula, junto com a turma.",
      "Mova um marcador, como um prendedor, a cada momento que termina.",
      "Se algo mudar, troque o cartão e avise antes.",
    ],
    exemplo:
      "Antes do recreio, o professor move o prendedor e diz: “terminamos a leitura, agora é a atividade de matemática”.",
    materiais: ["Cartões com imagem e palavra", "Prendedor ou seta"],
    evite: ["Mudar a sequência sem avisar e sem mostrar no quadro."],
  },
  {
    id: "checklist-da-tarefa",
    categoria: "Organização",
    titulo: "Checklist da tarefa",
    resumo: "Uma lista curta que o aluno marca conforme avança.",
    principio: "Ação e expressão",
    necessidades: ["Instruções em etapas", "Pausas frequentes"],
    quandoUsar: [
      "Tarefas com várias partes.",
      "Alunos que esquecem o que fazer ou desistem no meio, comuns no TDAH.",
    ],
    passos: [
      "Divida a tarefa em 3 a 5 passos curtos.",
      "Escreva cada passo com um quadradinho para marcar.",
      "Cole o checklist na mesa ou no caderno do aluno.",
      "Comemore cada passo marcado.",
    ],
    exemplo:
      "□ Ler o texto · □ Grifar 3 palavras novas · □ Responder as perguntas 1 e 2 · □ Mostrar ao professor.",
    materiais: ["Tiras de papel ou adesivos"],
    evite: ["Listas longas, com mais de 5 passos de uma vez."],
  },
  {
    id: "tempo-visivel",
    categoria: "Organização",
    titulo: "Tempo visível",
    resumo: "Um cronômetro ou relógio à vista mostra quanto falta.",
    principio: "Engajamento",
    necessidades: ["Tempo extra", "Pausas frequentes", "Rotina previsível"],
    quandoUsar: ["Atividades com tempo marcado.", "Alunos ansiosos com o fim da tarefa."],
    passos: [
      "Mostre um cronômetro grande ou desenhe um relógio no quadro.",
      "Diga quanto tempo a atividade vai durar.",
      "Avise quando faltar metade e quando faltarem 2 minutos.",
    ],
    exemplo: "Um timer na tela marca 10 minutos para a leitura em dupla.",
    materiais: ["Timer, celular ou relógio de parede"],
    evite: ["Encerrar a atividade de surpresa."],
  },
  {
    id: "mesa-organizada",
    categoria: "Organização",
    titulo: "Lugar estratégico na sala",
    resumo: "Sentar perto do professor e longe de distrações.",
    principio: "Engajamento",
    necessidades: ["Ambiente com menos ruído", "Pausas frequentes"],
    quandoUsar: ["Alunos que se distraem com facilidade.", "Alunos sensíveis a barulho."],
    passos: [
      "Escolha um lugar perto do quadro e longe da porta e da janela.",
      "Deixe na mesa só o material da atividade do momento.",
      "Combine um sinal discreto para quando ele precisar de ajuda.",
    ],
    exemplo:
      "O aluno senta na segunda fila, perto da mesa do professor, ao lado de um colega tranquilo.",
    materiais: [],
    evite: ["Isolar o aluno no fundo ou numa mesa separada da turma."],
  },
  {
    id: "cantinho-da-calma",
    categoria: "Regulação emocional",
    titulo: "Cantinho da calma",
    resumo: "Um espaço previsível para se regular e voltar à atividade.",
    principio: "Engajamento",
    necessidades: ["Pausas frequentes", "Ambiente com menos ruído"],
    quandoUsar: [
      "Alunos que se sobrecarregam com barulho ou frustração.",
      "Antes da crise, quando aparecem os primeiros sinais.",
    ],
    passos: [
      "Monte um canto com almofada, fone abafador e um objeto para apertar.",
      "Apresente o cantinho para a turma toda como um lugar para se acalmar, não de castigo.",
      "Combine com o aluno um tempo de uso, como 5 minutos com o timer.",
      "Quando ele voltar, receba sem comentários e retome a atividade.",
    ],
    exemplo:
      "O aluno mostra o cartão “pausa”, fica 5 minutos no cantinho com o fone e volta para a dupla.",
    materiais: ["Almofada", "Fone abafador", "Bolinha antiestresse", "Timer"],
    evite: ["Usar o cantinho como castigo ou para isolar o aluno."],
  },
  {
    id: "aviso-de-transicao",
    categoria: "Regulação emocional",
    titulo: "Aviso de transição",
    resumo: "Avisar 5 e 2 minutos antes de mudar de atividade.",
    principio: "Engajamento",
    necessidades: ["Rotina previsível"],
    quandoUsar: ["Troca de atividades, saída para o recreio, fim da aula."],
    passos: [
      "Avise: “faltam 5 minutos para terminar”.",
      "Avise de novo com 2 minutos, com um sinal combinado, como uma música ou um gesto.",
      "Diga o que vem depois: “agora é recreio”.",
    ],
    exemplo: "O professor toca um sininho e mostra 2 dedos: faltam 2 minutos para guardar.",
    materiais: ["Sininho, música ou gesto combinado"],
    evite: ["Interromper a atividade de repente."],
  },
  {
    id: "termometro-das-emocoes",
    categoria: "Regulação emocional",
    titulo: "Termômetro das emoções",
    resumo: "Uma escala visual para o aluno mostrar como está se sentindo.",
    principio: "Ação e expressão",
    necessidades: ["Comunicação alternativa", "Apoio visual"],
    quandoUsar: [
      "Na chegada e depois do recreio.",
      "Alunos que têm dificuldade de dizer o que sentem.",
    ],
    passos: [
      "Desenhe um termômetro com 3 cores: verde (tranquilo), amarelo (agitado), vermelho (muito nervoso).",
      "Para cada cor, combine o que fazer: verde segue, amarelo respira, vermelho vai ao cantinho.",
      "Peça que o aluno aponte a cor em momentos combinados.",
    ],
    exemplo:
      "Depois do recreio, o aluno aponta o amarelo e faz 3 respirações lentas antes de começar.",
    materiais: ["Termômetro desenhado em cartolina"],
    evite: ["Julgar a emoção: todas as cores são aceitas."],
  },
  {
    id: "elogio-especifico",
    categoria: "Regulação emocional",
    titulo: "Elogio específico e imediato",
    resumo: "Valorizar o esforço logo depois, dizendo exatamente o que deu certo.",
    principio: "Engajamento",
    necessidades: ["Pausas frequentes"],
    quandoUsar: ["Durante a tarefa, em cada pequeno avanço.", "Alunos com baixa autoestima."],
    passos: [
      "Observe um avanço concreto, mesmo pequeno.",
      "Diga o que ele fez: “você leu as 3 linhas sem parar”.",
      "Faça isso logo depois do avanço, não só no fim da aula.",
    ],
    exemplo: "“Você conferiu a conta antes de me mostrar. Isso é ser cuidadoso!”",
    materiais: [],
    evite: ["Elogios vagos como “muito bem” sem dizer o quê.", "Comparar com os colegas."],
  },
  {
    id: "texto-ampliado",
    categoria: "Adaptações pedagógicas",
    titulo: "Texto ampliado e espaçado",
    resumo: "Letra maior, espaçamento 1,5 e parágrafos curtos.",
    principio: "Representação",
    necessidades: ["Apoio na leitura"],
    quandoUsar: ["Alunos com dislexia ou baixa visão.", "Textos longos para leitura individual."],
    passos: [
      "Use letra sem serifa, tamanho 14 a 16.",
      "Deixe espaçamento 1,5 entre linhas e parágrafos de no máximo 4 linhas.",
      "Destaque em negrito as palavras-chave.",
      "Imprima em papel sem brilho, se possível creme.",
    ],
    exemplo: "A mesma história do livro, digitada em Arial 16, com 3 frases por parágrafo.",
    materiais: ["Computador e impressora"],
    evite: ["Tirar o conteúdo do texto: o texto é o mesmo, só a forma muda."],
  },
  {
    id: "multiplas-formas-de-resposta",
    categoria: "Adaptações pedagógicas",
    titulo: "Múltiplas formas de resposta",
    resumo: "Aceitar áudio, desenho, esquema ou maquete além do texto escrito.",
    principio: "Ação e expressão",
    necessidades: ["Apoio na escrita", "Comunicação alternativa"],
    quandoUsar: [
      "Quando o objetivo não é avaliar a escrita.",
      "Alunos com dificuldade motora ou de escrita.",
    ],
    passos: [
      "Defina o que a atividade quer avaliar, por exemplo entender o ciclo da água.",
      "Ofereça 2 ou 3 formas de mostrar: escrever, desenhar com legenda ou explicar em áudio.",
      "Use os mesmos critérios para todas as formas.",
    ],
    exemplo:
      "Para explicar o ciclo da água, um aluno escreve, outro faz um desenho com setas e outro grava um áudio de 1 minuto.",
    materiais: ["Papel, lápis de cor, celular para gravar"],
    evite: ["Exigir sempre o texto escrito quando ele não é o objetivo."],
  },
  {
    id: "material-concreto",
    categoria: "Adaptações pedagógicas",
    titulo: "Material concreto",
    resumo: "Objetos para manipular antes de passar para a representação no papel.",
    principio: "Representação",
    necessidades: ["Apoio visual", "Instruções em etapas"],
    quandoUsar: ["Matemática: contagem, frações, medidas.", "Conceitos abstratos novos."],
    passos: [
      "Comece com o objeto: tampinhas, palitos, réguas, frutas de papel.",
      "Depois desenhe junto com a turma o que fizeram com o objeto.",
      "Só então passe para a conta ou a escrita.",
    ],
    exemplo: "Para frações, a turma divide uma pizza de papel antes de escrever 1/2 e 1/4.",
    materiais: ["Tampinhas, palitos, papel colorido, tesoura"],
    evite: ["Tirar o material cedo demais de quem ainda precisa dele."],
  },
  {
    id: "banco-de-palavras",
    categoria: "Adaptações pedagógicas",
    titulo: "Banco de palavras",
    resumo: "As palavras importantes da aula à vista, com imagem.",
    principio: "Representação",
    necessidades: ["Apoio na escrita", "Apoio na leitura", "Apoio visual"],
    quandoUsar: ["Produção de texto.", "Conteúdos com vocabulário novo, como ciências."],
    passos: [
      "Escolha 6 a 10 palavras-chave da aula.",
      "Escreva cada uma com uma imagem num cartaz ou no topo da folha.",
      "Leia as palavras com a turma antes de começar.",
    ],
    exemplo:
      "Na aula de estados da água: SÓLIDO (cubo de gelo), LÍQUIDO (copo d’água), GASOSO (vapor da chaleira).",
    materiais: ["Cartaz ou folha impressa"],
    evite: ["Encher o banco com palavras demais."],
  },
  {
    id: "desafio-extra",
    categoria: "Adaptações pedagógicas",
    titulo: "Desafio extra com propósito",
    resumo: "Ir mais fundo no mesmo tema, não fazer mais da mesma coisa.",
    principio: "Engajamento",
    necessidades: ["Mais desafio"],
    quandoUsar: ["Alunos com altas habilidades.", "Quem termina antes e fica ocioso."],
    passos: [
      "Prepare uma pergunta que exige pensar mais: por quê, e se, como provar.",
      "Ofereça um problema aberto ou um pequeno projeto sobre o mesmo tema.",
      "Peça que o aluno apresente a descoberta para a turma.",
    ],
    exemplo:
      "Depois dos problemas de adição, o desafio é criar um problema que tenha duas respostas possíveis.",
    materiais: [],
    evite: ["Dar só mais exercícios iguais como “prêmio” por terminar."],
  },
  {
    id: "avaliacao-por-rubrica",
    categoria: "Avaliação",
    titulo: "Rubrica simples",
    resumo: "Critérios claros, mostrados antes da atividade.",
    principio: "Ação e expressão",
    necessidades: ["Instruções em etapas"],
    quandoUsar: ["Trabalhos, apresentações e produções de texto."],
    passos: [
      "Defina 3 critérios do que importa, por exemplo ideia, organização e capricho.",
      "Para cada um, descreva 3 níveis: começando, quase lá e conseguiu.",
      "Mostre a rubrica antes e use-a para dar o retorno.",
    ],
    exemplo:
      "Critério “explica o ciclo da água”: começando = cita 1 etapa; quase lá = cita 3; conseguiu = explica as 4 em ordem.",
    materiais: ["Rubrica impressa ou no quadro"],
    evite: ["Avaliar coisas que não estavam nos critérios."],
  },
  {
    id: "autoavaliacao-por-carinhas",
    categoria: "Avaliação",
    titulo: "Autoavaliação por carinhas",
    resumo: "O aluno marca como foi a aula para ele, sem precisar escrever.",
    principio: "Engajamento",
    necessidades: ["Comunicação alternativa", "Apoio na escrita"],
    quandoUsar: ["No fim da aula.", "Para planejar quem precisa de retomada."],
    passos: [
      "Entregue uma tira com 3 carinhas: entendi, entendi mais ou menos, não entendi.",
      "Peça que marquem e entreguem ao sair.",
      "Na próxima aula, comece pelos que marcaram “não entendi”.",
    ],
    exemplo: "Ao sair, cada aluno cola a tira na porta com a carinha que marcou.",
    materiais: ["Tiras impressas com carinhas"],
    evite: ["Mostrar para a turma quem marcou cada carinha."],
  },
  {
    id: "prova-adaptada",
    categoria: "Avaliação",
    titulo: "Prova adaptada sem baixar o nível",
    resumo: "Mesmo conteúdo, com forma acessível e tempo justo.",
    principio: "Representação",
    necessidades: ["Tempo extra", "Apoio na leitura", "Ambiente com menos ruído"],
    quandoUsar: ["Provas e testes escritos."],
    passos: [
      "Coloque poucas questões por página, com letra legível e enunciados curtos.",
      "Ofereça tempo extra e, se possível, um lugar com menos barulho.",
      "Leia os enunciados em voz alta quando a leitura não for o que está sendo avaliado.",
      "Mantenha o mesmo conteúdo e o mesmo objetivo da prova da turma.",
    ],
    exemplo:
      "A prova de matemática tem 2 questões por página, e o professor lê cada enunciado para o aluno com dislexia.",
    materiais: ["Prova reformatada"],
    evite: ["Fazer uma prova “mais fácil” com outro conteúdo."],
  },
];

export const estrategiaPorId = (id: string) => estrategias.find((e) => e.id === id);
