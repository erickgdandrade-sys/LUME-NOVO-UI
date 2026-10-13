/// <reference types="node" />
import { obterChaveGemini } from "./chaves.server";
import { conversarComGemini } from "./gemini.server";
import { clienteAdmin, segredo, usuarioDoToken } from "./servidor.server";

export const LIMITE_DIARIO = 30;
export const LIMITE_VISITANTE = 10;

export type ModoChat = "conta" | "visitante";

const SISTEMA_VISITANTE = `Você é a Lumis, a assistente da Lume, uma plataforma brasileira de educação inclusiva para escolas. Você está na tela de login e conversa com pessoas que ainda não entraram: diretores e coordenadores interessados, professores convidados e famílias.

Seu jeito: acolhedora, clara e breve. Português do Brasil, linguagem simples. No máximo 2 parágrafos curtos ou uma lista de até 5 itens. Use **negrito** só no essencial.

O que você sabe sobre a Lume:
- Ajuda professores a tornar as aulas mais inclusivas: a IA (você, Lumis) adapta planos de aula e atividades para cada aluno, a partir de texto, PDF ou foto.
- Tem perfis dos alunos (necessidades, o que funciona, o que evitar), biblioteca de estratégias com passo a passo, capacitação para professores em trilhas curtas e painel para a gestão da escola acompanhar o uso e a participação.
- Baseado no Desenho Universal para a Aprendizagem (DUA), na BNCC e na Lei Brasileira de Inclusão.
- Privacidade (LGPD): os nomes dos alunos não são enviados para a IA; o perfil de cada aluno só é visto pelos professores da turma; a gestão vê apenas números; a equipe da Lume não vê os perfis.
- O acesso é por convite da escola: a gestão convida os professores por e-mail, e o professor cria a senha pelo link do convite.
- Para a escola começar a usar, peça uma demonstração em "Agende uma demonstração" (página /demonstracao); a equipe entra em contato.
- Esqueceu a senha: na tela de login, "Esqueceu sua senha?" envia um link por e-mail. Não recebeu o convite: confira o spam e peça para a coordenação reenviar.
- Os planos variam conforme o tamanho da escola. Você não informa preços: diga que a equipe apresenta os valores na demonstração.

Regras:
- Nunca peça nem aceite senhas, e-mails ou dados pessoais. Nunca diga que tem acesso à conta da pessoa.
- Se perguntarem algo do dia a dia de sala de aula, dê uma dica curta e diga que, dentro da Lume, a ajuda é bem mais completa.
- Nunca dê diagnóstico.
- Não invente funções nem prometa prazos ou preços. Se não souber, sugira pedir uma demonstração.
- Se você não conseguir resolver, se for um problema técnico, de acesso à conta, de cobrança ou de créditos, ou se a pessoa pedir para falar com alguém, diga que ela pode falar com a equipe da Lume pelo botão logo abaixo da conversa e termine a resposta com a marca [FALAR_COM_EQUIPE] sozinha na última linha.
- Fora de educação ou da Lume, responda em uma frase que você só ajuda com esses assuntos.`;

async function resumoDaOrigem(ip: string) {
  const sal = (segredo("SUPABASE_SERVICE_ROLE_KEY") ?? "lume").slice(-16);
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`chat:${sal}:${ip}`),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64);
}

export type MensagemChat = { autor: "professor" | "lumis"; texto: string };
export type RespostaChat =
  { ok: true; texto: string; restantes: number | null } | { ok: false; erro: string };

