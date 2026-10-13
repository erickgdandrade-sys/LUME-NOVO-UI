import { obterChaveGemini } from "./chaves.server";
import {
  MAX_ALTERNATIVAS_IMPORTADAS,
  NOME_DIFICULDADE,
  ProvaGeradaSchema,
  QuestaoGeradaSchema,
  VersoesGeradasSchema,
  normalizarQuestao,
  type AdaptarProva,
  type AdaptarProvaResposta,
  type ConfigProva,
  type GerarProvaResposta,
  type RefazerQuestao,
  type RefazerQuestaoResposta,
} from "./prova-schema";
import { descreverAlunos } from "./prompt-aula.server";

export const INSTRUCOES_ADAPTAR_PROVA = `Você é uma especialista em educação inclusiva e em avaliação escolar no Brasil, com domínio do Desenho Universal para a Aprendizagem (DUA) e da Lei Brasileira de Inclusão.

Sua tarefa: a partir da prova da turma, criar UMA versão adaptada para cada aluno recebido.

Princípio: é a MESMA prova. O aluno é avaliado nos MESMOS conteúdos e habilidades. Você muda a FORMA de acesso, não o QUE é avaliado. Nunca deixe a prova mais fácil no conteúdo, nunca tire questões e nunca troque o assunto.

Regras:
- Cada versão tem EXATAMENTE as mesmas questões, na mesma ordem e com o mesmo tipo. Em "numero", use o número da questão original.
- Baseie-se primeiro nas necessidades observadas, no que funciona e no que evitar para cada aluno. O diagnóstico, quando houver, é só complementar.
- Ajustes possíveis, escolhidos conforme o perfil de cada aluno:
  - enunciado mais curto e direto, uma instrução por frase, palavras-chave em MAIÚSCULAS;
  - dividir a pergunta em passos menores (a, b, c);
  - usar os interesses do aluno como contexto, desde que não mude o conteúdo avaliado;
  - nas objetivas, reduzir para 3 alternativas quando o perfil indicar dificuldade de leitura ou de atenção, mantendo a correta e os distratores mais importantes;
  - nas dissertativas, oferecer estrutura: começo de frase, tópicos para completar, ou a opção de responder com desenho ou esquema.
- Em "apoio", escreva já pronto o que vai impresso junto da questão: banco de palavras, exemplo resolvido curto, começo de resposta, lembrete do conceito. Deixe vazio quando a questão não precisar.
- Em "correta", informe a posição da alternativa correta na NOVA lista de alternativas (começando em 0). Confira que a alternativa correta continua certa.
- Respeite o que evitar para o aluno.
- Em "orientacoes", escreva de 2 a 5 orientações concretas para a professora aplicar a prova a esse aluno (ex.: ler os enunciados em voz alta, tempo extra, local mais calmo, conferir se entendeu a pergunta). Nunca sugira exposição, punição ou separar o aluno da turma.
- Em "perfil", descreva as necessidades (ex.: "Apoio na leitura e tempo extra"), nunca rotule o aluno por diagnóstico.
- Use o rótulo do aluno exatamente como recebido no campo "aluno".
- Português do Brasil, linguagem simples.`;

