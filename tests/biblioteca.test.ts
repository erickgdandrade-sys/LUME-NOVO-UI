import { describe, expect, it } from "vitest";
import { CATEGORIAS, estrategias } from "@/lib/biblioteca-estrategias";

const NECESSIDADES_DO_CADASTRO = [
  "Apoio visual",
  "Instruções em etapas",
  "Rotina previsível",
  "Tempo extra",
  "Pausas frequentes",
  "Ambiente com menos ruído",
  "Apoio na leitura",
  "Apoio na escrita",
  "Comunicação alternativa",
  "Mais desafio",
];

describe("biblioteca de estratégias", () => {
  it("tem ids únicos e categorias conhecidas", () => {
    expect(new Set(estrategias.map((e) => e.id)).size).toBe(estrategias.length);
    const nomes = CATEGORIAS.map((c) => c.nome);
    for (const e of estrategias) expect(nomes).toContain(e.categoria);
  });

  it.each(estrategias.map((e) => [e.id, e] as const))("%s está completa", (_, e) => {
    expect(e.passos.length).toBeGreaterThanOrEqual(3);
    expect(e.quandoUsar.length).toBeGreaterThanOrEqual(1);
    expect(e.exemplo.length).toBeGreaterThan(20);
    for (const n of e.necessidades) expect(NECESSIDADES_DO_CADASTRO).toContain(n);
  });

  it("cobre todas as necessidades do cadastro do aluno", () => {
    const cobertas = new Set(estrategias.flatMap((e) => e.necessidades));
    for (const n of NECESSIDADES_DO_CADASTRO) expect(cobertas).toContain(n);
  });
});
