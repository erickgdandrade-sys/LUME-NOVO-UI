import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import type { ResultadoConvite } from "./convites.server";
import { supabase } from "./supabase";

const EntradaConvite = z.object({
  token: z.string().min(20),
  escola: z.uuid(),
  email: z.email().max(200),
  papel: z.enum(["gestor", "professor"]),
  turmas: z
    .array(z.object({ turma: z.uuid(), disciplina: z.string().max(60) }))
    .max(20)
    .default([]),
});

const convidarNoServidor = createServerFn({ method: "POST" })
  .validator(EntradaConvite)
  .handler(async ({ data }): Promise<ResultadoConvite> => {
    const { convidar } = await import("./convites.server");
    return convidar(data);
  });

export async function convidarPessoa(
  escola: string,
  email: string,
  papel: "gestor" | "professor",
  turmas: { turma: string; disciplina: string }[] = [],
): Promise<ResultadoConvite> {
  const sb = supabase();
  let token = (await sb.auth.getSession()).data.session?.access_token;
  if (!token) {
    const { data, error } = await sb.auth.refreshSession();
    if (error) console.error("convite: não foi possível renovar a sessão", error.message);
    token = data.session?.access_token;
  }
  if (!token) {
    return {
      ok: false,
      erro: "Sua sessão neste navegador venceu. Clique em Sair (menu do perfil) e entre de novo.",
    };
  }
  try {
    return await convidarNoServidor({
      data: { token, escola, email: email.trim(), papel, turmas },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." };
  }
}
