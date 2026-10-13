/// <reference types="node" />
import { gestoresDaEscola } from "./creditos.server";
import { dataBR, nomeDoMes, reais, totalDa } from "./financeiro";
import {
  caixaDeEmail,
  clienteAdmin,
  emailsDaEquipe,
  enviarEmail,
  escapar,
  usuarioDoToken,
} from "./servidor.server";

export type ResultadoLembrete = { ok: true; mensagem: string } | { ok: false; erro: string };

export async function lembrarGestor(token: string, cobranca: string): Promise<ResultadoLembrete> {
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: "O servidor ainda não está configurado para isso." };
  const eu = await usuarioDoToken(admin, token);
  if (!eu) return { ok: false, erro: "Sua sessão venceu. Clique em Sair e entre de novo." };
  const { data: ehAdmin } = await admin
    .from("admins_lume")
    .select("usuario")
    .eq("usuario", eu.id)
    .maybeSingle();
  if (!ehAdmin) return { ok: false, erro: "Só a equipe da Lume pode fazer isso." };

  const { data: c } = await admin
    .from("cobrancas")
    .select("escola, competencia, vencimento, valor, valor_extra, creditos_extra, situacao")
    .eq("id", cobranca)
    .maybeSingle();
  if (!c) return { ok: false, erro: "Mensalidade não encontrada." };
  if (c.situacao !== "pendente") return { ok: false, erro: "Essa mensalidade não está pendente." };

  const [{ data: escola }, gestores, equipe] = await Promise.all([
    admin.from("escolas").select("nome").eq("id", c.escola).maybeSingle(),
    gestoresDaEscola(admin, c.escola as string),
    emailsDaEquipe(admin),
  ]);
  if (!gestores.length) return { ok: false, erro: "Essa escola ainda não tem gestor com e-mail." };

  const nome = escapar((escola?.nome as string | undefined) ?? "sua escola");
  const total = totalDa({ valor: Number(c.valor), valor_extra: Number(c.valor_extra) });
  const vencida = Date.parse(`${c.vencimento as string}T23:59:59-03:00`) < Date.now();
  const extra =
    Number(c.valor_extra) > 0
      ? `<br>Inclui ${c.creditos_extra as number} créditos de IA extras do mês anterior (${reais(Number(c.valor_extra))}).`
      : "";
  try {
    await enviarEmail({
      para: gestores,
      responderPara: equipe[0] ? { email: equipe[0] } : undefined,
      assunto: vencida
        ? `Mensalidade da Lume em atraso · ${(escola?.nome as string | undefined) ?? ""}`
        : `Lembrete: mensalidade da Lume vence em ${dataBR(c.vencimento as string)}`,
      html: caixaDeEmail(
        `<h2 style="color:#1b2744;margin:0 0 12px">${vencida ? "Mensalidade em atraso" : "Lembrete de mensalidade"}</h2><p style="color:#2b3550;font-size:15px;line-height:1.6">Olá! A mensalidade da Lume da <strong>${nome}</strong>, referente a ${nomeDoMes(c.competencia as string)}, ${vencida ? "venceu" : "vence"} em <strong>${dataBR(c.vencimento as string)}</strong>.<br>Valor: <strong>${reais(total)}</strong>.${extra}</p><p style="color:#8a94a6;font-size:13px;line-height:1.6">Se o pagamento já foi feito, desconsidere este e-mail. Dúvidas? É só responder esta mensagem.</p>`,
      ),
    });
  } catch (e) {
    console.error("lembrete: e-mail falhou", e);
    return { ok: false, erro: "Não foi possível enviar o e-mail agora." };
  }
  return {
    ok: true,
    mensagem: `Lembrete enviado para ${gestores.map((g) => g.email).join(", ")}.`,
  };
}
