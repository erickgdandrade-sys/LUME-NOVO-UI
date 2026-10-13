import { describe, expect, it } from "vitest";
import { traduzirErro } from "@/lib/supabase";

describe("mensagens de erro do login", () => {
  it("explica quando a conta foi bloqueada pela equipe", () => {
    expect(traduzirErro("User is banned")).toContain("bloqueada");
  });

  it("continua traduzindo senha errada", () => {
    expect(traduzirErro("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });
});
