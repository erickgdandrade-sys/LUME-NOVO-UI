import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  HeartHandshake,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { GraficoBarras } from "@/components/GraficoBarras";
import { SecaoRecolhivel } from "@/components/SecaoRecolhivel";
import { supabase } from "@/lib/supabase";
import {
  dataBR,
  hojeISO,
  primeiroDoMes,
  reais,
  resumoFinanceiro,
  totalDa,
  type Cobranca,
} from "@/lib/financeiro";
import { dataCurta, exigir, useDados } from "@/lib/usar-dados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Painel | Admin Lume" }] }),
  component: PainelGeral,
});

type EscolaNoPainel = {
  id: string;
  nome: string;
  ativa: boolean;
  plano_nome: string;
  creditos_limite: number | null;
  creditos_usados: number;
  creditos_extra: number;
  professores: number;
  alunos: number;
  alunos_com_necessidades: number;
  planejamentos_mes: number;
  provas_mes: number;
  participacao_mes: number | null;
  ultimo_acesso: string | null;
};
type Mes = {
  mes: string;
  creditos: number;
  planejamentos: number;
  provas: number;
  participacao_media: number | null;
};
type Painel = { escolas: EscolaNoPainel[]; meses: Mes[] };

const ROTULOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const rotuloDoMes = (iso: string) => ROTULOS[Number(iso.slice(5, 7)) - 1] ?? iso;
const numero = (n: number) => n.toLocaleString("pt-BR");

function pctDe(e: EscolaNoPainel) {
  if (!e.creditos_limite) return null;
  return Math.round((e.creditos_usados / e.creditos_limite) * 100);
}

