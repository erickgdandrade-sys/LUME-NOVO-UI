import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import type { ResultadoEquipe } from "./equipe.server";
import { supabase } from "./supabase";

const Acao = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("convidar"), token: z.string().min(20), email: z.email().max(200) }),
  z.object({ acao: z.literal("remover"), token: z.string().min(20), usuario: z.uuid() }),
  z.object({ acao: z.literal("cancelar"), token: z.string().min(20), convite: z.uuid() }),
]);

const equipeNoServidor = createServerFn({ method: "POST" })
  .validator(Acao)
  .handler(async ({ data }): Promise<ResultadoEquipe> => {
    const s = await import("./equipe.server");
    if (data.acao === "convidar") return s.convidarAdmin(data.token, data.email);
    if (data.acao === "remover") return s.removerAdmin(data.token, data.usuario);
    return s.cancelarConviteAdmin(data.token, data.convite);
  });

async function tokenDaSessao() {
  const sb = supabase();
  const token = (await sb.auth.getSession()).data.session?.access_token;
  return token ?? (await sb.auth.refreshSession()).data.session?.access_token;
}

async function pedir(montar: (token: string) => z.infer<typeof Acao>): Promise<ResultadoEquipe> {
  const token = await tokenDaSessao();
  if (!token) {
    return {
      ok: false,
      erro: "Sua sessão neste navegador venceu. Clique em Sair (menu do perfil) e entre de novo.",
    };
  }
  try {
    return await equipeNoServidor({ data: montar(token) });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." };
  }
}

export const convidarAdmin = (email: string) =>
  pedir((token) => ({ acao: "convidar", token, email: email.trim() }));
export const removerAdmin = (usuario: string) =>
  pedir((token) => ({ acao: "remover", token, usuario }));
export const cancelarConviteAdmin = (convite: string) =>
  pedir((token) => ({ acao: "cancelar", token, convite }));
