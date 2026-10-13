import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { pedidoDemonstracao, type PedidoDemonstracao } from "./demonstracao";
import type { ResultadoPedido } from "./demonstracao.server";

const Entrada = pedidoDemonstracao.extend({ site: z.string().max(200).optional() });

const enviarNoServidor = createServerFn({ method: "POST" })
  .validator(Entrada)
  .handler(async ({ data }): Promise<ResultadoPedido> => {
    const { site, ...pedido } = data;
    if (site) return { ok: true };
    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true });
    const { registrarPedido } = await import("./demonstracao.server");
    return registrarPedido(pedido, ip);
  });

export async function enviarPedido(
  pedido: PedidoDemonstracao,
  site: string,
): Promise<ResultadoPedido> {
  try {
    return await enviarNoServidor({ data: { ...pedido, site: site || undefined } });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." };
  }
}
