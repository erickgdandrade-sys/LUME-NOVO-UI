import { obterChaveGemini } from "./chaves.server";
import {
  AdaptacaoSchema,
  AtividadeSchema,
  EtapaSchema,
  limparItens,
  type RefazerParte,
  type RefazerParteResposta,
} from "./plano-schema";
import { descreverAlunos } from "./prompt-aula.server";

const INSTRUCOES_PARTE = `Você é uma especialista em educação inclusiva no Brasil, com domínio do Desenho Universal para a Aprendizagem (DUA) e da BNCC. Uma professora está revisando um plano de aula já adaptado e pediu para você reescrever UMA parte dele.

Regras:
- Reescreva só a parte pedida, coerente com o resto do plano (mesmo conteúdo, objetivo, série e duração).
- Se a professora disse o que quer mudar, isso é o mais importante: siga o pedido dela.
- Se ela não disse nada, entregue uma alternativa diferente da atual, igualmente concreta e pronta para aplicar.
- Português do Brasil, linguagem simples de sala de aula, sem jargão. Nada genérico: tudo específico para esta aula.
- Nunca sugira punição, exclusão da atividade, exposição do aluno ou redução de expectativa.
- Etapa: o título inclui o tempo, ex.: "Abertura (10 min)", mantendo o tempo da etapa atual; a descrição diz o que a professora faz e fala e o que os alunos fazem; "inclusao" diz como incluir todos nesse momento.
- Atividade: itens com o conteúdo real; a versão com mais apoio é a MESMA atividade já reescrita, com linguagem mais simples, palavras-chave em MAIÚSCULAS e o primeiro item como exemplo resolvido; "apoios" traz pronto o que acompanha a folha.
- Matemática e símbolos: escreva em texto simples, com símbolos legíveis (→, ∞, ≤, ≥, ≠, ², ³, √, π, ½). NUNCA use LaTeX, cifrões ou comandos com barra invertida.
- Questões com várias partes: comece cada parte com a), b), c)… (o sistema organiza em lista, com espaço para cada resposta). Use no máximo 5 partes por questão; se precisar de mais, divida em outra questão.
- A folha do aluno é impressa só com texto. Se uma questão depender de gráfico, figura ou tabela que está no material da professora, diga isso no enunciado entre parênteses, ex.: "(use o Gráfico 1 da lista original)", e não invente o que a figura mostra. Quando der, descreva os dados em texto.
- Nos itens de atividades, não escreva número nem letra na frente (a numeração é automática); partes (a, b, c) e alternativas ficam dentro do mesmo item.
- A atividade de um aluno e a versão com mais apoio têm os mesmos itens da atividade principal, na mesma quantidade, sem tirar conteúdo.
- Adeque o tom à idade da turma: com adolescentes e adultos, nada de recursos infantis.
- Adaptação de um aluno: baseie-se primeiro nas necessidades, no que funciona e no que evitar; use os interesses dele como tema quando possível; mantenha o rótulo do aluno no campo "aluno"; o campo "perfil" descreve necessidades, não diagnóstico.`;

const SCHEMAS = { etapa: EtapaSchema, atividade: AtividadeSchema, adaptacao: AdaptacaoSchema };

const NOMES = {
  etapa: "uma ETAPA do passo a passo",
  atividade: "a ATIVIDADE principal da aula",
  adaptacao: "a ADAPTAÇÃO para um aluno",
};

export function montarPedidoDeParte(r: RefazerParte) {
  return `<plano>
Título: ${r.titulo}
Disciplina: ${r.disciplina || "não informada"}
Série: ${r.serie || "não informada"}
Duração: ${r.duracao || "não informada"}
Objetivo: ${r.objetivo || "não informado"}
Etapas: ${r.etapas.join(" · ") || "não informadas"}
</plano>

<tarefa>
Reescreva ${NOMES[r.parte]}.
</tarefa>

<parte_atual>
${r.atual}
</parte_atual>

<pedido_da_professora>
${r.pedido || "(não disse o que mudar: entregue uma alternativa diferente da atual)"}
</pedido_da_professora>${r.perfil ? `\n\n<aluno>\n${descreverAlunos([r.perfil])}\n</aluno>` : ""}`;
}

export async function refazerParteComIA(r: RefazerParte): Promise<RefazerParteResposta> {
  const chave = await obterChaveGemini();
  if (!chave) {
    return {
      ok: false,
      erro: "Nenhuma IA configurada. Cadastre a chave GEMINI_API_KEY como segredo na hospedagem.",
    };
  }
  const { gerarJsonComGemini, schemaParaGemini } = await import("./gemini.server");
  const resposta = await gerarJsonComGemini(chave, {
    sistema: INSTRUCOES_PARTE,
    pedido: montarPedidoDeParte(r),
    schema: schemaParaGemini(SCHEMAS[r.parte]),
    tempoTotal: 90_000,
  });
  if (!resposta.ok) return resposta;
  try {
    const json: unknown = JSON.parse(resposta.texto);
    if (r.parte === "etapa") return { ok: true, parte: "etapa", etapa: EtapaSchema.parse(json) };
    if (r.parte === "atividade") {
      const atividade = AtividadeSchema.parse(json);
      return {
        ok: true,
        parte: "atividade",
        atividade: {
          ...atividade,
          itens: limparItens(atividade.itens),
          versaoAdaptada: limparItens(atividade.versaoAdaptada),
        },
      };
    }
    const adaptacao = AdaptacaoSchema.parse(json);
    return {
      ok: true,
      parte: "adaptacao",
      adaptacao: {
        ...adaptacao,
        aluno: r.perfil?.rotulo ?? adaptacao.aluno,
        atividade: limparItens(adaptacao.atividade),
      },
    };
  } catch (error) {
    console.error("Parte do plano fora do formato:", resposta.texto.slice(0, 500), error);
    return { ok: false, erro: "A resposta da IA veio incompleta. Tente de novo." };
  }
}
