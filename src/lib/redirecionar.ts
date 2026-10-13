export const DOMINIO = "lumeedu.com.br";

const ENDERECOS_ANTIGOS = new Set(["projeto-lume.projeto-lume.workers.dev"]);

export function destinoDoRedirecionamento(metodo: string, endereco: string): string | null {
  if (metodo !== "GET" && metodo !== "HEAD") return null;
  const url = new URL(endereco);
  if (!ENDERECOS_ANTIGOS.has(url.hostname)) return null;
  if (url.pathname.startsWith("/_serverFn")) return null;
  return `https://${DOMINIO}${url.pathname}${url.search}`;
}
