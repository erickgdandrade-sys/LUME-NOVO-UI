import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatoOffice, textoDoOffice } from "@/lib/ler-office";

const arquivo = (nome: string) => new Uint8Array(readFileSync(`tests/arquivos/${nome}`));

describe("Word antigo (.doc)", () => {
  it("reconhece o formato pelo nome ou pelo tipo", () => {
    expect(formatoOffice("Prova.DOC", "")).toBe("doc");
    expect(formatoOffice("x", "application/msword")).toBe("doc");
    expect(formatoOffice("prova.docx", "")).toBe("docx");
  });

  it("lê o texto com acentos e a ordem das questões", async () => {
    const texto = await textoDoOffice(arquivo("prova-simples.doc"), "doc");
    expect(texto).toBe(
      "Avaliação de Ciências – 5º ano\n1. Quais são os estados físicos da água?\na) Sólido, líquido e gasoso\nb) Só líquido\n2. Explique o que acontece com o gelo no sol.",
    );
  });

  it("lê símbolos de matemática e o texto de tabelas", async () => {
    const texto = await textoDoOffice(arquivo("prova-simbolos.doc"), "doc");
    expect(texto).toContain("√16 + 3² e marque: x ≥ 2 → verdadeiro");
    expect(texto).toContain("π aproximadamente");
    expect(texto).toContain("Questão 3");
    expect(texto).toContain("valor 2,0");
  });

  it("recusa arquivo que não é do Word", async () => {
    await expect(textoDoOffice(new Uint8Array(600), "doc")).rejects.toThrow();
  });
});
