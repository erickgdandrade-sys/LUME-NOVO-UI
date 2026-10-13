import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import {
  AdaptarAulaInputSchema,
  type AdaptarAulaResposta,
  type Anexo,
  type PerfilAnonimo,
  type StatusIA,
} from "./plano-schema";
import { supabase } from "./supabase";

const Entrada = AdaptarAulaInputSchema.and(
  z.object({ token: z.string().min(20).optional(), escola: z.uuid().optional() }),
);

const adaptarNoServidor = createServerFn({ method: "POST" })
  .validator(Entrada)
  .handler(async ({ data }): Promise<AdaptarAulaResposta> => {
    const { adaptarAulaComIA } = await import("./ia.server");
    const { clienteAdmin } = await import("./servidor.server");

    if (clienteAdmin()) {
      if (!data.token || !data.escola) {
        return { ok: false, erro: "Entre com a sua conta de professor para usar a Lumis." };
      }
      const { gastarCredito, devolverCredito } = await import("./creditos.server");
      const gasto = await gastarCredito(data.token, data.escola, "adaptar_aula");
      if (!gasto.ok) return { ok: false, erro: gasto.erro };
      const resposta = await adaptarAulaComIA(data.plano, data.alunos, data.anexos);
      if (!resposta.ok) await devolverCredito(gasto.admin, gasto.uso);
      return resposta;
    }

    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
    const { consumirAdaptacao } = await import("./limite-uso.server");
    const visitante =
      getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "local";
    const limite = consumirAdaptacao(visitante);
    if (!limite.ok) {
      return {
        ok: false,
        erro: `Você atingiu o limite de adaptações desta hora. Tente de novo em ${limite.minutos} min.`,
      };
    }
    return adaptarAulaComIA(data.plano, data.alunos, data.anexos);
  });

export async function adaptarAula(
  plano: string,
  alunos: PerfilAnonimo[],
  escola: string | null,
  anexos: Anexo[] = [],
): Promise<AdaptarAulaResposta> {
  let token: string | undefined;
  try {
    token = (await supabase().auth.getSession()).data.session?.access_token;
  } catch {
    token = undefined;
  }
  return adaptarNoServidor({
    data: { plano, alunos, anexos, ...(token ? { token } : {}), ...(escola ? { escola } : {}) },
  });
}

export const obterStatusIA = createServerFn({ method: "GET" }).handler(
  async (): Promise<StatusIA> => {
    const { statusDaIA } = await import("./ia.server");
    return statusDaIA();
  },
);
