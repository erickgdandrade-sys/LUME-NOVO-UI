import { perfilStore, type Perfil } from "./perfil-store";
import { contasReais, enderecoDoSite, supabase, traduzirErro } from "./supabase";

export type Resultado = { ok: true; aviso?: string } | { ok: false; erro: string };

type Linha = {
  nome: string | null;
  apelido: string | null;
  funcao: string | null;
  telefone: string | null;
  formacao: string | null;
  disciplinas: string[] | null;
  series: string[] | null;
  foto: string | null;
};

const COLUNAS = "nome, apelido, funcao, telefone, formacao, disciplinas, series, foto";

function paraPerfil(l: Linha, atual: Perfil): Perfil {
  return {
    nome: l.nome?.trim() || atual.nome,
    funcao: l.funcao || atual.funcao,
    apelido: l.apelido ?? "",
    telefone: l.telefone ?? "",
    formacao: l.formacao ?? "",
    disciplinas: l.disciplinas ?? [],
    series: l.series ?? [],
    foto: l.foto,
  };
}

export async function carregarMeuPerfil(usuarioId: string) {
  const { data, error } = await supabase()
    .from("perfis")
    .select(COLUNAS)
    .eq("id", usuarioId)
    .maybeSingle();
  if (error) {
    console.error("perfil: não carregou", error.message);
    return;
  }
  if (data) perfilStore.set(paraPerfil(data as Linha, perfilStore.get()));
}

export async function salvarMeuPerfil(p: Perfil): Promise<Resultado> {
  if (contasReais) {
    const { data } = await supabase().auth.getSession();
    const id = data.session?.user.id;
    if (!id) return { ok: false, erro: "Sua sessão venceu. Entre de novo." };
    const { error } = await supabase()
      .from("perfis")
      .update({
        nome: p.nome,
        apelido: p.apelido || null,
        funcao: p.funcao,
        telefone: p.telefone || null,
        formacao: p.formacao || null,
        disciplinas: p.disciplinas ?? [],
        series: p.series ?? [],
        foto: p.foto ?? null,
      })
      .eq("id", id);
    if (error) {
      console.error("perfil: não salvou", error.message);
      return { ok: false, erro: "Não foi possível salvar. Confira sua internet e tente de novo." };
    }
  }
  perfilStore.set(p);
  return { ok: true };
}

const LADO_DA_FOTO = 256;

export async function prepararFoto(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const tela = document.createElement("canvas");
  tela.width = LADO_DA_FOTO;
  tela.height = LADO_DA_FOTO;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - lado) / 2,
    (bitmap.height - lado) / 2,
    lado,
    lado,
    0,
    0,
    LADO_DA_FOTO,
    LADO_DA_FOTO,
  );
  const webp = tela.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : tela.toDataURL("image/jpeg", 0.85);
}

export async function trocarEmail(novo: string): Promise<Resultado> {
  if (!contasReais)
    return { ok: false, erro: "No modo de demonstração não dá para trocar o e-mail." };
  const { error } = await supabase().auth.updateUser(
    { email: novo.trim().toLowerCase() },
    { emailRedirectTo: enderecoDoSite("/confirmar") },
  );
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  return {
    ok: true,
    aviso:
      "Enviamos um link de confirmação para o e-mail novo, e pode chegar outro no e-mail atual. A troca acontece depois que você clicar no link.",
  };
}

export async function trocarSenha(atual: string, nova: string): Promise<Resultado> {
  if (!contasReais)
    return { ok: false, erro: "No modo de demonstração não dá para trocar a senha." };
  const sb = supabase();
  const email = (await sb.auth.getSession()).data.session?.user.email;
  if (!email) return { ok: false, erro: "Sua sessão venceu. Entre de novo." };
  const conferir = await sb.auth.signInWithPassword({ email, password: atual });
  if (conferir.error) return { ok: false, erro: "A senha atual não está certa." };
  const { error } = await sb.auth.updateUser({ password: nova });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  return { ok: true, aviso: "Senha trocada." };
}

export async function sairDeTodosOsAparelhos(): Promise<Resultado> {
  if (!contasReais) return { ok: true };
  const { error } = await supabase().auth.signOut({ scope: "global" });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  return { ok: true };
}
