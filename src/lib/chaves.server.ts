/// <reference types="node" />

let encontrada: string | undefined;
let envCarregado = false;

function lerEnv(nome: string): string | undefined {
  const env = globalThis.process?.env;
  if (!env) return undefined;
  if (!env[nome] && !envCarregado) {
    envCarregado = true;
    try {
      process.loadEnvFile(".env");
    } catch {}
  }
  return env[nome] || undefined;
}

export async function obterChaveGemini(): Promise<string | undefined> {
  if (encontrada) return encontrada;
  const chave = lerEnv("GEMINI_API_KEY")?.replace(/\s|\u{FEFF}|["']/gu, "");
  if (chave) encontrada = chave;
  return chave || undefined;
}
