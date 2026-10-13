/// <reference types="node" />
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import {
  botaoDeEmail,
  caixaDeEmail,
  clienteAdmin,
  emailsDaEquipe,
  enviarEmail,
  escapar,
  usuarioDoToken,
} from "./servidor.server";

type Consumo =
  | { ok: true; uso: string; limite: number | null; antes: number; depois: number }
  | { ok: false; motivo: string; limite?: number; usados?: number };

export type Gasto = { ok: true; uso: string; admin: SupabaseClient } | { ok: false; erro: string };

const mensagens: Record<string, (c: { limite?: number }) => string> = {
  escola_sem_creditos: (c) =>
    `Os ${c.limite} créditos de IA da sua escola acabaram este mês. Eles renovam no dia 1º. A coordenação pode liberar o uso extra no painel do gestor.`,
  extra_esgotado: () =>
    "A escola chegou ao máximo de créditos extras liberado para este mês. Fale com a coordenação.",
  professor_no_teto: (c) =>
    `Você já usou seus ${c.limite} créditos de IA deste mês, o limite definido pela coordenação. Fale com ela se precisar de mais.`,
  sem_vinculo: () => "Sua conta não está ativa como professor nesta escola.",
  escola_inativa: () => "Esta escola está desativada na Lume. Fale com a coordenação.",
};

export async function gastarCredito(
  token: string,
  escola: string,
  tipo: string,
  creditos = 1,
): Promise<Gasto> {
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: "A IA ainda não foi ativada neste servidor." };
  const usuario = await usuarioDoToken(admin, token);
  if (!usuario) {
    return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  }
  const { data, error } = await admin.rpc("consumir_creditos", {
    p_escola: escola,
    p_usuario: usuario.id,
    p_creditos: creditos,
    p_tipo: tipo,
  });
  if (error) {
    console.error("créditos: falhou ao descontar", error.code, error.message);
    return { ok: false, erro: "Não foi possível conferir seus créditos de IA. Tente de novo." };
  }
  const r = data as Consumo;
  if (!r.ok) return { ok: false, erro: (mensagens[r.motivo] ?? mensagens["sem_vinculo"]!)(r) };
  try {
    await avisarSeChegouNoLimite(admin, escola, r.antes, r.depois, r.limite);
  } catch (e) {
    console.error("créditos: aviso por e-mail falhou", e);
  }
  return { ok: true, uso: r.uso, admin };
}

export async function devolverCredito(admin: SupabaseClient, uso: string) {
  const { error } = await admin.from("usos_ia").delete().eq("id", uso);
  if (error) console.error("créditos: não devolveu o crédito", uso, error.message);
}

export async function gestoresDaEscola(admin: SupabaseClient, escola: string) {
  const { data: vinculos } = await admin
    .from("vinculos")
    .select("usuario")
    .eq("escola", escola)
    .eq("papel", "gestor")
    .eq("ativo", true);
  const ids = (vinculos ?? []).map((v) => v.usuario as string);
  if (!ids.length) return [];
  const { data: perfis } = await admin.from("perfis").select("email, nome").in("id", ids);
  return (perfis ?? [])
    .filter((p) => p.email)
    .map((p) => ({ email: p.email as string, name: (p.nome as string) || undefined }));
}

async function avisarSeChegouNoLimite(
  admin: SupabaseClient,
  escola: string,
  antes: number,
  depois: number,
  limite: number | null,
) {
  if (!limite) return;
  const passou = (pct: number) => antes < limite * pct && depois >= limite * pct;
  const acabou = passou(1);
  if (!acabou && !passou(0.8)) return;
  const { data: e } = await admin.from("escolas").select("nome").eq("id", escola).maybeSingle();
  const nome = escapar((e?.nome as string | undefined) ?? "sua escola");
  const texto = acabou
    ? `A <strong>${nome}</strong> usou todos os <strong>${limite}</strong> créditos de IA deste mês. Os professores só voltam a usar a Lumis quando os créditos renovarem, no dia 1º. Se precisar continuar agora, você pode liberar o uso extra no painel do gestor; os créditos extras são cobrados à parte.`
    : `A <strong>${nome}</strong> já usou <strong>${depois} de ${limite}</strong> créditos de IA deste mês (80%).`;
  await enviarEmail({
    para: await gestoresDaEscola(admin, escola),
    assunto: acabou
      ? "Os créditos de IA da escola acabaram"
      : "Sua escola já usou 80% dos créditos de IA",
    html: caixaDeEmail(
      `<h2 style="color:#1b2744;margin:0 0 12px">${acabou ? "Créditos de IA esgotados" : "Créditos de IA quase no fim"}</h2><p style="color:#2b3550;font-size:15px;line-height:1.6">${texto}</p>${botaoDeEmail("Ver no painel do gestor", "/gestor")}`,
    ),
  });
}

