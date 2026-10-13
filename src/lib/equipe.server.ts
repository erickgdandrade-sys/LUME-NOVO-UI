/// <reference types="node" />
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SITE } from "./servidor.server";

export type ResultadoEquipe = { ok: true; mensagem: string } | { ok: false; erro: string };

async function comoAdmin(
  token: string,
): Promise<{ admin: SupabaseClient; eu: string } | { erro: string }> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const chaveSecreta = globalThis.process?.env?.["SUPABASE_SERVICE_ROLE_KEY"]?.replace(
    /\s|\u{FEFF}/gu,
    "",
  );
  if (!url || !chaveSecreta) return { erro: "A equipe ainda não foi ativada neste servidor." };
  const admin = createClient(url, chaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: quem, error } = await admin.auth.getUser(token);
  if (error || !quem.user) {
    return { erro: "O servidor não reconheceu sua sessão. Clique em Sair e entre de novo." };
  }
  const { data: ehAdmin } = await admin
    .from("admins_lume")
    .select("usuario")
    .eq("usuario", quem.user.id)
    .maybeSingle();
  if (!ehAdmin) return { erro: "Só o Admin Lume pode mexer na equipe." };
  return { admin, eu: quem.user.id };
}

export async function convidarAdmin(token: string, emailBruto: string): Promise<ResultadoEquipe> {
  const acesso = await comoAdmin(token);
  if ("erro" in acesso) return { ok: false, erro: acesso.erro };
  const { admin, eu } = acesso;
  const email = emailBruto.trim().toLowerCase();

  const { data: perfil } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
  if (perfil) {
    const { error } = await admin
      .from("admins_lume")
      .upsert(
        { usuario: perfil.id, adicionado_por: eu },
        { onConflict: "usuario", ignoreDuplicates: true },
      );
    return error
      ? { ok: false, erro: "Não foi possível adicionar essa pessoa agora." }
      : { ok: true, mensagem: `${email} já tinha conta e agora é Admin Lume.` };
  }

  await admin.from("convites_admin").delete().eq("email", email).is("aceito_em", null);
  const { data: convite, error: erroConvite } = await admin
    .from("convites_admin")
    .insert({ email, convidado_por: eu })
    .select("id")
    .single();
  if (erroConvite) return { ok: false, erro: "Não foi possível registrar o convite." };

  const { error: erroEmail } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE}/confirmar`,
    data: { admin: true },
  });
  if (erroEmail) {
    await admin.from("convites_admin").delete().eq("id", convite.id);
    if (erroEmail.message.toLowerCase().includes("rate limit")) {
      return { ok: false, erro: "Muitos convites em pouco tempo. Aguarde alguns minutos." };
    }
    return { ok: false, erro: "Não foi possível enviar o e-mail de convite. Tente de novo." };
  }
  return { ok: true, mensagem: `Convite enviado para ${email}.` };
}

export async function removerAdmin(token: string, usuario: string): Promise<ResultadoEquipe> {
  const acesso = await comoAdmin(token);
  if ("erro" in acesso) return { ok: false, erro: acesso.erro };
  if (usuario === acesso.eu) {
    return { ok: false, erro: "Você não pode remover a si mesmo. Peça para outro Admin." };
  }
  const { data, error } = await acesso.admin
    .from("admins_lume")
    .delete()
    .eq("usuario", usuario)
    .select("usuario");
  if (error) {
    return error.message.includes("pelo menos um Admin")
      ? { ok: false, erro: "A Lume precisa ter pelo menos um Admin." }
      : { ok: false, erro: "Não foi possível remover agora. Tente de novo." };
  }
  if (!data?.length) return { ok: false, erro: "Essa pessoa já não era Admin." };
  return { ok: true, mensagem: "Removido da equipe." };
}

export async function cancelarConviteAdmin(token: string, id: string): Promise<ResultadoEquipe> {
  const acesso = await comoAdmin(token);
  if ("erro" in acesso) return { ok: false, erro: acesso.erro };
  const { error } = await acesso.admin
    .from("convites_admin")
    .delete()
    .eq("id", id)
    .is("aceito_em", null);
  return error
    ? { ok: false, erro: "Não foi possível cancelar agora." }
    : { ok: true, mensagem: "Convite cancelado." };
}
