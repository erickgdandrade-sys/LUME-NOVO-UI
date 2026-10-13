/// <reference types="node" />
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PedidoDemonstracao } from "./demonstracao";
import {
  SITE,
  botaoDeEmail,
  caixaDeEmail,
  clienteAdmin,
  emailsDaEquipe,
  enviarEmail,
  escapar,
  segredo,
} from "./servidor.server";

export type ResultadoPedido = { ok: true } | { ok: false; erro: string };

const LIMITE_POR_HORA = 5;

async function resumo(texto: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function registrarPedido(
  pedido: PedidoDemonstracao,
  ip: string | undefined,
): Promise<ResultadoPedido> {
  const admin = clienteAdmin();
  if (!admin) {
    return { ok: false, erro: "O envio de pedidos ainda não foi ativado neste servidor." };
  }

  const sal = segredo("SUPABASE_SERVICE_ROLE_KEY")!.slice(-16);
  const origem = ip ? await resumo(`${sal}:${ip}`) : null;
  const email = pedido.email.trim().toLowerCase();

  if (origem) {
    const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("pedidos_demonstracao")
      .select("id", { count: "exact", head: true })
      .eq("origem_hash", origem)
      .gte("criado_em", umaHora);
    if ((count ?? 0) >= LIMITE_POR_HORA) {
      return { ok: false, erro: "Recebemos muitos pedidos daqui. Tente de novo mais tarde." };
    }
  }

  const dezMinutos = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: repetido } = await admin
    .from("pedidos_demonstracao")
    .select("id")
    .eq("email", email)
    .gte("criado_em", dezMinutos)
    .limit(1)
    .maybeSingle();
  if (repetido) return { ok: true };

  const { error } = await admin.from("pedidos_demonstracao").insert({
    nome: pedido.nome.trim(),
    email,
    telefone: pedido.telefone,
    escola: pedido.escola.trim(),
    cargo: pedido.cargo,
    estado: pedido.estado,
    cidade: pedido.cidade.trim(),
    mensagem: pedido.mensagem?.trim() || null,
    origem_hash: origem,
  });
  if (error) {
    console.error("pedido de demonstração: não gravou", error.code, error.message);
    return { ok: false, erro: "Não foi possível registrar seu pedido agora. Tente de novo." };
  }

  try {
    await avisar(admin, { ...pedido, email });
  } catch (e) {
    console.error("pedido de demonstração: aviso por e-mail falhou", e);
  }
  return { ok: true };
}

async function avisar(admin: SupabaseClient, p: PedidoDemonstracao) {
  const linhas: [string, string][] = [
    ["Nome", p.nome],
    ["E-mail", p.email],
    ["Telefone", p.telefone],
    ["Escola", p.escola],
    ["Cargo", p.cargo],
    ["Cidade", `${p.cidade} - ${p.estado}`],
  ];
  if (p.mensagem) linhas.push(["Como podemos ajudar", p.mensagem]);
  const tabela = linhas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#5b6478;vertical-align:top">${k}</td><td style="padding:6px 0;color:#1b2744;white-space:pre-wrap">${escapar(v)}</td></tr>`,
    )
    .join("");

  await Promise.all([
    enviarEmail({
      para: (await emailsDaEquipe(admin)).map((email) => ({ email })),
      responderPara: { email: p.email, name: p.nome },
      assunto: `Novo pedido de demonstração: ${p.escola}`,
      html: caixaDeEmail(
        `<h2 style="color:#1b2744;margin:0 0 12px">Novo pedido de demonstração</h2><table style="border-collapse:collapse;font-size:15px">${tabela}</table>${botaoDeEmail("Abrir no painel", "/admin/demonstracoes")}<p style="color:#8a93a6;font-size:13px">Responda este e-mail para falar direto com ${escapar(p.nome)}.</p>`,
      ),
    }),
    enviarEmail({
      para: [{ email: p.email, name: p.nome }],
      assunto: "Recebemos seu pedido de demonstração da Lume",
      html: caixaDeEmail(
        `<h2 style="color:#1b2744;margin:0 0 12px">Olá, ${escapar(p.nome.split(" ")[0] ?? p.nome)}!</h2><p style="color:#2b3550;font-size:15px;line-height:1.6">Recebemos seu pedido de demonstração da Lume para <strong>${escapar(p.escola)}</strong>. Nossa equipe vai entrar em contato em breve para combinar um horário.</p><p style="color:#8a93a6;font-size:13px;line-height:1.6">Você recebeu este e-mail porque preencheu o formulário em ${SITE}/demonstracao. Seus dados são usados apenas para esse contato.</p>`,
      ),
    }),
  ]);
}
