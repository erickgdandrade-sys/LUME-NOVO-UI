import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { ParticipacaoChart } from "@/components/ParticipacaoChart";
import { Progress } from "@/components/ui/progress";
import { MESES, useAlunos } from "@/lib/alunos-store";
import { trilhas } from "@/lib/capacitacao-trilhas";
import { resumoCapacitacao, useCapacitacao } from "@/lib/capacitacao-store";
import { suporteTom } from "@/lib/lume-data";
import { planosStore } from "@/lib/planos-store";
import { provasStore } from "@/lib/provas-store";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | Lume" },
      {
        name: "description",
        content:
          "Acompanhe a participação da turma, a evolução de cada aluno e o seu progresso na capacitação.",
      },
      { property: "og:title", content: "Relatórios | Lume" },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const alunos = useAlunos();
  const { concluidas } = useCapacitacao();
  const planos = planosStore.use();
  const provas = provasStore.use();
  const versoes = provas.flatMap((p) => p.prova.versoes ?? []);
  const provasDoAluno = (id: string) => versoes.filter((v) => v.alunoId === id).length;
  const comRegistro = new Set(alunos.flatMap((a) => a.evolucao.map((e) => e.mes)));
  const meses = MESES.filter((m) => comRegistro.has(m));
  const mediaPorMes = meses.map((mes) => {
    const valores = alunos.flatMap((a) =>
      a.evolucao.filter((e) => e.mes === mes).map((e) => e.participacao),
    );
    return {
      rotulo: mes,
      valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
    };
  });
  const atual = mediaPorMes[mediaPorMes.length - 1]?.valor ?? 0;
  const inicial = mediaPorMes[0]?.valor ?? 0;

  const { feitas, total: totalAulas } = resumoCapacitacao(concluidas);

  const kpis = [
    {
      icon: Users,
      tone: "bg-sky-soft",
      valor: String(alunos.length),
      rotulo: "Alunos acompanhados",
    },
    {
      icon: TrendingUp,
      tone: "bg-leaf-soft",
      valor: `${atual}%`,
      rotulo:
        meses.length > 1
          ? `Participação média (${atual - inicial >= 0 ? "+" : ""}${atual - inicial} pts desde ${meses[0]})`
          : "Participação média",
    },
    {
      icon: FileText,
      tone: "bg-sun-soft",
      valor: String(planos.length),
      rotulo: planos.length === 1 ? "Aula adaptada com IA" : "Aulas adaptadas com IA",
    },
    {
      icon: ClipboardCheck,
      tone: "bg-lilac-soft",
      valor: String(provas.length),
      rotulo:
        versoes.length > 0
          ? `${provas.length === 1 ? "Prova criada" : "Provas criadas"} · ${versoes.length} ${versoes.length === 1 ? "versão adaptada" : "versões adaptadas"}`
          : provas.length === 1
            ? "Prova criada"
            : "Provas criadas",
    },
    {
      icon: GraduationCap,
      tone: "bg-tangerine-soft",
      valor: `${feitas}/${totalAulas}`,
      rotulo: "Aulas de capacitação (demonstração)",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Como sua turma está evoluindo com as estratégias inclusivas."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.rotulo} className="card-soft p-5">
            <span className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${k.tone}`}>
              <k.icon className="h-4 w-4" />
            </span>
            <p className="font-display text-2xl font-semibold">{k.valor}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.rotulo}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card-soft p-5">
          <h2 className="font-display text-base font-semibold">Participação média da turma</h2>
          <p className="mb-6 mt-0.5 text-xs text-muted-foreground">
            % de atividades com participação ativa, média dos alunos acompanhados
          </p>
          {mediaPorMes.length > 0 ? (
            <ParticipacaoChart titulo="Participação média da turma" dados={mediaPorMes} />
          ) : (
            <p className="rounded-2xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              Ainda não há registros de participação. Registre no perfil de cada aluno.
            </p>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="font-display text-base font-semibold">Minha capacitação</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">Lições concluídas por trilha</p>
          <div className="space-y-4">
            {trilhas.map((t) => {
              const feitasNaTrilha = t.licoes.filter((l) => concluidas[l.id]).length;
              return (
                <div key={t.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{t.titulo}</span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {feitasNaTrilha}/{t.licoes.length}
                    </span>
                  </div>
                  <Progress value={(feitasNaTrilha / t.licoes.length) * 100} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card-soft mb-6 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold">Provas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              As mais recentes, com as versões adaptadas para os alunos
            </p>
          </div>
          <Link to="/provas" className="shrink-0 text-xs font-semibold text-primary">
            {provas.length ? "Ver todas" : "Criar prova"}
          </Link>
        </div>
        {provas.length === 0 ? (
          <p className="rounded-2xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma prova ainda. Crie uma na aba Provas e ela aparece aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {provas.slice(0, 6).map((p) => {
              const n = p.prova.questoes.length;
              const v = p.prova.versoes?.length ?? 0;
              const detalhe = [
                `${n} ${n === 1 ? "questão" : "questões"}`,
                p.prova.cabecalho.disciplina,
                p.prova.cabecalho.turma || p.prova.cabecalho.serie,
                new Date(p.criadoEm).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                }),
              ].filter(Boolean);
              return (
                <li key={p.id}>
                  <Link
                    to="/provas/$id"
                    params={{ id: p.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-secondary/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {p.prova.titulo || "Prova sem título"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {detalhe.join(" · ")}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${v ? "bg-leaf-soft" : "bg-secondary text-muted-foreground"}`}
                    >
                      {v
                        ? `${v} ${v === 1 ? "versão adaptada" : "versões adaptadas"}`
                        : "Sem versões"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card-soft overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <h2 className="font-display text-base font-semibold">Evolução por aluno</h2>
          <Link
            to="/biblioteca"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <BookOpen className="h-3.5 w-3.5" /> Ver estratégias
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/60 text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Aluno</th>
                <th className="px-5 py-2.5 font-semibold">Suporte</th>
                {meses.map((m) => (
                  <th key={m} className="px-3 py-2.5 text-right font-semibold">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-semibold">Variação</th>
                <th className="px-5 py-2.5 text-right font-semibold">Provas adaptadas</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const ini = a.evolucao[0]?.participacao;
                const fim = a.evolucao[a.evolucao.length - 1]?.participacao;
                const variacao =
                  ini !== undefined && fim !== undefined && a.evolucao.length > 1
                    ? `${fim - ini >= 0 ? "+" : ""}${fim - ini} pts`
                    : "—";
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link
                        to="/alunos/$id"
                        params={{ id: a.id }}
                        className="font-semibold hover:text-primary"
                      >
                        {a.nome}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{a.serie}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full ${suporteTom[a.suporte]} px-2.5 py-1 text-xs font-semibold`}
                      >
                        {a.suporte}
                      </span>
                    </td>
                    {meses.map((m) => {
                      const reg = a.evolucao.find((e) => e.mes === m);
                      return (
                        <td key={m} className="px-3 py-3 text-right tabular-nums">
                          {reg ? `${reg.participacao}%` : "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{variacao}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {provasDoAluno(a.id) || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