export function montarPedidoDeAdaptacao(r: AdaptarProva) {
  const questoes = r.questoes
    .map((q, i) =>
      [
        `${i + 1}. [${q.tipo}] ${q.enunciado}`,
        q.tipo === "objetiva"
          ? q.alternativas.map((a, j) => `   ${j === q.correta ? "(correta) " : ""}${a}`).join("\n")
          : null,
        q.habilidade ? `   Avalia: ${q.habilidade}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  return `<prova>
Título: ${r.titulo || "não informado"}
Disciplina: ${r.disciplina || "não informada"}
Série: ${r.serie || "não informada"}

${questoes}
</prova>

<alunos>
${descreverAlunos(r.alunos)}
</alunos>`;
}

export async function adaptarProvaComIA(r: AdaptarProva): Promise<AdaptarProvaResposta> {
  const chave = await obterChaveGemini();
  if (!chave) return { ok: false, erro: SEM_IA };
  const { gerarJsonComGemini, schemaParaGemini } = await import("./gemini.server");
  const resposta = await gerarJsonComGemini(chave, {
    sistema: INSTRUCOES_ADAPTAR_PROVA,
    pedido: montarPedidoDeAdaptacao(r),
    schema: schemaParaGemini(VersoesGeradasSchema),
  });
  if (!resposta.ok) return resposta;
  try {
    const { versoes } = VersoesGeradasSchema.parse(JSON.parse(resposta.texto));
    const rotulos = new Set(r.alunos.map((a) => a.rotulo));
    const validas = versoes.filter((v) => rotulos.has(v.aluno) && v.questoes.length);
    if (!validas.length) throw new Error("nenhuma versão");
    return { ok: true, versoes: validas };
  } catch (error) {
    console.error("Versões do Gemini fora do formato:", resposta.texto.slice(0, 500), error);
    return { ok: false, erro: "A resposta da IA veio incompleta. Tente de novo." };
  }
}

const REGRAS = `Regras para TODAS as questões (a prova já nasce acessível, no Desenho Universal para a Aprendizagem):
- Português do Brasil, linguagem clara e adequada à série. Frases curtas, uma ideia por enunciado.
- Sem pegadinhas, sem dupla negação e sem perguntas do tipo "qual NÃO é…", a não ser que a professora peça.
- Contextos do dia a dia dos alunos, com nomes fictícios e diversos. Nunca use nomes de alunos ou de pessoas que apareçam nos anexos.
- Objetivas: exatamente uma alternativa correta; alternativas com tamanho e estrutura parecidos; distratores plausíveis, baseados em erros comuns de quem está aprendendo esse conteúdo; nunca "todas as anteriores" ou "nenhuma das anteriores"; não escreva a letra na frente da alternativa. Varie a posição da alternativa correta entre as questões.
- Dissertativas: diga com clareza o que o aluno deve fazer (explicar, comparar, dar um exemplo, justificar). Em "resposta", escreva a resposta esperada e os critérios para dar nota total ou parcial.
- Matemática e símbolos: escreva em texto simples, com símbolos legíveis (→, ∞, ≤, ≥, ≠, ², √, π, ½). NUNCA use LaTeX, cifrões ou comandos com barra invertida.
- A prova é impressa só com texto. Se uma questão depender de gráfico ou figura do material da professora, diga no enunciado qual usar, ex.: "(use o Gráfico 1 do material)", e não invente o que a figura mostra.
- Avalie o que foi trabalhado: use o conteúdo real dos anexos e do pedido, sem inventar assuntos que não estejam ali.
- Em "habilidade", diga em poucas palavras o que a questão avalia.`;

export const INSTRUCOES_PROVA = `Você é uma especialista em avaliação escolar e em educação inclusiva no Brasil, com domínio da BNCC e do Desenho Universal para a Aprendizagem (DUA).

Sua tarefa: montar uma prova a partir do material que a professora enviou (plano de aula, slides, texto, atividade ou foto) e das escolhas dela.

${REGRAS}
- Faça EXATAMENTE a quantidade de questões objetivas e dissertativas pedida, primeiro as objetivas e depois as dissertativas.
- Cada objetiva tem EXATAMENTE o número de alternativas pedido.
- Siga a dificuldade pedida. Se for "misturada", comece pelas mais fáceis e termine com as mais difíceis, com cerca de um terço de cada nível.
- Cubra os principais conteúdos do material, sem repetir a mesma ideia em duas questões.
- Em "instrucoes", escreva de 2 a 4 orientações curtas para o aluno (ex.: "Leia cada questão com calma.").
- Se a série ou a disciplina não forem informadas, deduza pelo material.`;

export const INSTRUCOES_IMPORTAR_PROVA = `Você é uma especialista em avaliação escolar no Brasil. A professora enviou uma prova que JÁ ESTÁ PRONTA (arquivo, foto ou texto colado). Sua tarefa é TRANSCREVER essa prova para o sistema, sem criar uma prova nova.

Regras:
- Copie TODAS as questões, na mesma ordem, com o texto o mais fiel possível ao original. Não invente, não tire e não junte questões. Não mude o conteúdo nem a dificuldade.
- Pode corrigir só erros evidentes de digitação ou de leitura do arquivo (ex.: letras trocadas por causa da foto).
- Questão com alternativas (a, b, c…) é "objetiva": coloque as alternativas sem a letra na frente. Questão de resposta escrita, de completar, de relacionar ou de cálculo é "dissertativa".
- Se a questão tiver um texto de apoio (texto, poema, problema), ele vai no começo do enunciado, antes da pergunta.
- Se a questão tiver partes a), b), c) que NÃO são alternativas, mantenha tudo no mesmo enunciado, cada parte em uma linha começando com a), b), c).
- Gabarito: se a prova trouxer o gabarito, use-o. Se não trouxer, descubra a alternativa correta e, em "resposta", comece com "Gabarito sugerido pela Lumis: confira." e explique em 1 ou 2 frases. Nas dissertativas, escreva a resposta esperada e os critérios de correção.
- Matemática e símbolos: escreva em texto simples, com símbolos legíveis (→, ∞, ≤, ≥, ≠, ², √, π, ½). NUNCA use LaTeX, cifrões ou comandos com barra invertida.
- Se uma questão depender de figura, gráfico ou mapa, não invente o que a imagem mostra: escreva no enunciado, entre parênteses, "(use a figura da prova original)" e, quando der, descreva os dados em texto.
- Não copie nomes de alunos nem dados pessoais que apareçam no arquivo.
- Em "titulo", use o título da prova ou monte um curto com a disciplina e o assunto. Em "instrucoes", copie as instruções da prova; se não houver, escreva de 2 a 3 instruções curtas.
- Em "habilidade", diga em poucas palavras o que a questão avalia. Em "dificuldade", estime pelo conteúdo.
- Se a série ou a disciplina não forem informadas, deduza pela prova.`;

export function montarPedidoDeImportacao(c: ConfigProva) {
  const arquivos = c.anexos.length
    ? `\n\n<arquivos_anexados>\n${c.anexos.map((a, i) => `${i + 1}. ${a.nome}`).join("\n")}\n</arquivos_anexados>`
    : "";
  return `<prova_ou_observacoes_da_professora>
