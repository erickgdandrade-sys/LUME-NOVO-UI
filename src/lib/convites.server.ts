/// <reference types="node" />
import { createClient } from "@supabase/supabase-js";
import { SITE } from "./servidor.server";

export type ResultadoConvite = { ok: true; jaTinhaConta: boolean } | { ok: false; erro: string };

export async function convidar(entrada: {
  token: string;
  escola: string;
  email: string;
  papel: "gestor" | "professor";
  turmas?: { turma: string; disciplina: string }[];
}): Promise<ResultadoConvite> {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const chaveSecreta = globalThis.process?.env?.["SUPABASE_SERVICE_ROLE_KEY"]?.replace(
    /\s|\u{FEFF}/gu,
    "",
  );
  if (!url || !chaveSecreta) {
    return { ok: false, erro: "Os convites ainda não foram ativados neste servidor." };
  }
  const admin = createClient(url, chaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: quem, error: erroSessao } = await admin.auth.getUser(entrada.token);
  if (erroSessao || !quem.user) {
    console.error("convite: sessão não confirmada", erroSessao?.status, erroSessao?.message);
    return {
      ok: false,
      erro: "O servidor não reconheceu sua sessão. Clique em Sair e entre de novo.",
    };
  }

  const [ehAdmin, ehGestor, escola] = await Promise.all([
    admin.from("admins_lume").select("usuario").eq("usuario", quem.user.id).maybeSingle(),
    admin
      .from("vinculos")
      .select("id")
      .eq("usuario", quem.user.id)
      .eq("escola", entrada.escola)
      .eq("papel", "gestor")
      .eq("ativo", true)
      .maybeSingle(),
    admin.from("escolas").select("id, nome, ativa").eq("id", entrada.escola).maybeSingle(),
  ]);
  const podeConvidar =
    Boolean(ehAdmin.data) || (Boolean(ehGestor.data) && entrada.papel === "professor");
  if (!podeConvidar) return { ok: false, erro: "Você não tem permissão para esse convite." };
  if (!escola.data?.ativa) return { ok: false, erro: "Essa escola não está ativa." };

  const email = entrada.email.trim().toLowerCase();

  let turmas: { turma: string; disciplina: string }[] = [];
  if (entrada.papel === "professor" && entrada.turmas?.length) {
    const { data: daEscola } = await admin
      .from("turmas")
      .select("id")
      .eq("escola", entrada.escola)
      .in(
        "id",
        entrada.turmas.map((t) => t.turma),
      );
    const validas = new Set((daEscola ?? []).map((t) => t.id as string));
    turmas = entrada.turmas.filter((t) => validas.has(t.turma));
  }

  const { data: perfil } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
  if (perfil) {
    const { error } = await admin
      .from("vinculos")
      .upsert(
        { usuario: perfil.id, escola: entrada.escola, papel: entrada.papel, ativo: true },
        { onConflict: "usuario,escola,papel" },
      );
    if (!error && turmas.length) {
      const { error: erroTurmas } = await admin.from("turma_professores").upsert(
        turmas.map((t) => ({
          turma: t.turma,
          professor: perfil.id,
          disciplina: t.disciplina.trim() || null,
        })),
        { onConflict: "turma,professor", ignoreDuplicates: true },
      );
      if (erroTurmas) console.error("convite: turmas não vinculadas", erroTurmas.message);
    }
    return error
      ? { ok: false, erro: "Não foi possível vincular essa pessoa agora." }
      : { ok: true, jaTinhaConta: true };
  }

  await admin
    .from("convites")
    .delete()
    .eq("escola", entrada.escola)
    .eq("email", email)
    .eq("papel", entrada.papel)
    .is("aceito_em", null);
  const { data: convite, error: erroConvite } = await admin
    .from("convites")
    .insert({
      escola: entrada.escola,
      email,
      papel: entrada.papel,
      convidado_por: quem.user.id,
      turmas,
    })
    .select("id")
    .single();
  if (erroConvite) return { ok: false, erro: "Não foi possível registrar o convite." };

  const { error: erroEmail } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE}/confirmar`,
    data: { escola: escola.data.nome },
  });
  if (erroEmail) {
    await admin.from("convites").delete().eq("id", convite.id);
    const m = erroEmail.message.toLowerCase();
    if (m.includes("rate limit")) {
      return { ok: false, erro: "Muitos convites em pouco tempo. Aguarde alguns minutos." };
    }
    return { ok: false, erro: "Não foi possível enviar o e-mail de convite. Tente de novo." };
  }
  return { ok: true, jaTinhaConta: false };
}
