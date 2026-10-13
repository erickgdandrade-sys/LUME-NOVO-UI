import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import type { ResultadoLembrete } from "./lembrete.server";
import { supabase } from "./supabase";

const lembrarNoServidor = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(20), cobranca: z.uuid() }))
  .handler(async ({ data }): Promise<ResultadoLembrete> => {
    const { lembrarGestor } = await import("./lembrete.server");
    return lembrarGestor(data.token, data.cobranca);
  });

export async function lembrarGestor(cobranca: string): Promise<ResultadoLembrete> {
  const sb = supabase();
  const token =
    (await sb.auth.getSession()).data.session?.access_token ??
    (await sb.auth.refreshSession()).data.session?.access_token;
  if (!token) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  try {
    return await lembrarNoServidor({ data: { token, cobranca } });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." };
  }
}