${c.pedido || "(a professora não escreveu: a prova está nos arquivos anexados)"}
</prova_ou_observacoes_da_professora>

<escolhas>
Série: ${c.serie || "não informada"}
Disciplina: ${c.disciplina || "não informada"}
</escolhas>${arquivos}`;
}

const INSTRUCOES_QUESTAO = `Você é uma especialista em avaliação escolar e em educação inclusiva no Brasil. Você vai reescrever UMA questão de uma prova que a professora está editando.

${REGRAS}`;

const NOME_DA_DIFICULDADE_DA_PROVA: Record<ConfigProva["dificuldade"], string> = {
  facil: "fácil",
  media: "média",
  dificil: "difícil",
  misturada: "misturada (do fácil ao difícil)",
};

export function montarPedidoDeProva(c: ConfigProva) {
  const arquivos = c.anexos.length
    ? `\n\n<arquivos_anexados>\n${c.anexos.map((a, i) => `${i + 1}. ${a.nome}`).join("\n")}\n</arquivos_anexados>`
    : "";
  return `<pedido_da_professora>
${c.pedido || "(a professora não escreveu: use os arquivos anexados)"}
</pedido_da_professora>

<escolhas>
Série: ${c.serie || "não informada"}
Disciplina: ${c.disciplina || "não informada"}
Questões objetivas: ${c.objetivas}${c.objetivas ? `, cada uma com ${c.alternativas} alternativas` : ""}
Questões dissertativas: ${c.dissertativas}
Dificuldade: ${NOME_DA_DIFICULDADE_DA_PROVA[c.dificuldade]}
</escolhas>${arquivos}`;
}

export function montarPedidoDeQuestao(r: RefazerQuestao) {
  const q = r.questao;
  const tipoNovo =
    r.acao === "trocar_tipo" ? (q.tipo === "objetiva" ? "dissertativa" : "objetiva") : q.tipo;
  const tarefa =
    r.acao === "trocar_tipo"
      ? `Transforme a questão abaixo em uma questão ${tipoNovo.toUpperCase()}, avaliando o MESMO conteúdo e a MESMA habilidade, com a mesma dificuldade.`
      : `Crie uma questão NOVA, também ${tipoNovo.toUpperCase()}, sobre o mesmo conteúdo e a mesma habilidade da questão abaixo, com a mesma dificuldade, mas diferente dela e das outras questões da prova.`;
  const original = [
    `Tipo: ${q.tipo}`,
    `Dificuldade: ${NOME_DIFICULDADE[q.dificuldade]}`,
    q.habilidade ? `Avalia: ${q.habilidade}` : null,
    `Enunciado: ${q.enunciado}`,
    q.tipo === "objetiva" && q.alternativas.length
      ? `Alternativas:\n${q.alternativas.map((a, i) => `${i === q.correta ? "(correta) " : ""}${a}`).join("\n")}`
      : null,
    q.resposta ? `Resposta esperada: ${q.resposta}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const outras = r.outras.length
    ? `\n\n<outras_questoes_da_prova>\n${r.outras.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n</outras_questoes_da_prova>`
    : "";
  return `<prova>
Título: ${r.titulo || "não informado"}
Disciplina: ${r.disciplina || "não informada"}
Série: ${r.serie || "não informada"}
</prova>

<tarefa>
${tarefa}
O campo "tipo" da resposta deve ser "${tipoNovo}".${tipoNovo === "objetiva" ? ` Use exatamente ${r.alternativas} alternativas.` : ""}
</tarefa>

<questao_atual>
${original}
</questao_atual>${outras}`;
}

