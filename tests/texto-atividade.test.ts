import { describe, expect, it } from "vitest";
import { partesDoItem, textoMatematico } from "@/lib/texto-atividade";

describe("matemática legível", () => {
  it("troca o LaTeX por símbolos", () => {
    expect(textoMatematico("Limite pela ESQUERDA ($x \\to a^-$)")).toBe(
      "Limite pela ESQUERDA (x → a⁻)",
    );
    expect(textoMatematico("$x \\to a^+$ e $x \\to \\infty$")).toBe("x → a⁺ e x → ∞");
    expect(textoMatematico("$\\frac{1}{2} + x^2 \\leq 3$")).toBe("1/2 + x² ≤ 3");
    expect(textoMatematico("$\\lim_{x \\to 2} f(x)$")).toBe("lim (x → 2) f(x)");
    expect(textoMatematico("$\\sqrt{x+1}$ e $x_1$")).toBe("√(x+1) e x₁");
  });

  it("recupera fórmulas que perderam a barra no JSON", () => {
    expect(textoMatematico(JSON.parse(String.raw`"($x \to a^-$) e $\frac{1}{2}$"`))).toBe(
      "(x → a⁻) e 1/2",
    );
    expect(textoMatematico("($x " + String.fromCharCode(9) + "o a$)")).toBe("(x → a)");
    expect(textoMatematico("$x " + String.fromCharCode(10) + "eq 2$")).toBe("x ≠ 2");
  });

  it("não mexe em texto comum", () => {
    expect(textoMatematico("Custa R$ 18 e R$ 45")).toBe("Custa R$ 18 e R$ 45");
  });
});

describe("questões com partes", () => {
  it("separa a), b), c) que vieram emendadas", () => {
    const r = partesDoItem(
      "Seja f a função definida pelo gráfico 1. Intuitivamente, encontre se existir: a) o limite de f(x) quando x tende a a pela esquerda; b) o limite de f(x) quando x tende a a pela direita; c) o limite de f(x) quando x tende a a; d) o valor da função f em a; e) o comportamento do limite quando x cresce indefinidamente.",
    );
    expect(r.texto).toBe(
      "Seja f a função definida pelo gráfico 1. Intuitivamente, encontre se existir:",
    );
    expect(r.partes.map((p) => p.letra)).toEqual(["a", "b", "c", "d", "e"]);
    expect(r.partes[0]?.texto).toBe("o limite de f(x) quando x tende a a pela esquerda");
    expect(r.partes[4]?.texto).toBe("o comportamento do limite quando x cresce indefinidamente.");
  });

  it("junta com a matemática convertida", () => {
    const r = partesDoItem(
      "Responda: a) Limite pela ESQUERDA ($x \\to a^-$); b) Limite pela DIREITA ($x \\to a^+$)",
    );
    expect(r.partes[1]?.texto).toBe("Limite pela DIREITA (x → a⁺)");
  });

  it("não confunde f(x) nem letras soltas com partes", () => {
    expect(partesDoItem("Calcule f(x) para x = 2 e g(x) quando x = 3.").partes).toEqual([]);
    expect(partesDoItem("Só tem a) uma parte").partes).toEqual([]);
  });

  it("aceita as partes em linhas separadas", () => {
    const r = partesDoItem("Complete:\na) SELECT serve para consultar\nb) CREATE serve para criar");
    expect(r.texto).toBe("Complete:");
    expect(r.partes).toHaveLength(2);
  });
});
