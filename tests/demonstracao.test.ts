import { describe, expect, it } from "vitest";
import { mascararTelefone, pedidoDemonstracao } from "@/lib/demonstracao";

const valido = {
  nome: "Ana Souza",
  email: "ana@escola.com.br",
  telefone: "(48) 99999-0000",
  escola: "Colégio SATC",
  cargo: "Diretor(a)",
  estado: "SC",
  cidade: "Criciúma",
  consentimento: true,
};

describe("mascararTelefone", () => {
  it.each([
    ["", ""],
    ["4", "(4"],
    ["4899", "(48) 99"],
    ["4833334444", "(48) 3333-4444"],
    ["48999990000", "(48) 99999-0000"],
    ["(48) 99999-00001234", "(48) 99999-0000"],
    ["abc48x9", "(48) 9"],
  ])("%s vira %s", (entrada, saida) => {
    expect(mascararTelefone(entrada)).toBe(saida);
  });
});

describe("pedidoDemonstracao", () => {
  it("aceita um pedido completo", () => {
    expect(pedidoDemonstracao.safeParse(valido).success).toBe(true);
  });

  it("exige a autorização da LGPD", () => {
    const r = pedidoDemonstracao.safeParse({ ...valido, consentimento: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["consentimento"]);
  });

  it.each([
    ["telefone sem DDD", { telefone: "99999-0000" }, "telefone"],
    ["e-mail inválido", { email: "ana@" }, "email"],
    ["cargo fora da lista", { cargo: "Astronauta" }, "cargo"],
    ["estado inexistente", { estado: "XX" }, "estado"],
    ["nome curto demais", { nome: "Al" }, "nome"],
    ["mensagem longa demais", { mensagem: "a".repeat(1501) }, "mensagem"],
  ])("recusa %s", (_, mudanca, campo) => {
    const r = pedidoDemonstracao.safeParse({ ...valido, ...mudanca });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toContain(campo);
  });
});
