import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import type { Conta, ResultadoAcao, ResultadoContas } from "./contas.server";
import { supabase } from "./supabase";

export type { Conta };

const Pedido = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("listar"), token: z.string().min(20) }),
  z.object({
    acao: z.literal("acesso"),
    token: z.string().min(20),
    usuario: z.uuid().optional(),
    email: z.email().max(200).optional(),
  }),
  z.object({ acao: z.literal("senha"), token: z.string().min(20), usuario: z.uuid() }),
  z.object({
    acao: z.literal("email"),
    token: z.string().min(20),
    usuario: z.uuid(),
    email: z.email().max(200),
  }),
  z.object({
    acao: z.literal("bloqueio"),
    token: z.string().min(20),
    usuario: z.uuid(),
    bloquear: z.boolean(),
  }),
]);

const contasNoServidor = createServerFn({ method: "POST" })
  .validator(Pedido)
  .handler(async ({ data }): Promise<ResultadoContas | ResultadoAcao> => {
    const s = await import("./contas.server");
    if (data.acao === "listar") return s.listarContas(data.token);
    if (data.acao === "acesso") {
      return s.reenviarAcesso(data.token, { usuario: data.usuario, email: data.email });
    }
    if (data.acao === "senha") return s.linkDeNovaSenha(data.token, data.usuario);
    if (data.acao === "email") return s.corrigirEmail(data.token, data.usuario, data.email);
    return s.definirBloqueio(data.token, data.usuario, data.bloquear);
  });

const SEM_SESSAO = {
  ok: false as const,
  erro: "Sua sessão neste navegador venceu. Clique em Sair (menu do perfil) e entre de novo.",
};

async function tokenDaSessao() {
  const sb = supabase();
  const token = (await sb.auth.getSession()).data.session?.access_token;
  return token ?? (await sb.auth.refreshSession()).data.session?.access_token;
}

type SemToken<T> = T extends unknown ? Omit<T, "token"> : never;

async function pedir<T extends ResultadoContas | ResultadoAcao>(
  pedido: SemToken<z.infer<typeof Pedido>>,
): Promise<T> {
  const token = await tokenDaSessao();
  if (!token) return SEM_SESSAO as T;
  try {
    return (await contasNoServidor({ data: { ...pedido, token } as z.infer<typeof Pedido> })) as T;
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." } as T;
  }
}

export const listarContas = () => pedir<ResultadoContas>({ acao: "listar" });
export const reenviarAcesso = (alvo: { usuario?: string; email?: string }) =>
  pedir<ResultadoAcao>({ acao: "acesso", ...alvo });
export const linkDeNovaSenha = (usuario: string) =>
  pedir<ResultadoAcao>({ acao: "senha", usuario });
export const corrigirEmail = (usuario: string, email: string) =>
  pedir<ResultadoAcao>({ acao: "email", usuario, email });
export const definirBloqueio = (usuario: string, bloquear: boolean) =>
  pedir<ResultadoAcao>({ acao: "bloqueio", usuario, bloquear });
