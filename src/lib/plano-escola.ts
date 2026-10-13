import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import type { ResultadoPedidoCreditos, ResultadoUsoExtra } from "./creditos.server";
import { supabase } from "./supabase";

export type SituacaoPlano = {
  plano: string;
  plano_nome: string;
  max_turmas: number | null;
  turmas_ativas: number;
  creditos_mes: number | null;
  creditos_usados: number;
  creditos_extra_usados: number;
  extra_liberado: boolean;
  extra_limite: number | null;
  extra_liberado_em: string | null;
  extra_liberado_por: string | null;
  meus_creditos_usados: number;
  meu_teto: number | null;
  renova_em: string;
};

export type Plano = {
  id: string;
  nome: string;
  max_turmas: number | null;
  creditos_mes: number | null;
  ordem: number;
};

export async function situacaoDoPlano(escola: string): Promise<SituacaoPlano> {
  const { data, error } = await supabase().rpc("situacao_plano", { p_escola: escola });
  if (error) throw new Error(error.message);
  return data as SituacaoPlano;
}

export async function listarPlanos(): Promise<Plano[]> {
  const { data, error } = await supabase()
    .from("planos")
    .select("id, nome, max_turmas, creditos_mes, ordem")
    .order("ordem");
  if (error) throw new Error(error.message);
  return data as Plano[];
}

export const textoLimite = (n: number | null) => (n === null ? "sem limite" : String(n));

export function dataRenovacao(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

const pedirNoServidor = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: z.string().min(20), escola: z.uuid(), mensagem: z.string().max(1000) }),
  )
  .handler(async ({ data }): Promise<ResultadoPedidoCreditos> => {
    const { pedirMaisCreditos } = await import("./creditos.server");
    return pedirMaisCreditos(data.token, data.escola, data.mensagem);
  });

export async function pedirMaisCreditos(
  escola: string,
  mensagem: string,
): Promise<ResultadoPedidoCreditos> {
  const token = (await supabase().auth.getSession()).data.session?.access_token;
  if (!token) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  try {
    return await pedirNoServidor({ data: { token, escola, mensagem } });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." };
  }
}

export function creditosDisponiveis(s: SituacaoPlano): number | null {
  if (s.creditos_mes === null) return null;
  if (s.extra_liberado) {
    return s.extra_limite === null ? null : s.creditos_mes + s.extra_limite - s.creditos_usados;
  }
  return s.creditos_mes - s.creditos_usados;
}

const usoExtraNoServidor = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(20),
      escola: z.uuid(),
      liberar: z.boolean(),
      limite: z.number().int().positive().max(100000).nullable(),
    }),
  )
  .handler(async ({ data }): Promise<ResultadoUsoExtra> => {
    const { mudarUsoExtra } = await import("./creditos.server");
    return mudarUsoExtra(data.token, data.escola, data.liberar, data.limite);
  });

export async function mudarUsoExtra(
  escola: string,
  liberar: boolean,
  limite: number | null,
): Promise<ResultadoUsoExtra> {
  const token = (await supabase().auth.getSession()).data.session?.access_token;
  if (!token) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  try {
    return await usoExtraNoServidor({ data: { token, escola, liberar, limite } });
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível falar com o servidor. Tente de novo." };
  }
}

export function creditosRestantes(s: SituacaoPlano): number | null {
  const daEscola = creditosDisponiveis(s);
  const meus = s.meu_teto === null ? null : s.meu_teto - s.meus_creditos_usados;
  if (daEscola === null) return meus;
  if (meus === null) return daEscola;
  return Math.min(daEscola, meus);
}
