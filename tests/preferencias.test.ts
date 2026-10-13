import { beforeEach, describe, expect, it } from "vitest";

const guardado = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => void guardado.set(k, v),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

const { createLocalStore, usarSomenteMemoria } = await import("@/lib/local-store");

describe("preferências com contas reais", () => {
  beforeEach(() => {
    guardado.clear();
    usarSomenteMemoria(false);
  });

  it("o tema continua salvo quando o site protege os dados no navegador", () => {
    const tema = createLocalStore("teste:tema", "sistema", { preferencia: true });
    usarSomenteMemoria(true);
    tema.set("escuro");
    expect(guardado.get("teste:tema")).toBe('"escuro"');
    const depoisDeRecarregar = createLocalStore("teste:tema", "sistema", { preferencia: true });
    expect(depoisDeRecarregar.get()).toBe("escuro");
  });

  it("o tema escolhido antes de entrar não se perde ao entrar", () => {
    const tema = createLocalStore("teste:tema2", "sistema", { preferencia: true });
    tema.set("claro");
    usarSomenteMemoria(true);
    expect(tema.get()).toBe("claro");
  });

  it("dados de alunos continuam só na memória", () => {
    const alunos = createLocalStore<string[]>("teste:alunos", []);
    usarSomenteMemoria(true);
    alunos.set(["Lucas"]);
    expect(guardado.has("teste:alunos")).toBe(false);
    expect(alunos.get()).toEqual(["Lucas"]);
  });
});
