import { describe, expect, it } from "vitest";
import { AdaptarAulaInputSchema, completarPlano, planoExemplo } from "@/lib/plano-schema";
import { montarPedido } from "@/lib/prompt-aula.server";

const perfil = {
  rotulo: "Aluno 1",
  serie: "4º ano",
  suporte: "Médio",
  necessidades: ["Apoio visual"],
  tags: [],
  funcionam: ["Instruções curtas"],
  naoFuncionam: [],
  sensorial: [],
  preferencias: ["Gosta de dinossauros"],
  caracteristicas: ["Curioso"],
};

describe("pedido para a Lumis", () => {
  it("leva as preferências e características do aluno, sem nome", () => {
    const pedido = montarPedido("Aula de frações para o 4º ano com material concreto", [perfil]);
    expect(pedido).toContain("Preferências e interesses: Gosta de dinossauros");
    expect(pedido).toContain("Características: Curioso");
    expect(pedido).toContain("Aluno 1");
  });

  it("avisa quais arquivos foram anexados e usa os anexos quando não há texto", () => {
    const pedido = montarPedido("", [], ["prova-ciencias.pdf"]);
    expect(pedido).toContain("prova-ciencias.pdf");
    expect(pedido).toContain("use os arquivos anexados");
  });
});

describe("entrada da adaptação", () => {
  const anexo = { nome: "atividade.pdf", tipo: "application/pdf" as const, dados: "JVBERi0=" };

  it("aceita só um anexo, sem texto", () => {
    expect(
      AdaptarAulaInputSchema.safeParse({ plano: "", alunos: [], anexos: [anexo] }).success,
    ).toBe(true);
  });

  it("recusa pedido sem texto e sem anexo", () => {
    expect(AdaptarAulaInputSchema.safeParse({ plano: "oi", alunos: [] }).success).toBe(false);
  });

  it("recusa tipo de arquivo não aceito e mais de 3 anexos", () => {
    const exe = { ...anexo, tipo: "application/x-msdownload" };
    expect(AdaptarAulaInputSchema.safeParse({ plano: "", alunos: [], anexos: [exe] }).success).toBe(
      false,
    );
    expect(
      AdaptarAulaInputSchema.safeParse({
        plano: "",
        alunos: [],
        anexos: [anexo, anexo, anexo, anexo],
      }).success,
    ).toBe(false);
  });

  it("perfis antigos, sem preferências, continuam valendo", () => {
    const { preferencias: _p, caracteristicas: _c, ...antigo } = perfil;
    const r = AdaptarAulaInputSchema.safeParse({
      plano: "Aula de frações do 4º ano",
      alunos: [antigo],
    });
    expect(r.success).toBe(true);
  });
});

describe("planos salvos antes da mudança", () => {
  it("abrem sem os campos novos", () => {
    const antigo = JSON.parse(JSON.stringify(planoExemplo)) as {
      atividade: { apoios?: string[] };
      adaptacoes: { atividade?: string[] }[];
    };
    delete antigo.atividade.apoios;
    for (const a of antigo.adaptacoes) delete a.atividade;
    const completo = completarPlano(antigo as unknown as typeof planoExemplo);
    expect(completo.atividade.apoios).toEqual([]);
    expect(completo.adaptacoes.every((a) => Array.isArray(a.atividade))).toBe(true);
  });
});
