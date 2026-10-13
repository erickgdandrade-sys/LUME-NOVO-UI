import { describe, expect, it } from "vitest";
import { destinoDoRedirecionamento } from "@/lib/redirecionar";

const antigo = "https://projeto-lume.projeto-lume.workers.dev";

describe("endereço antigo para o domínio novo", () => {
  it("leva a página para o mesmo caminho no lumeedu.com.br", () => {
    expect(destinoDoRedirecionamento("GET", `${antigo}/`)).toBe("https://lumeedu.com.br/");
    expect(destinoDoRedirecionamento("GET", `${antigo}/confirmar?token_hash=abc&type=invite`)).toBe(
      "https://lumeedu.com.br/confirmar?token_hash=abc&type=invite",
    );
  });

  it("não redireciona chamadas internas do app nem envios", () => {
    expect(destinoDoRedirecionamento("GET", `${antigo}/_serverFn/abc`)).toBeNull();
    expect(destinoDoRedirecionamento("POST", `${antigo}/demonstracao`)).toBeNull();
  });

  it("não mexe no domínio novo nem nos endereços de teste", () => {
    expect(destinoDoRedirecionamento("GET", "https://lumeedu.com.br/provas")).toBeNull();
    expect(
      destinoDoRedirecionamento("GET", "https://abc123-projeto-lume.projeto-lume.workers.dev/"),
    ).toBeNull();
  });
});
