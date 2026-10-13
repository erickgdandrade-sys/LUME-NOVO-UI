import { consumirAdaptacao } from "./limite-uso.server";
import { clienteAdmin, usuarioDoToken } from "./servidor.server";

const POR_HORA = 60;

export async function liberarUsoGratis(
  token: string | undefined,
  escola: string | undefined,
  tipo: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const admin = clienteAdmin();
  let chave: string;

  if (admin) {
    if (!token || !escola) {
      return { ok: false, erro: "Entre com a sua conta de professor para usar a Lumis." };
    }
    const usuario = await usuarioDoToken(admin, token);
    if (!usuario) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
    const { data: vinculo } = await admin
      .from("vinculos")
      .select("id")
      .eq("usuario", usuario.id)
      .eq("escola", escola)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
    if (!vinculo) return { ok: false, erro: "Sua conta não está ativa nesta escola." };
    chave = `${tipo}:${usuario.id}`;
  } else {
    const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
    const origem =
      getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "local";
    chave = `${tipo}:${origem}`;
  }

  const limite = consumirAdaptacao(chave, POR_HORA);
  if (!limite.ok) {
    return {
      ok: false,
      erro: `Você usou muitas vezes nesta hora. Tente de novo em ${limite.minutos} min.`,
    };
  }
  return { ok: true };
}
