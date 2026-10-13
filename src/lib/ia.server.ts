import { obterChaveGemini } from "./chaves.server";
import type { AdaptarAulaResposta, Anexo, PerfilAnonimo, StatusIA } from "./plano-schema";

export async function statusDaIA(): Promise<StatusIA> {
  if (await obterChaveGemini()) {
    const pago = globalThis.process?.env?.["GEMINI_PLANO_PAGO"] === "true";
    return { configurada: true, provedor: "gemini", gratuita: !pago };
  }
  return { configurada: false, provedor: null, gratuita: false };
}

export async function adaptarAulaComIA(
  plano: string,
  alunos: PerfilAnonimo[],
  anexos: Anexo[] = [],
): Promise<AdaptarAulaResposta> {
  const gemini = await obterChaveGemini();
  if (gemini) {
    const { adaptarAulaComGemini } = await import("./gemini.server");
    return adaptarAulaComGemini(gemini, plano, alunos, anexos);
  }

  return {
    ok: false,
    erro: "Nenhuma IA configurada. Crie uma chave grátis em aistudio.google.com/apikey e cadastre GEMINI_API_KEY como segredo na hospedagem.",
  };
}
