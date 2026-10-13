import { crc32 as crc32Node, deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { formatoOffice, textoDoOffice, textoParaBase64 } from "@/lib/ler-office";
import { crc32, provaParaDocx } from "@/lib/prova-docx";
import {
  ConfigProvaSchema,
  alternativasDaProva,
  assinaturaDaProva,
  dividirValor,
  formatarValor,
  nomeArquivo,
  normalizarQuestao,
  numero,
  paraQuestao,
  paraVersao,
  questoesDaFolha,
  type QuestaoGerada,
} from "@/lib/prova-schema";
import {
  montarPedidoDeAdaptacao,
  montarPedidoDeImportacao,
  montarPedidoDeProva,
  montarPedidoDeQuestao,
} from "@/lib/prova.server";

function zip(arquivos: Record<string, string>, comprimir = true) {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let posicao = 0;
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const bruto = Buffer.from(conteudo, "utf8");
    const dados = comprimir ? deflateRawSync(bruto) : bruto;
    const n = Buffer.from(nome, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(comprimir ? 8 : 0, 8);
    local.writeUInt32LE(dados.length, 18);
    local.writeUInt32LE(bruto.length, 22);
    local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(comprimir ? 8 : 0, 10);
    central.writeUInt32LE(dados.length, 20);
    central.writeUInt32LE(bruto.length, 24);
    central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(posicao, 42);
    locais.push(local, n, dados);
    centrais.push(central, n);
    posicao += 30 + n.length + dados.length;
  }
  const diretorio = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(Object.keys(arquivos).length, 8);
  fim.writeUInt16LE(Object.keys(arquivos).length, 10);
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(posicao, 16);
  return new Uint8Array(Buffer.concat([...locais, diretorio, fim]));
}

describe("leitura de Word e PowerPoint", () => {
  it("reconhece o formato pelo nome ou pelo tipo", () => {
    expect(formatoOffice("Plano.DOCX", "")).toBe("docx");
    expect(formatoOffice("aula.pptx", "")).toBe("pptx");
    expect(formatoOffice("prova.pdf", "application/pdf")).toBeNull();
  });

  it("tira o texto dos parágrafos de um .docx", async () => {
    const doc = zip({
      "[Content_Types].xml": "<Types/>",
      "word/document.xml":
        '<w:document><w:body><w:p><w:r><w:t>Frações</w:t></w:r><w:r><w:t xml:space="preserve"> equivalentes</w:t></w:r></w:p><w:p><w:r><w:t>1 &amp; 2 &lt; 3</w:t></w:r></w:p></w:body></w:document>',
    });
    expect(await textoDoOffice(doc, "docx")).toBe("Frações equivalentes\n1 & 2 < 3");
  });

  it("tira o texto dos slides na ordem certa, mesmo sem compressão", async () => {
    const ppt = zip(
      {
        "ppt/slides/slide10.xml": "<p:sld><a:p><a:r><a:t>Décimo</a:t></a:r></a:p></p:sld>",
        "ppt/slides/slide2.xml": "<p:sld><a:p><a:r><a:t>Ciclo da água</a:t></a:r></a:p></p:sld>",
        "ppt/slides/slide1.xml": "<p:sld><a:p><a:r><a:t>Título</a:t></a:r></a:p></p:sld>",
      },
      false,
    );
    expect(await textoDoOffice(ppt, "pptx")).toBe(
      "Slide 1:\nTítulo\n\nSlide 2:\nCiclo da água\n\nSlide 10:\nDécimo",
    );
  });

  it("transforma texto com acento em base64 sem perder nada", () => {
    const b64 = textoParaBase64("Ação e reação");
    expect(Buffer.from(b64, "base64").toString("utf8")).toBe("Ação e reação");
  });
});

const objetiva: QuestaoGerada = {
  tipo: "objetiva",
  enunciado: "Quanto é 1/2 + 1/4?",
  alternativas: ["A) 3/4", "B) 2/6", "C) 1/6", "D) 2/4", "E) 1"],
  correta: 0,
  resposta: "Somando quartos: 2/4 + 1/4 = 3/4.",
  dificuldade: "media",
  habilidade: "Somar frações",
};

describe("questões", () => {
  it("tira as letras das alternativas e respeita a quantidade pedida", () => {
    const q = normalizarQuestao(objetiva, 4);
    expect(q.alternativas).toEqual(["3/4", "2/6", "1/6", "2/4"]);
  });

  it("corrige a alternativa correta fora do intervalo", () => {
    expect(normalizarQuestao({ ...objetiva, correta: 9 }, 4).correta).toBe(0);
  });

  it("objetiva sem alternativas vira dissertativa", () => {
    const q = normalizarQuestao({ ...objetiva, alternativas: [] }, 4);
    expect(q.tipo).toBe("dissertativa");
    expect(q.correta).toBe(-1);
  });

  it("dissertativa ganha linhas conforme a dificuldade", () => {
    const q = paraQuestao(
      { ...objetiva, tipo: "dissertativa", alternativas: [], dificuldade: "dificil" },
      4,
    );
    expect(q.linhas).toBe(8);
    expect(q.valor).toBeNull();
  });

  it("divide o valor da prova sem perder centavos", () => {
    const valores = dividirValor(10, 3);
    expect(valores).toEqual([3.34, 3.33, 3.33]);
    expect(valores.reduce((a, b) => a + b, 0)).toBeCloseTo(10);
  });

  it("lê e escreve valores no formato brasileiro", () => {
    expect(numero("1,5")).toBe(1.5);
    expect(numero("")).toBeNull();
    expect(numero("-2")).toBeNull();
    expect(formatarValor(1.5)).toBe("1,5");
    expect(formatarValor(2)).toBe("2");
  });
});

describe("pedido da prova", () => {
  const base = {
    modo: "criar" as const,
    pedido: "Frações equivalentes e comparação de frações",
    serie: "5º ano",
    disciplina: "Matemática",
    objetivas: 6,
    dissertativas: 2,
    alternativas: 4,
    dificuldade: "misturada" as const,
    anexos: [],
  };

  it("exige ao menos uma questão e algum conteúdo", () => {
    expect(ConfigProvaSchema.safeParse(base).success).toBe(true);
    expect(ConfigProvaSchema.safeParse({ ...base, objetivas: 0, dissertativas: 0 }).success).toBe(
      false,
    );
    expect(ConfigProvaSchema.safeParse({ ...base, pedido: "oi" }).success).toBe(false);
  });

  it("leva as escolhas da professora para a IA", () => {
    const texto = montarPedidoDeProva(base);
    expect(texto).toContain("Questões objetivas: 6, cada uma com 4 alternativas");
    expect(texto).toContain("Questões dissertativas: 2");
    expect(texto).toContain("misturada");
  });

  it("importar uma prova pronta não pede quantidade de questões", () => {
    const importar = { ...base, modo: "importar" as const, objetivas: 0, dissertativas: 0 };
    expect(ConfigProvaSchema.safeParse(importar).success).toBe(true);
    expect(ConfigProvaSchema.safeParse({ ...importar, pedido: "" }).success).toBe(false);
    expect(ConfigProvaSchema.parse({ ...base, modo: undefined }).modo).toBe("criar");
    const texto = montarPedidoDeImportacao(importar);
    expect(texto).toContain("Disciplina: Matemática");
    expect(texto).not.toContain("Questões objetivas");
  });

  it("a prova importada guarda quantas alternativas as questões têm", () => {
    const comCinco = { ...objetiva, alternativas: ["a", "b", "c", "d", "e"] };
    const dissertativa = { ...objetiva, tipo: "dissertativa" as const, alternativas: [] };
    expect(alternativasDaProva([comCinco, objetiva])).toBe(5);
    expect(alternativasDaProva([dissertativa])).toBe(4);
    expect(alternativasDaProva([{ ...objetiva, alternativas: ["a", "b"] }])).toBe(3);
    expect(
      paraQuestao({ ...objetiva, alternativas: ["1", "2", "3", "4", "5", "6"] }, 6).alternativas,
    ).toHaveLength(6);
  });

  it("pede o tipo certo ao trocar uma questão", () => {
    const texto = montarPedidoDeQuestao({
      acao: "trocar_tipo",
      questao: normalizarQuestao(objetiva, 4),
      titulo: "Avaliação de frações",
      disciplina: "Matemática",
      serie: "5º ano",
      alternativas: 4,
      outras: [],
    });
    expect(texto).toContain('O campo "tipo" da resposta deve ser "dissertativa"');
    expect(texto).toContain("(correta) 3/4");
  });
});

describe("versões adaptadas e Word", () => {
  const prova = {
    titulo: "Avaliação de Ciências",
    alternativas: 4,
    origem: "teste",
    cabecalho: {
      escola: "Escola Piloto",
      professor: "Erick",
      disciplina: "Ciências",
      turma: "5º A",
      serie: "5º ano",
      data: "",
      valorTotal: "10",
      instrucoes: "Leia com calma.",
      camposDoAluno: true,
    },
    questoes: [
      { ...paraQuestao(objetiva, 4), id: "q1", valor: 6 },
      {
        ...paraQuestao({ ...objetiva, tipo: "dissertativa", alternativas: [] }, 4),
        id: "q2",
        enunciado: "Explique o ciclo da água.",
        valor: 4,
      },
    ],
  };

  const gerada = {
    aluno: "Aluno 1",
    perfil: "Apoio na leitura",
    orientacoes: ["Ler em voz alta", " "],
    questoes: [
      {
        numero: 1,
        enunciado: "Some: 1/2 + 1/4",
        alternativas: ["3/4", "2/6", "1/6"],
        correta: 0,
        apoio: "1/2 = 2/4",
      },
    ],
  };

  it("mantém todas as questões da prova, mesmo se a IA pular alguma", () => {
    const v = paraVersao(gerada, prova.questoes, "aluno-1");
    expect(v.questoes.map((q) => q.base)).toEqual(["q1", "q2"]);
    expect(v.questoes[0]?.alternativas).toHaveLength(3);
    expect(v.questoes[1]?.enunciado).toBe("Explique o ciclo da água.");
    expect(v.orientacoes).toEqual(["Ler em voz alta"]);
    expect(v.assinatura).toBe(assinaturaDaProva(prova.questoes));
  });

  it("percebe quando a prova mudou depois da versão", () => {
    const mudada = prova.questoes.map((q) =>
      q.id === "q1" ? { ...q, enunciado: "Outra pergunta" } : q,
    );
    expect(assinaturaDaProva(mudada)).not.toBe(assinaturaDaProva(prova.questoes));
  });

  it("a folha da versão usa as questões adaptadas e o apoio", () => {
    const v = paraVersao(gerada, prova.questoes, "aluno-1");
    const folha = questoesDaFolha(prova, v);
    expect(folha[0]?.enunciado).toBe("Some: 1/2 + 1/4");
    expect(folha[0]?.apoio).toBe("1/2 = 2/4");
    expect(folha[0]?.valor).toBe(6);
    expect(questoesDaFolha(prova)[0]?.enunciado).toBe(objetiva.enunciado);
  });

  it("calcula o CRC do zip igual ao do Node", () => {
    const dados = new TextEncoder().encode("Lume é inclusão");
    expect(crc32(dados)).toBe(crc32Node(dados));
  });

  it("gera um .docx que abre e tem o texto da prova", async () => {
    const bytes = provaParaDocx(prova, "prova", undefined, "Ana");
    const texto = await textoDoOffice(bytes, "docx");
    expect(texto).toContain("ESCOLA PILOTO");
    expect(texto).toContain("Nome: Ana");
    expect(texto).toContain("(6 pontos) Quanto é 1/2 + 1/4?");
    expect(texto).toContain("(A) 3/4");
    const gabarito = await textoDoOffice(provaParaDocx(prova, "gabarito"), "docx");
    expect(gabarito).toContain("(A) 3/4");
    expect(gabarito).toContain("Dissertativa");
  });

  it("dá nomes de arquivo sem acentos nem símbolos", () => {
    expect(nomeArquivo("Avaliação: Ciências/5º", "gabarito")).toBe(
      "Avaliacao Ciencias5 - gabarito",
    );
  });

  it("leva os perfis anônimos para a IA, sem nomes", () => {
    const texto = montarPedidoDeAdaptacao({
      titulo: prova.titulo,
      disciplina: "Ciências",
      serie: "5º ano",
      questoes: prova.questoes,
      alunos: [
        {
          rotulo: "Aluno 1",
          serie: "5º ano",
          suporte: "Médio",
          necessidades: ["Apoio na leitura"],
          tags: [],
          funcionam: ["Imagens"],
          naoFuncionam: [],
          sensorial: [],
          preferencias: ["Dinossauros"],
          caracteristicas: [],
        },
      ],
    });
    expect(texto).toContain("Aluno 1");
    expect(texto).toContain("Dinossauros");
    expect(texto).toContain("(correta)");
  });
});
