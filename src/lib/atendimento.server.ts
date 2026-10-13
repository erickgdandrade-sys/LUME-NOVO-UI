/// <reference types="node" />
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumirAdaptacao } from "./limite-uso.server";
import {
  botaoDeEmail,
  caixaDeEmail,
  clienteAdmin,
  emailsDaEquipe,
  enviarEmail,
  escapar,
  usuarioDoToken,
} from "./servidor.server";

export type ResultadoChamado = { ok: true } | { ok: false; erro: string };

type NovoChamado = {
  tipo: "duvida" | "creditos";
  origem: "chat" | "chat-visitante" | "gestor";
  usuario: string | null;
  nome: string;
  email: string;
  escola: string | null;
  escolaNome: string;
  papel: string;
  assunto: string;
  mensagem: string;
  conversa: { autor: string; texto: string }[];
};

export async function registrarChamado(admin: SupabaseClient, c: NovoChamado) {
  const { error } = await admin.from("tickets").insert({
    tipo: c.tipo,
    origem: c.origem,
    usuario: c.usuario,
    nome: c.nome.slice(0, 120) || null,
    email: c.email.slice(0, 200),
    escola: c.escola,
    escola_nome: c.escolaNome.slice(0, 160) || null,
    papel: c.papel.slice(0, 40) || null,
    assunto: c.assunto.slice(0, 200),
    mensagem: c.mensagem.slice(0, 4000) || null,
    conversa: c.conversa.slice(-30).map((m) => ({ autor: m.autor, texto: m.texto.slice(0, 4000) })),
  });
  if (error) {
    console.error("atendimento: chamado não registrado", error.message);
    return false;
  }
  try {
    const quem = escapar(c.nome || c.email);
    const onde = c.escolaNome ? ` · ${escapar(c.papel)} na ${escapar(c.escolaNome)}` : "";
    await enviarEmail({
      para: (await emailsDaEquipe(admin)).map((email) => ({ email })),
      responderPara: { email: c.email },
      assunto: `${c.tipo === "creditos" ? "Pedido de créditos" : "Novo chamado"}: ${c.assunto.slice(0, 80)}`,
      html: caixaDeEmail(
        `<h2 style="color:#1b2744;margin:0 0 12px">${c.tipo === "creditos" ? "Pedido de mais créditos" : "Novo chamado de atendimento"}</h2><p style="color:#2b3550;font-size:15px;line-height:1.6"><strong>${quem}</strong> (${escapar(c.email)})${onde}</p><p style="color:#2b3550;font-size:15px;line-height:1.6;white-space:pre-wrap">${escapar(c.mensagem || c.assunto)}</p>${botaoDeEmail("Abrir o Atendimento", "/admin/atendimento")}`,
      ),
    });
  } catch (e) {
    console.error("atendimento: aviso por e-mail falhou", e);
  }
  return true;
}

export async function abrirChamado(
  entrada: {
    token?: string | undefined;
    escola?: string | undefined;
    nome?: string | undefined;
    email?: string | undefined;
    mensagem: string;
    conversa: { autor: "professor" | "lumis"; texto: string }[];
  },
  origemDaRede: string,
): Promise<ResultadoChamado> {
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: "O atendimento ainda não está ativo neste servidor." };

  const usuario = entrada.token ? await usuarioDoToken(admin, entrada.token) : null;
  if (entrada.token && !usuario) {
    return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  }
  const limite = consumirAdaptacao(`chamado:${usuario?.id ?? origemDaRede}`, 5);
  if (!limite.ok) {
    return {
      ok: false,
      erro: `Você já abriu vários chamados nesta hora. Tente de novo em ${limite.minutos} min.`,
    };
  }

  let nome = entrada.nome?.trim() ?? "";
  let email = entrada.email?.trim().toLowerCase() ?? "";
  let escola: string | null = null;
  let escolaNome = "";
  let papel = "";
  if (usuario) {
    email = usuario.email ?? email;
    const { data: perfil } = await admin
      .from("perfis")
      .select("nome")
      .eq("id", usuario.id)
      .maybeSingle();
    nome = (perfil?.nome as string | null) || nome;
    if (entrada.escola) {
      const { data: vinculo } = await admin
        .from("vinculos")
        .select("papel, escolas(nome)")
        .eq("usuario", usuario.id)
        .eq("escola", entrada.escola)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (vinculo) {
        escola = entrada.escola;
        escolaNome =
          ((vinculo as unknown as { escolas: { nome: string } | null }).escolas?.nome as string) ??
          "";
        papel = vinculo.papel === "gestor" ? "Gestão" : "Professor(a)";
      }
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, erro: "Digite um e-mail válido para a equipe poder responder." };
  }

  const mensagem = entrada.mensagem.trim();
  const assunto = mensagem.split("\n")[0]?.slice(0, 120) || "Dúvida pelo chat";
  const ok = await registrarChamado(admin, {
    tipo: "duvida",
    origem: usuario ? "chat" : "chat-visitante",
    usuario: usuario?.id ?? null,
    nome,
    email,
    escola,
    escolaNome,
    papel,
    assunto,
    mensagem,
    conversa: entrada.conversa,
  });
  return ok
    ? { ok: true }
    : { ok: false, erro: "Não foi possível abrir o chamado agora. Tente de novo." };
}