export type ResultadoPedidoCreditos = { ok: true } | { ok: false; erro: string };

export async function pedirMaisCreditos(
  token: string,
  escola: string,
  mensagem: string,
): Promise<ResultadoPedidoCreditos> {
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: "Não foi possível enviar agora." };
  const usuario = await usuarioDoToken(admin, token);
  if (!usuario) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  const { data: vinculo } = await admin
    .from("vinculos")
    .select("id")
    .eq("usuario", usuario.id)
    .eq("escola", escola)
    .eq("papel", "gestor")
    .eq("ativo", true)
    .maybeSingle();
  if (!vinculo) return { ok: false, erro: "Só o gestor da escola pode pedir mais créditos." };
  const [{ data: e }, { data: perfil }] = await Promise.all([
    admin.from("escolas").select("nome, plano").eq("id", escola).maybeSingle(),
    admin.from("perfis").select("nome").eq("id", usuario.id).maybeSingle(),
  ]);
  const { registrarChamado } = await import("./atendimento.server");
  const nomeDaEscola = (e?.nome as string | undefined) ?? "";
  const registrado = await registrarChamado(admin, {
    tipo: "creditos",
    origem: "gestor",
    usuario: usuario.id,
    nome: (perfil?.nome as string | undefined) || "",
    email: usuario.email ?? "",
    escola,
    escolaNome: nomeDaEscola,
    papel: "Gestão",
    assunto: `Mais créditos ou turmas · ${nomeDaEscola} (plano ${(e?.plano as string | undefined) ?? ""})`,
    mensagem: mensagem.trim() || "O gestor pediu mais créditos ou turmas, sem mensagem.",
    conversa: [],
  });
  if (!registrado) return { ok: false, erro: "Não foi possível enviar o pedido agora." };
  return { ok: true };
}

export type ResultadoUsoExtra = { ok: true } | { ok: false; erro: string };

export async function mudarUsoExtra(
  token: string,
  escola: string,
  liberar: boolean,
  limite: number | null,
): Promise<ResultadoUsoExtra> {
  const admin = clienteAdmin();
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const publica = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  if (!admin || !url || !publica) return { ok: false, erro: "Não foi possível agora." };
  const usuario = await usuarioDoToken(admin, token);
  if (!usuario) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  const comoUsuario = createClient(url, publica, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { error } = liberar
    ? await comoUsuario.rpc("liberar_uso_extra", { p_escola: escola, p_limite_extra: limite })
    : await comoUsuario.rpc("encerrar_uso_extra", { p_escola: escola });
  if (error) {
    console.error("uso extra: falhou", error.code, error.message);
    return {
      ok: false,
      erro:
        error.code === "42501"
          ? "Só o gestor da escola pode mudar o uso extra."
          : "Não foi possível salvar. Tente de novo.",
    };
  }
  try {
    const [{ data: e }, { data: perfil }] = await Promise.all([
      admin.from("escolas").select("nome, plano").eq("id", escola).maybeSingle(),
      admin.from("perfis").select("nome").eq("id", usuario.id).maybeSingle(),
    ]);
    const quem = escapar((perfil?.nome as string | undefined) || usuario.email || "Gestor");
    const nome = escapar((e?.nome as string | undefined) ?? "escola");
    await enviarEmail({
      para: (await emailsDaEquipe(admin)).map((email) => ({ email })),
      responderPara: usuario.email ? { email: usuario.email } : undefined,
      assunto: liberar ? `Uso extra de IA liberado: ${nome}` : `Uso extra de IA encerrado: ${nome}`,
      html: caixaDeEmail(
        liberar
          ? `<h2 style="color:#1b2744;margin:0 0 12px">Uso extra liberado</h2><p style="color:#2b3550;font-size:15px;line-height:1.6"><strong>${quem}</strong> (${escapar(usuario.email ?? "")}) liberou o uso de créditos de IA além do plano na <strong>${nome}</strong> (plano ${escapar((e?.plano as string | undefined) ?? "")}), ${limite === null ? "<strong>sem limite</strong>" : `até <strong>${limite}</strong> créditos extras`}, neste mês. Os créditos extras usados aparecem no painel Admin para cobrança.</p>${botaoDeEmail("Abrir o painel Admin", "/admin")}`
          : `<h2 style="color:#1b2744;margin:0 0 12px">Uso extra encerrado</h2><p style="color:#2b3550;font-size:15px;line-height:1.6"><strong>${quem}</strong> encerrou o uso extra de créditos de IA na <strong>${nome}</strong>.</p>`,
      ),
    });
  } catch (err) {
    console.error("uso extra: aviso por e-mail falhou", err);
  }
  return { ok: true };
}
