import { describe, expect, it } from "vitest";
import {
  mudarMes,
  nomeDoMes,
  reais,
  resumoFinanceiro,
  situacaoNaTela,
  totalDa,
  type Cobranca,
} from "@/lib/financeiro";

const base: Cobranca = {
  id: "1",
  escola: "e1",
  competencia: "2026-10-01",
  vencimento: "2026-10-10",
  valor: 500,
  creditos_extra: 10,
  valor_extra: 5,
  situacao: "pendente",
  pago_em: null,
  forma: null,
  observacao: null,
};

describe("financeiro", () => {
  it("soma a mensalidade com os créditos extras", () => {
    expect(totalDa(base)).toBe(505);
    expect(reais(505)).toMatch(/R\$\s?505,00/);
  });

  it("classifica: atrasada, vence logo ou pendente", () => {
    expect(situacaoNaTela(base, "2026-10-11")).toBe("atrasada");
    expect(situacaoNaTela(base, "2026-10-05")).toBe("vence-logo");
    expect(situacaoNaTela(base, "2026-09-20")).toBe("pendente");
    expect(situacaoNaTela({ ...base, situacao: "paga" }, "2026-12-01")).toBe("paga");
  });

  it("resume o mês sem contar as canceladas", () => {
    const r = resumoFinanceiro(
      [
        base,
        { ...base, id: "2", valor: 300, valor_extra: 0, situacao: "paga" },
        { ...base, id: "3", valor: 999, situacao: "cancelada" },
      ],
      "2026-10-12",
    );
    expect(r.previsto).toBe(805);
    expect(r.recebido).toBe(300);
    expect(r.aReceber).toBe(505);
    expect(r.emAtraso).toBe(505);
    expect(r.atrasadas).toHaveLength(1);
  });

  it("navega entre os meses, inclusive na virada do ano", () => {
    expect(mudarMes("2026-12-01", 1)).toBe("2027-01-01");
    expect(mudarMes("2026-01-01", -1)).toBe("2025-12-01");
    expect(nomeDoMes("2026-10-01")).toBe("outubro de 2026");
  });
});
