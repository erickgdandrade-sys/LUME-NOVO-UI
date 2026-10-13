import { describe, expect, it } from "vitest";
import { PlanoAdaptadoSchema, completarPlano, planoExemplo } from "@/lib/plano-schema";
import { iniciais } from "@/lib/utils";

describe("plano adaptado", () => {
  it("o plano de exemplo segue o formato esperado da IA", () => {
    expect(PlanoAdaptadoSchema.safeParse(planoExemplo).success).toBe(true);
  });

  it("completarPlano preenche o que a IA deixou de fora sem perder o resto", () => {
    const incompleto = { ...planoExemplo, etapas: [{ ...planoExemplo.etapas[0]! }] } as Record<
      string,
      unknown
    >;
    delete incompleto["recursos"];
    delete incompleto["barreiras"];
    delete (incompleto["etapas"] as Record<string, unknown>[])[0]!["inclusao"];
    const completo = completarPlano(incompleto as typeof planoExemplo);
    expect(completo.recursos).toEqual([]);
    expect(completo.barreiras).toEqual([]);
    expect(completo.etapas[0]?.inclusao).toBe("");
    expect(completo.objetivosEspecificos).toEqual(planoExemplo.objetivosEspecificos);
  });
});

describe("iniciais", () => {
  it.each([
    ["Ana Souza Lima", "AS"],
    ["maria", "M"],
    ["  João   Pedro ", "JP"],
    ["", ""],
  ])("%s -> %s", (nome, esperado) => {
    expect(iniciais(nome)).toBe(esperado);
  });
});
