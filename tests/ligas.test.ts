import { describe, expect, it } from "vitest";
import { LIGAS, faixaDeNiveis, ligaDoNivel, ligaDoXp, progressoNaLiga } from "@/lib/ligas";

describe("ligas", () => {
  it("cada nível cai na liga certa", () => {
    expect(ligaDoNivel(1).nome).toBe("Bronze");
    expect(ligaDoNivel(2).nome).toBe("Bronze");
    expect(ligaDoNivel(3).nome).toBe("Prata");
    expect(ligaDoNivel(5).nome).toBe("Ouro");
    expect(ligaDoNivel(8).nome).toBe("Platina");
    expect(ligaDoNivel(12).nome).toBe("Diamante");
    expect(ligaDoNivel(40).nome).toBe("Diamante");
  });

  it("a liga sobe com o XP (200 XP por nível)", () => {
    expect(ligaDoXp(0).nome).toBe("Bronze");
    expect(ligaDoXp(399).nome).toBe("Bronze");
    expect(ligaDoXp(400).nome).toBe("Prata");
    expect(ligaDoXp(800).nome).toBe("Ouro");
  });

  it("mostra quanto falta para a próxima liga", () => {
    const p = progressoNaLiga(500);
    expect(p.liga.nome).toBe("Prata");
    expect(p.proxima?.nome).toBe("Ouro");
    expect(p.faltam).toBe(300);
    expect(p.pct).toBe(25);
  });

  it("a última liga não tem próxima", () => {
    const p = progressoNaLiga(9000);
    expect(p.proxima).toBeNull();
    expect(p.pct).toBe(100);
  });

  it("descreve a faixa de níveis", () => {
    expect(faixaDeNiveis(LIGAS[0]!)).toBe("níveis 1–2");
    expect(faixaDeNiveis(LIGAS[4]!)).toBe("nível 12+");
  });
});
