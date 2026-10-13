import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import {
  AdaptarProvaSchema,
  ConfigProvaSchema,
  RefazerQuestaoSchema,
  type AdaptarProva,
  type AdaptarProvaResposta,
  type ConfigProva,
  type GerarProvaResposta,
  type RefazerQuestao,
  type RefazerQuestaoResposta,
} from "./prova-schema";
import { supabase } from "./supabase";

const Conta = z.object({ token: z.string().min(20).optional(), escola: z.uuid().optional() });

async function origemDoVisitante() {
  const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
  return getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "local";
}

const gerarNoServidor = createServerFn({ method: "POST" })
  .validator(ConfigProvaSchema.and(Conta))
  .handler(async ({ data }): Promise<GerarProvaResposta> => {
    const { gerarProvaComIA } = await import("./prova.server");
    const { clienteAdmin } = await import("./servidor.server");
    const { token, escola, ...config } = data;

    if (clienteAdmin()) {
      if (!token || !escola) {
        return { ok: false, erro: "Entre com a sua conta de professor para usar a Lumis." };
      }
      const { gastarCredito, devolverCredito } = await import("./creditos.server");
      const gasto = await gastarCredito(token, escola, "gerar_prova");
      if (!gasto.ok) return { ok: false, erro: gasto.erro };
      const resposta = await gerarProvaComIA(config);
      if (!resposta.ok) await devolverCredito(gasto.admin, gasto.uso);
      return resposta;
    }

    const { consumirAdaptacao } = await import("./limite-uso.server");
    const limite = consumirAdaptacao(await origemDoVisitante());
    if (!limite.ok) {
      return {
        ok: false,
        erro: `Você atingiu o limite de usos da IA desta hora. Tente de novo em ${limite.minutos} min.`,
      };
    }
    return gerarProvaComIA(config);
  });

const refazerNoServidor = createServerFn({ method: "POST" })
  .validator(RefazerQuestaoSchema.and(Conta))
  .handler(async ({ data }): Promise<RefazerQuestaoResposta> => {
    const { refazerQuestaoComIA } = await import("./prova.server");
    const { liberarUsoGratis } = await import("./ia-gratis.server");
    const { token, escola, ...pedido } = data;
    const liberado = await liberarUsoGratis(token, escola, "questao");
    if (!liberado.ok) return liberado;
    return refazerQuestaoComIA(pedido);
  });

const adaptarNoServidor = createServerFn({ method: "POST" })
  .validator(AdaptarProvaSchema.and(Conta))
  .handler(async ({ data }): Promise<AdaptarProvaResposta> => {
    const { adaptarProvaComIA } = await import("./prova.server");
    const { clienteAdmin } = await import("./servidor.server");
    const { token, escola, ...pedido } = data;

    if (clienteAdmin()) {
      if (!token || !escola) {
        return { ok: false, erro: "Entre com a sua conta de professor para usar a Lumis." };
      }
      const { gastarCredito, devolverCredito } = await import("./creditos.server");
      const gasto = await gastarCredito(token, escola, "adaptar_prova");
      if (!gasto.ok) return { ok: false, erro: gasto.erro };
      const resposta = await adaptarProvaComIA(pedido);
      if (!resposta.ok) await devolverCredito(gasto.admin, gasto.uso);
      return resposta;
    }

    const { consumirAdaptacao } = await import("./limite-uso.server");
    const limite = consumirAdaptacao(await origemDoVisitante());
    if (!limite.ok) {
      return {
        ok: false,
        erro: `Você atingiu o limite de usos da IA desta hora. Tente de novo em ${limite.minutos} min.`,
      };
    }
    return adaptarProvaComIA(pedido);
  });

export async function minhaConta(escola: string | null) {
  let token: string | undefined;
  try {
    token = (await supabase().auth.getSession()).data.session?.access_token;
  } catch {
    token = undefined;
  }
  return { ...(token ? { token } : {}), ...(escola ? { escola } : {}) };
}

export async function gerarProva(
  config: ConfigProva,
  escola: string | null,
): Promise<GerarProvaResposta> {
  return gerarNoServidor({ data: { ...config, ...(await minhaConta(escola)) } });
}

export async function refazerQuestao(
  pedido: RefazerQuestao,
  escola: string | null,
): Promise<RefazerQuestaoResposta> {
  try {
    return await refazerNoServidor({ data: { ...pedido, ...(await minhaConta(escola)) } });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com a Lumis. Confira sua internet." };
  }
}

export async function adaptarProva(
  pedido: AdaptarProva,
  escola: string | null,
): Promise<AdaptarProvaResposta> {
  try {
    return await adaptarNoServidor({ data: { ...pedido, ...(await minhaConta(escola)) } });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com a Lumis. Confira sua internet." };
  }
}