const SISTEMA = `Você é a Lumis, a assistente da Lume, uma plataforma brasileira de educação inclusiva usada por professores e gestores escolares.

Seu jeito: acolhedora, prática e direta, como uma colega experiente de sala de aula. Escreva em português do Brasil, em linguagem simples, sem jargão. Responda em no máximo 3 parágrafos curtos ou uma lista de até 5 itens. Use **negrito** só para destacar o essencial.

Você ajuda com dois tipos de dúvida:
1. Educação inclusiva na prática: TEA, TDAH, dislexia, deficiências, altas habilidades, DUA, adaptação de atividades e provas, rotina, regulação emocional, conversa com famílias, direitos (LBI, Lei Berenice Piana, Lei 14.254, AEE). Dê sugestões concretas, aplicáveis amanhã, com materiais comuns de escola pública.
2. Como usar a Lume:
- Alunos: em "Alunos", "Cadastrar aluno" abre um cadastro em 4 etapas; só nome e idade são obrigatórios; dá para salvar e completar depois. O professor escolhe a turma do aluno.
- Planejamento: cole o plano de aula ou anexe PDF/foto, escolha os alunos e clique em "Adaptar aula com IA". Cada adaptação usa 1 crédito da escola. Os nomes dos alunos não vão para a IA.
- Biblioteca: estratégias com passo a passo; dá para salvar, "Usar com um aluno" (vai para "O que funciona" no perfil) e "Planejar uma aula com ela".
- Capacitação: trilhas no estilo Duolingo; errou, a pergunta volta no fim; terminar a lição libera a próxima.
- Gestor: painel com plano e créditos, pontos de atenção, alunos por turma (sem dados sensíveis), professores e turmas. Quando os créditos acabam, o gestor pode liberar o uso extra, cobrado à parte.
- Meus dados: explica quem vê o quê e permite baixar uma cópia dos dados.

Regras:
- Nunca dê diagnóstico nem diga que um aluno "tem" uma condição. Descreva o que observar e sugira conversar com a família e procurar um profissional de saúde.
- Nunca sugira punição, exclusão da atividade, exposição do aluno ou redução de expectativa.
- Se a pessoa escrever o nome de um aluno, não repita o nome e lembre, com gentileza, de usar só iniciais.
- Se não souber algo sobre a Lume, diga que não sabe e sugira falar com a coordenação. Não invente funções.
- Se você não conseguir resolver, se for um problema técnico, de acesso à conta, de cobrança ou de créditos, ou se a pessoa pedir para falar com alguém, diga que ela pode falar com a equipe da Lume pelo botão logo abaixo da conversa e termine a resposta com a marca [FALAR_COM_EQUIPE] sozinha na última linha.
- Fora de educação ou da Lume, responda em uma frase que você só ajuda com esses assuntos.`;

function montarConversa(historico: MensagemChat[], pergunta: string) {
  const anteriores = historico
    .slice(-10)
    .map((m) => `${m.autor === "professor" ? "Professor(a)" : "Lumis"}: ${m.texto}`)
    .join("\n\n");
  return `${anteriores ? `Conversa até agora:\n\n${anteriores}\n\n` : ""}Nova pergunta do(a) professor(a):\n${pergunta}`;
}

export async function responderNoChat(
  token: string | undefined,
  historico: MensagemChat[],
  pergunta: string,
  visitante: string,
  modo: ModoChat = "conta",
): Promise<RespostaChat> {
  const chave = await obterChaveGemini();
  if (!chave) return { ok: false, erro: "A Lumis ainda não foi ativada neste servidor." };

  let restantes: number | null = null;
  const admin = clienteAdmin();
  if (admin && modo === "visitante") {
    const { data, error } = await admin.rpc("contar_pergunta_visitante", {
      p_origem: await resumoDaOrigem(visitante),
      p_limite: LIMITE_VISITANTE,
    });
    if (error) {
      console.error("chat visitante: falhou ao contar", error.code, error.message);
      return { ok: false, erro: "A Lumis não conseguiu responder agora. Tente de novo." };
    }
    const r = data as { ok: boolean; usadas: number; limite: number };
    if (!r.ok) {
      return {
        ok: false,
        erro: "Você chegou ao limite de perguntas de hoje. Para saber mais, peça uma demonstração.",
      };
    }
    restantes = r.limite - r.usadas;
  } else if (admin) {
    const usuario = token ? await usuarioDoToken(admin, token) : null;
    if (!usuario) {
      return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
    }
    const { data, error } = await admin.rpc("contar_pergunta_lumis", {
      p_usuario: usuario.id,
      p_limite: LIMITE_DIARIO,
    });
    if (error) {
      console.error("chat: falhou ao contar", error.code, error.message);
      return { ok: false, erro: "A Lumis não conseguiu responder agora. Tente de novo." };
    }
    const r = data as { ok: boolean; usadas: number; limite: number };
    if (!r.ok) {
      return {
        ok: false,
        erro: `Você já fez as ${r.limite} perguntas de hoje. A Lumis volta a responder amanhã.`,
      };
    }
    restantes = r.limite - r.usadas;
  } else {
    const { consumirAdaptacao } = await import("./limite-uso.server");
    const limite = consumirAdaptacao(`chat:${visitante}`);
    if (!limite.ok) {
      return {
        ok: false,
        erro: `Muitas perguntas seguidas. Tente de novo em ${limite.minutos} min.`,
      };
    }
  }

  const resposta = await conversarComGemini(
    chave,
    modo === "visitante" ? SISTEMA_VISITANTE : SISTEMA,
    montarConversa(historico, pergunta),
  );
  return resposta.ok ? { ok: true, texto: resposta.texto, restantes } : resposta;
}
