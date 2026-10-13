/// <reference types="node" />
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { SITE, clienteAdmin, usuarioDoToken } from "./servidor.server";

export type PapelDaConta = {
  escola: string;
  escolaNome: string;
  papel: "gestor" | "professor";
  ativo: boolean;
};

export type Conta = {
  id: string | null;
  email: string;
  nome: string;
  foto: string | null;
  ultimoAcesso: string | null;
  criadaEm: string | null;
  bloqueada: boolean;
  admin: boolean;
  papeis: PapelDaConta[];
  convitePendente: string | null;
};

export type ResultadoContas =
  { ok: true; contas: Conta[]; eu: string } | { ok: false; erro: string };
export type ResultadoAcao = { ok: true; mensagem: string } | { ok: false; erro: string };

const BLOQUEIO = "876000h";

async function comoAdmin(
  token: string,
): Promise<{ ok: true; admin: SupabaseClient; eu: User } | { ok: false; erro: string }> {
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: "O servidor ainda não está configurado para isso." };
  const eu = await usuarioDoToken(admin, token);
  if (!eu) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  const { data } = await admin
    .from("admins_lume")
    .select("usuario")
    .eq("usuario", eu.id)
    .maybeSingle();
  if (!data) return { ok: false, erro: "Só a equipe da Lume pode fazer isso." };
  return { ok: true, admin, eu };
}

async function todosOsUsuarios(admin: SupabaseClient): Promise<User[]> {
  const todos: User[] = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw new Error(error.message);
    todos.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return todos;
}

const estaBloqueada = (u: User) =>
  Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now());

export async function listarContas(token: string): Promise<ResultadoContas> {
  const acesso = await comoAdmin(token);
  if (!acesso.ok) return acesso;
  const { admin } = acesso;
  try {
    const [usuarios, perfis, vinculos, escolas, admins, convites, convitesAdmin] =
      await Promise.all([
        todosOsUsuarios(admin),
        admin.from("perfis").select("id, nome, foto, ultimo_acesso"),
        admin.from("vinculos").select("usuario, escola, papel, ativo"),
        admin.from("escolas").select("id, nome"),
        admin.from("admins_lume").select("usuario"),
        admin.from("convites").select("email, escola, papel").is("aceito_em", null),
        admin.from("convites_admin").select("email").is("aceito_em", null),
      ]);
    const nomeDaEscola = new Map(
      (escolas.data ?? []).map((e) => [e.id as string, e.nome as string]),
    );
    const perfil = new Map((perfis.data ?? []).map((p) => [p.id as string, p]));
    const ehAdmin = new Set((admins.data ?? []).map((a) => a.usuario as string));
    const papeis = new Map<string, PapelDaConta[]>();
    for (const v of vinculos.data ?? []) {
      const lista = papeis.get(v.usuario as string) ?? [];
      lista.push({
        escola: v.escola as string,
        escolaNome: nomeDaEscola.get(v.escola as string) ?? "Escola",
        papel: v.papel as "gestor" | "professor",
        ativo: v.ativo as boolean,
      });
      papeis.set(v.usuario as string, lista);
    }

    const contas: Conta[] = usuarios.map((u) => {
      const p = perfil.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        nome: (p?.nome as string | null) || "",
        foto: (p?.foto as string | null) ?? null,
        ultimoAcesso: (p?.ultimo_acesso as string | null) ?? u.last_sign_in_at ?? null,
        criadaEm: u.created_at ?? null,
        bloqueada: estaBloqueada(u),
        admin: ehAdmin.has(u.id),
        papeis: papeis.get(u.id) ?? [],
        convitePendente: null,
      };
    });

    const comConta = new Set(contas.map((c) => c.email.toLowerCase()));
    const pendentes = new Map<string, string>();
    for (const c of convites.data ?? []) {
      const email = (c.email as string).toLowerCase();
      if (comConta.has(email)) continue;
      const rotulo = `${c.papel === "gestor" ? "Gestão" : "Professor(a)"} · ${nomeDaEscola.get(c.escola as string) ?? "Escola"}`;
      pendentes.set(email, pendentes.has(email) ? `${pendentes.get(email)}, ${rotulo}` : rotulo);
    }
    for (const c of convitesAdmin.data ?? []) {
      const email = (c.email as string).toLowerCase();
      if (comConta.has(email)) continue;
      pendentes.set(
        email,
        pendentes.has(email) ? `${pendentes.get(email)}, Equipe Lume` : "Equipe Lume",
      );
    }
    for (const [email, rotulo] of pendentes) {
      contas.push({
        id: null,
        email,
        nome: "",
        foto: null,
        ultimoAcesso: null,
        criadaEm: null,
        bloqueada: false,
        admin: false,
        papeis: [],
        convitePendente: rotulo,
      });
    }

    contas.sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email, "pt-BR"));
    return { ok: true, contas, eu: acesso.eu.id };
  } catch (e) {
    console.error("contas: não listou", e);
    return { ok: false, erro: "Não foi possível carregar as contas agora." };
  }
}