function PainelGeral() {
  const { dados, erro, carregando } = useDados(async () => {
    const sb = supabase();
    const mesAtual = primeiroDoMes(hojeISO());
    const [r, abertos, cobrancas] = await Promise.all([
      sb.rpc("painel_admin"),
      sb.from("tickets").select("id", { count: "exact", head: true }).eq("situacao", "aberto"),
      sb
        .from("cobrancas")
        .select(
          "id, escola, competencia, vencimento, valor, creditos_extra, valor_extra, situacao, pago_em, forma, observacao",
        )
        .or(`competencia.eq.${mesAtual},situacao.eq.pendente`),
    ]);
    const lista = ((cobrancas.data ?? []) as Cobranca[]).map((c) => ({
      ...c,
      valor: Number(c.valor),
      valor_extra: Number(c.valor_extra),
    }));
    return {
      ...(exigir(r) as Painel),
      chamadosAbertos: abertos.count ?? 0,
      cobrancas: lista,
      mesAtual,
    };
  }, []);

  const ativas = (dados?.escolas ?? []).filter((e) => e.ativa);
  const soma = (campo: keyof EscolaNoPainel) =>
    ativas.reduce((s, e) => s + (Number(e[campo]) || 0), 0);
  const participacoes = ativas
    .map((e) => e.participacao_mes)
    .filter((p): p is number => p !== null);
  const participacao = participacoes.length
    ? Math.round(participacoes.reduce((a, b) => a + b, 0) / participacoes.length)
    : null;

  const cartoes: { rotulo: string; valor: string; icon: LucideIcon; tom: string }[] = [
    { rotulo: "Escolas ativas", valor: numero(ativas.length), icon: Building2, tom: "bg-sky-soft" },
    { rotulo: "Professores", valor: numero(soma("professores")), icon: Users, tom: "bg-leaf-soft" },
    { rotulo: "Alunos", valor: numero(soma("alunos")), icon: UsersRound, tom: "bg-lilac-soft" },
    {
      rotulo: "Com necessidades específicas",
      valor: numero(soma("alunos_com_necessidades")),
      icon: HeartHandshake,
      tom: "bg-coral-soft",
    },
    {
      rotulo: "Planejamentos no mês",
      valor: numero(soma("planejamentos_mes")),
      icon: BookOpenCheck,
      tom: "bg-sun-soft",
    },
    {
      rotulo: "Provas no mês",
      valor: numero(soma("provas_mes")),
      icon: ClipboardCheck,
      tom: "bg-sky-soft",
    },
    {
      rotulo: "Créditos de IA no mês",
      valor: numero(soma("creditos_usados")),
      icon: Sparkles,
      tom: "bg-tangerine-soft",
    },
    {
      rotulo: "Participação média",
      valor: participacao === null ? "—" : `${participacao}%`,
      icon: TrendingUp,
      tom: "bg-leaf-soft",
    },
  ];

  const pontos = (campo: "creditos" | "planejamentos" | "provas" | "participacao_media") =>
    (dados?.meses ?? []).map((m) => ({
      rotulo: rotuloDoMes(m.mes),
      valor: m[campo] === null ? null : Number(m[campo]),
    }));

  const ordenadas = [...(dados?.escolas ?? [])].sort(
    (a, b) => Number(b.ativa) - Number(a.ativa) || b.creditos_usados - a.creditos_usados,
  );
  const perto = ativas.filter((e) => (pctDe(e) ?? 0) >= 80);
  const extras = ativas.filter((e) => e.creditos_extra > 0);
  const chamados = dados?.chamadosAbertos ?? 0;
  const hoje = hojeISO();
  const doMes = resumoFinanceiro(
    (dados?.cobrancas ?? []).filter((c) => c.competencia === dados?.mesAtual),
    hoje,
  );
  const geral = resumoFinanceiro(dados?.cobrancas ?? [], hoje);
  const nomeDaEscola = (id: string) => dados?.escolas.find((e) => e.id === id)?.nome ?? "Escola";

  return (
    <div>
      <PageHeader
        title="Painel da Lume"
        subtitle="Como as escolas estão usando a Lume neste mês. Só números: nenhum dado de aluno aparece aqui."
      />

      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando o painel…
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="card-soft p-4">
            <span className={`mb-2 grid h-8 w-8 place-items-center rounded-xl ${c.tom}`}>
              <c.icon className="h-4 w-4" />
            </span>
            <p className="font-display text-2xl font-semibold">{dados ? c.valor : "…"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.rotulo}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { rotulo: "Receita prevista no mês", valor: doMes.previsto, tom: "bg-sky-soft" },
          { rotulo: "Recebido no mês", valor: doMes.recebido, tom: "bg-leaf-soft" },
          { rotulo: "A receber no mês", valor: doMes.aReceber, tom: "bg-sun-soft" },
          { rotulo: "Em atraso (todos os meses)", valor: geral.emAtraso, tom: "bg-coral-soft" },
        ].map((c) => (
          <Link
            key={c.rotulo}
            to="/admin/financeiro"
            className="card-soft block p-4 hover:opacity-90"
          >
            <span className={`mb-2 block h-1.5 w-8 rounded-full ${c.tom}`} />
            <p className="font-display text-xl font-semibold">{dados ? reais(c.valor) : "…"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.rotulo}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {perto.length ||
        extras.length ||
        chamados ||
        geral.atrasadas.length ||
        geral.venceLogo.length ? (
          <SecaoRecolhivel
            chave="admin-atencao"
            titulo="Precisa de atenção"
            resumo={`${perto.length + extras.length + (chamados ? 1 : 0) + geral.atrasadas.length + geral.venceLogo.length} avisos`}
          >
            <ul className="space-y-2 text-sm">
              {geral.atrasadas.map((c) => (
                <li key={`a-${c.id}`} className="rounded-2xl bg-coral-soft px-4 py-3">
                  <Link to="/admin/financeiro" className="font-semibold hover:underline">
                    {nomeDaEscola(c.escola)}
                  </Link>{" "}
                  está com a mensalidade de <strong>{reais(totalDa(c))}</strong> em atraso desde{" "}
                  {dataBR(c.vencimento)}.
                </li>
              ))}
              {geral.venceLogo.map((c) => (
                <li key={`v-${c.id}`} className="rounded-2xl bg-sun-soft px-4 py-3">
                  <Link to="/admin/financeiro" className="font-semibold hover:underline">
                    {nomeDaEscola(c.escola)}
                  </Link>{" "}
                  tem mensalidade de <strong>{reais(totalDa(c))}</strong> vencendo em{" "}
                  {dataBR(c.vencimento)}.
                </li>
              ))}
              {chamados ? (
                <li className="rounded-2xl bg-sky-soft px-4 py-3">
                  <Link to="/admin/atendimento" className="font-semibold hover:underline">
                    {chamados} {chamados === 1 ? "chamado aberto" : "chamados abertos"}
                  </Link>{" "}
                  no Atendimento, esperando resposta.
                </li>
              ) : null}
              {perto.map((e) => (
                <li key={`p-${e.id}`} className="rounded-2xl bg-sun-soft px-4 py-3">
                  <Link
                    to="/admin/escola/$id"
                    params={{ id: e.id }}
                    className="font-semibold hover:underline"
                  >
                    {e.nome}
                  </Link>{" "}
                  já usou <strong>{pctDe(e)}%</strong> dos créditos do mês ({e.creditos_usados} de{" "}
                  {e.creditos_limite}). Pode ser hora de oferecer um plano maior.
                </li>
              ))}
              {extras.map((e) => (
                <li key={`x-${e.id}`} className="rounded-2xl bg-lilac-soft px-4 py-3">
                  <Link
                    to="/admin/escola/$id"
                    params={{ id: e.id }}
                    className="font-semibold hover:underline"
                  >
                    {e.nome}
                  </Link>{" "}
                  usou <strong>{e.creditos_extra}</strong> créditos extras neste mês, a cobrar.
                </li>
              ))}
            </ul>
          </SecaoRecolhivel>
        ) : null}

        <SecaoRecolhivel
          chave="admin-graficos"
          titulo="Últimos 6 meses"
          resumo="Créditos, planejamentos, provas e participação, somando todas as escolas"
        >
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <GraficoBarras titulo="Créditos de IA" dados={pontos("creditos")} />
            <GraficoBarras titulo="Planejamentos" dados={pontos("planejamentos")} cor="bg-leaf" />
            <GraficoBarras titulo="Provas" dados={pontos("provas")} cor="bg-sky" />
            <GraficoBarras
              titulo="Participação média"
              dados={pontos("participacao_media")}
              unidade="%"
              maximo={100}
              cor="bg-tangerine"
            />
          </div>
        </SecaoRecolhivel>

        <SecaoRecolhivel
          chave="admin-escolas"
          titulo="Escolas neste mês"
          resumo={`${ativas.length} ativas`}
          className="overflow-hidden"
          acao={
            <Link to="/admin/escolas" className="text-xs font-semibold text-primary">
              Gerenciar
            </Link>
          }
        >
          {ordenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma escola ainda.</p>
          ) : (
            <div className="-mx-5 -mb-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/60 text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-semibold">Escola</th>
                    <th className="px-3 py-2.5 font-semibold">Créditos de IA</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Extras</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Professores</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Alunos</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Planos</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Provas</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Participação</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Último acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenadas.map((e) => {
                    const pct = pctDe(e);
                    return (
                      <tr
                        key={e.id}
                        className={cn(
                          "border-b border-border last:border-0",
                          !e.ativa && "opacity-50",
                        )}
                      >
                        <td className="px-5 py-3">
                          <Link
                            to="/admin/escola/$id"
                            params={{ id: e.id }}
                            className="font-semibold hover:underline"
                          >
                            {e.nome}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            {e.plano_nome}
                            {e.ativa ? "" : " · inativa"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="tabular-nums">
                            {e.creditos_usados}
                            {e.creditos_limite ? ` de ${e.creditos_limite}` : " (sem limite)"}
                          </span>
                          {pct !== null ? (
                            <span className="mt-1 block h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
                              <span
                                className={cn(
                                  "block h-full rounded-full",
                                  pct >= 100 ? "bg-coral" : pct >= 80 ? "bg-sun" : "bg-leaf",
                                )}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {e.creditos_extra || "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{e.professores}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{e.alunos}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{e.planejamentos_mes}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{e.provas_mes}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {e.participacao_mes === null ? "—" : `${e.participacao_mes}%`}
                        </td>
                        <td className="px-5 py-3 text-right text-xs">
                          {e.ultimo_acesso ? dataCurta(e.ultimo_acesso) : "ninguém entrou"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SecaoRecolhivel>
      </div>
    </div>
  );
}
