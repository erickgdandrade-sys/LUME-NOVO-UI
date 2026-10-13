/// <reference types="node" />
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const SITE = "https://lumeedu.com.br";
const REMETENTE = { name: "Lume", email: "devgang777@gmail.com" };

export function segredo(nome: string) {
  return globalThis.process?.env?.[nome]?.replace(/\s|\u{FEFF}/gu, "") || undefined;
}

export function clienteAdmin(): SupabaseClient | null {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const chave = segredo("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function usuarioDoToken(admin: SupabaseClient, token: string): Promise<User | null> {
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

export const escapar = (t: string) =>
  t.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export const caixaDeEmail = (conteudo: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px"><img src="${SITE}/email-logo.png" alt="Lume" height="40" style="margin-bottom:20px">${conteudo}</div>`;

export const botaoDeEmail = (texto: string, caminho: string) =>
  `<p style="margin-top:20px"><a href="${SITE}${caminho}" style="background:#1f6fe0;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${texto}</a></p>`;

export async function enviarEmail(email: {
  para: { email: string; name?: string | undefined }[];
  assunto: string;
  html: string;
  responderPara?: { email: string; name?: string | undefined } | undefined;
}) {
  const chave = segredo("BREVO_API_KEY");
  if (!chave || !email.para.length) return;
  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": chave, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: REMETENTE,
      to: email.para,
      subject: email.assunto,
      htmlContent: email.html,
      ...(email.responderPara ? { replyTo: email.responderPara } : {}),
    }),
  });
  if (!resposta.ok) throw new Error(`Brevo ${resposta.status}: ${await resposta.text()}`);
}

export async function emailsDaEquipe(admin: SupabaseClient): Promise<string[]> {
  const { data } = await admin
    .from("configuracoes")
    .select("valor")
    .eq("chave", "emails_pedidos_demonstracao")
    .maybeSingle();
  return ((data?.valor as string[] | undefined) ?? [REMETENTE.email]).filter(Boolean);
}