async function usuarioPorId(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  return error ? null : data.user;
}

async function mandarLinkDeSenha(admin: SupabaseClient, email: string): Promise<ResultadoAcao> {
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE}/confirmar`,
  });
  if (error) {
    console.error("contas: link de senha falhou", error.message);
    return {
      ok: false,
      erro: error.message.toLowerCase().includes("rate")
        ? "Muitos e-mails em pouco tempo. Aguarde alguns minutos."
        : "Não foi possível enviar o e-mail agora.",
    };
  }
  return { ok: true, mensagem: `Enviamos para ${email} um link para criar uma nova senha.` };
}

export async function reenviarAcesso(
  token: string,
  alvo: { usuario?: string | undefined; email?: string | undefined },
): Promise<ResultadoAcao> {
  const acesso = await comoAdmin(token);
  if (!acesso.ok) return acesso;
  const { admin } = acesso;
  const usuario = alvo.usuario ? await usuarioPorId(admin, alvo.usuario) : null;
  const email = (usuario?.email ?? alvo.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, erro: "Conta não encontrada." };

  if (!usuario || (!usuario.last_sign_in_at && !usuario.email_confirmed_at)) {
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${SITE}/confirmar`,
    });
    if (!error) return { ok: true, mensagem: `Convite reenviado para ${email}.` };
    if (!usuario) {
      console.error("contas: convite não reenviado", error.message);
      return { ok: false, erro: "Não foi possível reenviar o convite agora." };
    }
  }
  return mandarLinkDeSenha(admin, email);
}

export async function linkDeNovaSenha(token: string, usuario: string): Promise<ResultadoAcao> {
  const acesso = await comoAdmin(token);
  if (!acesso.ok) return acesso;
  const u = await usuarioPorId(acesso.admin, usuario);
  if (!u?.email) return { ok: false, erro: "Conta não encontrada." };
  return mandarLinkDeSenha(acesso.admin, u.email);
}

export async function corrigirEmail(
  token: string,
  usuario: string,
  novo: string,
): Promise<ResultadoAcao> {
  const acesso = await comoAdmin(token);
  if (!acesso.ok) return acesso;
  const email = novo.trim().toLowerCase();
  const { error } = await acesso.admin.auth.admin.updateUserById(usuario, {
    email,
    email_confirm: true,
  });
  if (error) {
    const m = error.message.toLowerCase();
    console.error("contas: e-mail não corrigido", error.message);
    return {
      ok: false,
      erro:
        m.includes("already") || m.includes("exists")
          ? "Já existe uma conta com esse e-mail."
          : "Não foi possível trocar o e-mail.",
    };
  }
  return { ok: true, mensagem: `E-mail trocado para ${email}. A pessoa já entra com ele.` };
}

export async function definirBloqueio(
  token: string,
  usuario: string,
  bloquear: boolean,
): Promise<ResultadoAcao> {
  const acesso = await comoAdmin(token);
  if (!acesso.ok) return acesso;
  const { admin, eu } = acesso;
  if (bloquear && usuario === eu.id) {
    return { ok: false, erro: "Você não pode bloquear a sua própria conta." };
  }
  if (bloquear) {
    const { data: admins } = await admin.from("admins_lume").select("usuario");
    const lista = (admins ?? []).map((a) => a.usuario as string);
    if (lista.includes(usuario) && lista.length <= 1) {
      return { ok: false, erro: "Essa é a única conta de Admin. Ela não pode ser bloqueada." };
    }
  }
  const { error } = await admin.auth.admin.updateUserById(usuario, {
    ban_duration: bloquear ? BLOQUEIO : "none",
  });
  if (error) {
    console.error("contas: bloqueio falhou", error.message);
    return { ok: false, erro: "Não foi possível mudar o acesso dessa conta." };
  }
  return {
    ok: true,
    mensagem: bloquear
      ? "Conta bloqueada: a pessoa não consegue mais entrar. Os dados dela continuam guardados."
      : "Conta desbloqueada: a pessoa já pode entrar de novo.",
  };
}
