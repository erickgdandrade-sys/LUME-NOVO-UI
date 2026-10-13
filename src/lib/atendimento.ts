import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import type { ResultadoChamado } from "./atendimento.server";
import type { MensagemChat } from "./lumis-chat";
import { contasReais, supabase } from "./supabase";

const Entrada = z.object({
  token: z.string().min(20).optional(),
  escola: z.uuid().optional(),
  nome: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  mensagem: z.string().trim().min(5).max(4000),
  conversa: z
    .array(z.object({ autor: z.enum(["professor", "lumis"]), texto: z.string().max(4000) }))
    .max(30),
});

const abrirNoServidor = createServerFn({ method: "POST" })
  .validator(Entrada)
  .handler(async ({ data }): Promise<ResultadoChamado> => {
    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
    const origem =
      getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "local";
    const { abrirChamado } = await import("./atendimento.server");
    return abrirChamado(data, origem);
  });

export async function abrirChamado(pedido: {
  modo: "conta" | "visitante";
  escola: string | null;
  nome?: string;
  email?: string;
  mensagem: string;
  conversa: MensagemChat[];
}): Promise<ResultadoChamado> {
  if (!contasReais) {
    return { ok: false, erro: "No modo de demonstração os chamados não são enviados." };
  }
  let token: string | undefined;
  if (pedido.modo === "conta") {
    token = (await supabase().auth.getSession()).data.session?.access_token;
  }
  try {
    return await abrirNoServidor({
      data: {
        mensagem: pedido.mensagem,
        conversa: pedido.conversa.slice(-30),
        ...(token ? { token } : {}),
        ...(pedido.escola && token ? { escola: pedido.escola } : {}),
        ...(pedido.nome ? { nome: pedido.nome } : {}),
        ...(pedido.email ? { email: pedido.email } : {}),
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." };
  }
}
