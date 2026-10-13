import type { Session } from "@supabase/supabase-js";
import { carregarAcesso } from "./acesso";
import { createLocalStore } from "./local-store";
import { perfilStore } from "./perfil-store";
import { contasReais, enderecoDoSite, supabase, traduzirErro } from "./supabase";

type Sessao = {
  email: string;
  entrouEm: string;
  lembrar?: boolean;
};

const sessaoStore = createLocalStore<Sessao | null>("lume:sessao:v1", null);
export const useSessao = sessaoStore.use;

const MARCA_DA_ABA = "lume:sessao-aberta";

type Resultado = { ok: true } | { ok: false; erro: string };

function marcarAba() {
  try {
    window.sessionStorage.setItem(MARCA_DA_ABA, "1");
  } catch {}
}

function primeiroNome(texto: string) {
  const parte = texto.split("@")[0]?.split(/[._\-\s]/)[0] ?? "";
  return parte ? parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase() : "";
}

function usarNome(nome: string) {
  const perfil = perfilStore.get();
  if (perfil.nome === "Professora" && nome.length >= 2) perfilStore.set({ ...perfil, nome });
}

function aplicarSessaoReal(sessao: Session | null) {
  if (!sessao?.user.email) {
    if (sessaoStore.get()) sessaoStore.set(null);
    return;
  }
  const atual = sessaoStore.get();
  if (atual?.email === sessao.user.email) return;
  sessaoStore.set({
    email: sessao.user.email,
    entrouEm: new Date().toISOString(),
    lembrar: atual?.lembrar ?? true,
  });
  const nome = (sessao.user.user_metadata as { nome?: string } | null)?.nome ?? "";
  usarNome(primeiroNome(nome || sessao.user.email));
}

export async function iniciarSessao() {
  const atual = sessaoStore.get();
  let abaNova = true;
  try {
    abaNova = !window.sessionStorage.getItem(MARCA_DA_ABA);
  } catch {}
  if (atual && atual.lembrar === false && abaNova) await sair();

  if (!contasReais) {
    await carregarAcesso(null);
    return;
  }
  const sb = supabase();
  sb.auth.onAuthStateChange((evento, sessao) => {
    aplicarSessaoReal(sessao);
    if (evento === "SIGNED_IN" || evento === "SIGNED_OUT" || evento === "USER_UPDATED") {
      setTimeout(() => void carregarAcesso(sessao?.user.id ?? null), 0);
    }
  });
  const { data } = await sb.auth.getSession();
  aplicarSessaoReal(data.session);
  await carregarAcesso(data.session?.user.id ?? null);
}

export async function confirmarLink(
  tokenHash: string,
  tipo: "invite" | "recovery" | "email" | "email_change",
): Promise<Resultado> {
  const { data, error } = await supabase().auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  marcarAba();
  aplicarSessaoReal(data.session);
  await carregarAcesso(data.session?.user.id ?? null);
  return { ok: true };
}

export async function entrar(usuario: string, senha: string, lembrar: boolean): Promise<Resultado> {
  const limpo = usuario.trim();
  if (!contasReais) {
    sessaoStore.set({ email: limpo, entrouEm: new Date().toISOString(), lembrar });
    marcarAba();
    usarNome(primeiroNome(limpo));
    return { ok: true };
  }
  const { data, error } = await supabase().auth.signInWithPassword({
    email: limpo.toLowerCase(),
    password: senha,
  });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  sessaoStore.set({ email: data.user.email ?? limpo, entrouEm: new Date().toISOString(), lembrar });
  marcarAba();
  aplicarSessaoReal(data.session);
  await carregarAcesso(data.user.id);
  return { ok: true };
}

export async function reenviarConfirmacao(email: string): Promise<Resultado> {
  const { error } = await supabase().auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: enderecoDoSite("/entrar") },
  });
  return error ? { ok: false, erro: traduzirErro(error.message) } : { ok: true };
}

export async function pedirNovaSenha(email: string): Promise<Resultado> {
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: enderecoDoSite("/nova-senha"),
  });
  return error ? { ok: false, erro: traduzirErro(error.message) } : { ok: true };
}

export async function definirNovaSenha(senha: string): Promise<Resultado> {
  const { error } = await supabase().auth.updateUser({ password: senha });
  return error ? { ok: false, erro: traduzirErro(error.message) } : { ok: true };
}

export async function sair() {
  if (contasReais)
    await supabase()
      .auth.signOut()
      .catch(() => undefined);
  sessaoStore.set(null);
  try {
    window.sessionStorage.removeItem(MARCA_DA_ABA);
  } catch {}
}
