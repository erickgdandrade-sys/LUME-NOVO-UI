import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { RefazerParteSchema, type RefazerParte, type RefazerParteResposta } from "./plano-schema";
import { minhaConta } from "./prova";

const Conta = z.object({ token: z.string().min(20).optional(), escola: z.uuid().optional() });

const refazerNoServidor = createServerFn({ method: "POST" })
  .validator(RefazerParteSchema.and(Conta))
  .handler(async ({ data }): Promise<RefazerParteResposta> => {
    const { refazerParteComIA } = await import("./plano-partes.server");
    const { liberarUsoGratis } = await import("./ia-gratis.server");
    const { token, escola, ...pedido } = data;
    const liberado = await liberarUsoGratis(token, escola, "parte-do-plano");
    if (!liberado.ok) return liberado;
    return refazerParteComIA(pedido);
  });

export async function refazerParteDoPlano(
  pedido: RefazerParte,
  escola: string | null,
): Promise<RefazerParteResposta> {
  try {
    return await refazerNoServidor({ data: { ...pedido, ...(await minhaConta(escola)) } });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com a Lumis. Confira sua internet." };
  }
}