const SEM_IA =
  "Nenhuma IA configurada. Cadastre a chave GEMINI_API_KEY como segredo na hospedagem.";

export async function gerarProvaComIA(c: ConfigProva): Promise<GerarProvaResposta> {
  const chave = await obterChaveGemini();
  if (!chave) return { ok: false, erro: SEM_IA };
  const { gerarJsonComGemini, schemaParaGemini } = await import("./gemini.server");
  const importar = c.modo === "importar";
  const r = await gerarJsonComGemini(chave, {
    sistema: importar ? INSTRUCOES_IMPORTAR_PROVA : INSTRUCOES_PROVA,
    pedido: importar ? montarPedidoDeImportacao(c) : montarPedidoDeProva(c),
    anexos: c.anexos,
    schema: schemaParaGemini(ProvaGeradaSchema),
  });
  if (!r.ok) return r;
  try {
    const prova = ProvaGeradaSchema.parse(JSON.parse(r.texto));
    const questoes = prova.questoes.map((q) =>
      normalizarQuestao(q, importar ? MAX_ALTERNATIVAS_IMPORTADAS : c.alternativas),
    );
    if (!questoes.length) throw new Error("prova sem questões");
    return { ok: true, prova: { ...prova, questoes } };
  } catch (error) {
    console.error("Prova do Gemini fora do formato:", r.texto.slice(0, 500), error);
    return { ok: false, erro: "A resposta da IA veio incompleta. Tente de novo." };
  }
}

export async function refazerQuestaoComIA(r: RefazerQuestao): Promise<RefazerQuestaoResposta> {
  const chave = await obterChaveGemini();
  if (!chave) return { ok: false, erro: SEM_IA };
  const { gerarJsonComGemini, schemaParaGemini } = await import("./gemini.server");
  const resposta = await gerarJsonComGemini(chave, {
    sistema: INSTRUCOES_QUESTAO,
    pedido: montarPedidoDeQuestao(r),
    schema: schemaParaGemini(QuestaoGeradaSchema),
    tempoTotal: 60_000,
  });
  if (!resposta.ok) return resposta;
  try {
    const tipoNovo =
      r.acao === "trocar_tipo"
        ? r.questao.tipo === "objetiva"
          ? "dissertativa"
          : "objetiva"
        : r.questao.tipo;
    const q = QuestaoGeradaSchema.parse(JSON.parse(resposta.texto));
    const questao = normalizarQuestao({ ...q, tipo: tipoNovo }, r.alternativas);
    if (questao.tipo !== tipoNovo || !questao.enunciado.trim()) throw new Error("tipo errado");
    return { ok: true, questao };
  } catch (error) {
    console.error("Questão do Gemini fora do formato:", resposta.texto.slice(0, 500), error);
    return { ok: false, erro: "A resposta da IA veio incompleta. Tente de novo." };
  }
}
