import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import type { MensagemChat, RespostaChat } from "./lumis-chat.server";
import { contasReais, supabase } from "./supabase";

const Entrada = z.object({
  token: z.string().min(20).optional(),
  pergunta: z.string().trim().min(2).max(1000),
  modo: z.enum(["conta", "visitante"]).default("conta"),
  historico: z
    .array(z.object({ autor: z.enum(["professor", "lumis"]), texto: z.string().max(4000) }))
    .max(20),
});

const perguntarNoServidor = createServerFn({ method: "POST" })
  .validator(Entrada)
  .handler(async ({ data }): Promise<RespostaChat> => {
    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
    const visitante =
      getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "local";
    const { responderNoChat } = await import("./lumis-chat.server");
    return responderNoChat(data.token, data.historico, data.pergunta, visitante, data.modo);
  });

export type { MensagemChat };

const EVENTO_ABRIR = "lume:abrir-lumis";

/** Abre o chat da Lumis de qualquer tela; a pergunta vem escrita, para a pessoa revisar e enviar. */
export function abrirLumis(pergunta?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: pergunta ?? "" }));
}

export function aoAbrirLumis(fn: (pergunta: string) => void) {
  const ouvir = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVENTO_ABRIR, ouvir);
  return () => window.removeEventListener(EVENTO_ABRIR, ouvir);
}

export async function perguntarALumis(
  pergunta: string,
  historico: MensagemChat[],
  modo: "conta" | "visitante" = "conta",
): Promise<RespostaChat> {
  let token: string | undefined;
  if (contasReais && modo === "conta")
    token = (await supabase().auth.getSession()).data.session?.access_token;
  try {
    return await perguntarNoServidor({
      data: { pergunta, modo, historico: historico.slice(-20), ...(token ? { token } : {}) },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com a Lumis. Confira sua internet." };
  }
}
