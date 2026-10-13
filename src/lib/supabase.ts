import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const chavePublica = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

export const contasReais = Boolean(url && chavePublica);

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!url || !chavePublica) throw new Error("Supabase não configurado.");
  cliente ??= createClient(url, chavePublica, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return cliente;
}

export function enderecoDoSite(caminho: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}${caminho}`;
}

export function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Você ainda não confirmou seu e-mail. Abra o link que enviamos para sua caixa de entrada.";
  if (m.includes("user already registered")) return "Esse e-mail já tem uma conta. Tente entrar.";
  if (m.includes("banned"))
    return "Esta conta está bloqueada. Fale com a coordenação da escola ou com a equipe da Lume.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  if (m.includes("email address") && m.includes("invalid")) return "Esse e-mail não é válido.";
  if (m.includes("same password")) return "A nova senha precisa ser diferente da atual.";
  if (m.includes("fetch") || m.includes("network"))
    return "Não foi possível falar com o servidor. Verifique sua internet.";
  return "Não foi possível concluir agora. Tente de novo em instantes.";
}
