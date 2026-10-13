import { describe, expect, it } from "vitest";
import { folhaParaDocx, folhasDoPlano } from "@/lib/folha-atividade";
import { textoDoOffice } from "@/lib/ler-office";
import { montarPedidoDeParte } from "@/lib/plano-partes.server";
import { RefazerParteSchema, completarPlano, limparItens, planoExemplo } from "@/lib/plano-schema";

const comAluno = {
  ...planoExemplo,
  adaptacoes: planoExemplo.adaptacoes.map((a, i) => (i === 0 ? { ...a, aluno: "Aluno 1" } : a)),
};

describe("folhas para os alunos", () => {
  it("cria a folha da turma, a com mais apoio e uma por adaptação", () => {
    const folhas = folhasDoPlano(comAluno, { "Aluno 1": "Lucas Almeida" });
    expect(folhas.map((f) => f.chave)).toEqual(["turma", "apoio", "aluno-0", "aluno-1", "aluno-2"]);
    expect(folhas[2]?.rotulo).toBe("Folha de Lucas");
    expect(folhas[2]?.nome).toBe("Lucas Almeida");
    expect(folhas[1]?.apoios.length).toBeGreaterThan(0);
    expect(folhas[0]?.apoios).toEqual([]);
  });

  it("a folha não diz que é adaptada", () => {
    for (const f of folhasDoPlano(comAluno, { "Aluno 1": "Lucas Almeida" })) {
      expect(f.titulo.toLowerCase()).not.toContain("adapt");
    }
  });

  it("gera o Word da folha com o nome do aluno e os itens", async () => {
    const folha = folhasDoPlano(comAluno, { "Aluno 1": "Lucas Almeida" })[2]!;
    const texto = await textoDoOffice(folhaParaDocx(folha), "docx");
    expect(texto).toContain("Nome: Lucas Almeida");
    expect(texto).toContain(`1. ${folha.itens[0]}`);
  });
});

describe("refazer uma parte do plano", () => {
  const pedido = {
    parte: "etapa" as const,
    titulo: planoExemplo.titulo,
    disciplina: planoExemplo.disciplina,
    serie: planoExemplo.serie,
    duracao: planoExemplo.duracao,
    objetivo: planoExemplo.objetivo,
    etapas: planoExemplo.etapas.map((e) => e.titulo),
    atual: JSON.stringify(planoExemplo.etapas[0]),
    pedido: "mais lúdica",
  };

  it("leva o pedido da professora e a parte atual para a IA", () => {
    expect(RefazerParteSchema.safeParse(pedido).success).toBe(true);
    const texto = montarPedidoDeParte(pedido);
    expect(texto).toContain("Reescreva uma ETAPA");
    expect(texto).toContain("mais lúdica");
    expect(texto).toContain("Abertura com uma situação real");
  });

  it("inclui o perfil anônimo quando é a adaptação de um aluno", () => {
    const texto = montarPedidoDeParte({
      ...pedido,
      parte: "adaptacao",
      pedido: "",
      perfil: {
        rotulo: "Aluno 1",
        serie: "4º ano",
        suporte: "Médio",
        necessidades: ["Apoio visual"],
        tags: [],
        funcionam: [],
        naoFuncionam: ["Barulho"],
        sensorial: [],
        preferencias: ["Dinossauros"],
        caracteristicas: [],
      },
    });
    expect(texto).toContain("Dinossauros");
    expect(texto).toContain("entregue uma alternativa diferente");
  });
});

describe("itens das atividades", () => {
  it("tira a numeração repetida que a IA escreve", () => {
    expect(
      limparItens(["1. Classifique os comandos SQL", "2) Escreva o comando", "3. 3. Observe"]),
    ).toEqual(["Classifique os comandos SQL", "Escreva o comando", "Observe"]);
  });

  it("junta as partes a), b) na mesma questão", () => {
    expect(
      limparItens([
        "1. Complete as categorias das operações:",
        "a) SELECT serve para consultar dados. Categoria: [ DQL ]",
        "b) CREATE serve para criar uma tabela. Categoria: [ ____ ]",
        "2. Desenhe um círculo na instrução correta",
      ]),
    ).toEqual([
      "Complete as categorias das operações:\na) SELECT serve para consultar dados. Categoria: [ DQL ]\nb) CREATE serve para criar uma tabela. Categoria: [ ____ ]",
      "Desenhe um círculo na instrução correta",
    ]);
  });

  it("não mexe em números que fazem parte da questão", () => {
    expect(limparItens(["24 laranjas e 15 maçãs", "2.5 kg de arroz", "10 - 3 = ?"])).toEqual([
      "24 laranjas e 15 maçãs",
      "2.5 kg de arroz",
      "10 - 3 = ?",
    ]);
  });

  it("os planos já salvos também saem sem a numeração dobrada", () => {
    const plano = completarPlano({
      ...planoExemplo,
      atividade: { ...planoExemplo.atividade, itens: ["1. Primeira", "2. Segunda"] },
    });
    expect(plano.atividade.itens).toEqual(["Primeira", "Segunda"]);
  });
});
