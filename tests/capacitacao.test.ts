import { describe, expect, it } from "vitest";
import { todasAsLicoes, trilhas } from "@/lib/capacitacao-trilhas";
import {
  estadoDaTrilha,
  estadoDasLicoes,
  licaoAtual,
  resumoCapacitacao,
  type Conclusao,
} from "@/lib/capacitacao-store";

const feita: Conclusao = { acertosDePrimeira: 4, total: 4, em: "2026-10-01T10:00:00Z" };
const concluir = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, feita]));

describe("conteúdo das trilhas", () => {
  const perguntas = todasAsLicoes.flatMap((l) => l.perguntas);

  it("tem 5 trilhas com lições e perguntas", () => {
    expect(trilhas).toHaveLength(5);
    for (const t of trilhas) expect(t.licoes.length).toBeGreaterThan(0);
    for (const l of todasAsLicoes) expect(l.perguntas.length).toBeGreaterThanOrEqual(3);
  });

  it("não repete ids de lição nem de pergunta", () => {
    expect(new Set(todasAsLicoes.map((l) => l.id)).size).toBe(todasAsLicoes.length);
    expect(new Set(perguntas.map((p) => p.id)).size).toBe(perguntas.length);
  });

  it.each(perguntas.map((p) => [p.id, p] as const))(
    "%s tem resposta certa válida e alternativas diferentes",
    (_, p) => {
      expect(p.alternativas.length).toBeGreaterThanOrEqual(2);
      expect(p.correta).toBeGreaterThanOrEqual(0);
      expect(p.correta).toBeLessThan(p.alternativas.length);
      expect(new Set(p.alternativas).size).toBe(p.alternativas.length);
      expect(p.explicacao.length).toBeGreaterThan(20);
    },
  );
});

describe("liberação das lições", () => {
  it("no começo só a primeira lição está liberada", () => {
    const estados = estadoDasLicoes({});
    expect(estados.get("introducao-1")).toBe("atual");
    expect(estados.get("introducao-2")).toBe("bloqueada");
    expect(estados.get("tea-1")).toBe("bloqueada");
    expect(licaoAtual({})?.id).toBe("introducao-1");
  });

  it("terminar uma lição libera a próxima", () => {
    const estados = estadoDasLicoes(concluir("introducao-1"));
    expect(estados.get("introducao-1")).toBe("concluida");
    expect(estados.get("introducao-2")).toBe("atual");
  });

  it("terminar a última lição da trilha libera a próxima trilha", () => {
    const c = concluir("introducao-1", "introducao-2", "introducao-3");
    const estados = estadoDasLicoes(c);
    const [introducao, tea, tdah] = trilhas;
    expect(estadoDaTrilha(introducao!, estados)).toBe("concluida");
    expect(estadoDaTrilha(tea!, estados)).toBe("em-andamento");
    expect(estadoDaTrilha(tdah!, estados)).toBe("bloqueada");
    expect(licaoAtual(c)?.id).toBe("tea-1");
  });

  it("com tudo concluído não sobra lição atual e o resumo fecha 100%", () => {
    const c = concluir(...todasAsLicoes.map((l) => l.id));
    expect(licaoAtual(c)).toBeNull();
    const r = resumoCapacitacao(c);
    expect(r.pct).toBe(100);
    expect(r.trilhasConcluidas).toBe(5);
  });
});
