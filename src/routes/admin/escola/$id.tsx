import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenCheck,
  HeartHandshake,
  Loader2,
  School,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PainelDetalhado } from "@/components/PainelDetalhado";
import { PlanoDaEscola } from "@/components/PlanoDaEscola";
import { SecaoRecolhivel } from "@/components/SecaoRecolhivel";
import { supabase } from "@/lib/supabase";
import { exigir, useDados } from "@/lib/usar-dados";

export const Route = createFileRoute("/admin/escola/$id")({
  head: () => ({ meta: [{ title: "Painel da escola | Admin Lume" }] }),
  component: PainelDaEscola,
});

type Resumo = {
  professores: number;
  turmas: number;
  alunos: number;
  alunos_com_necessidades: number;
  planejamentos_mes: number;
  usos_ia_mes: number;
};
type ResumoTurma = {
  turma: string;
  nome: string;
  serie: string | null;
  alunos: number;
  alunos_com_necessidades: number;
  professores: number;
  planejamentos: number;
};

function PainelDaEscola() {
  const { id } = Route.useParams();
  const { dados, erro, carregando } = useDados(async () => {
    const sb = supabase();
    const [escola, resumo, turmas] = await Promise.all([
      sb.from("escolas").select("nome, cidade, ativa").eq("id", id).maybeSingle(),
      sb.rpc("resumo_escola", { p_escola: id }),
      sb.rpc("resumo_turmas", { p_escola: id }),
    ]);
    return {
      escola: exigir(escola) as { nome: string; cidade: string | null; ativa: boolean } | null,
      resumo: exigir(resumo) as Resumo,
      turmas: exigir(turmas) as ResumoTurma[],
    };
  }, [id]);

  const cartoes: { rotulo: string; valor: number | undefined; icon: LucideIcon; tom: string }[] = [
    { rotulo: "Professores", valor: dados?.resumo.professores, icon: Users, tom: "bg-sky-soft" },
    { rotulo: "Turmas", valor: dados?.resumo.turmas, icon: School, tom: "bg-leaf-soft" },
    { rotulo: "Alunos", valor: dados?.resumo.alunos, icon: UsersRound, tom: "bg-lilac-soft" },
    {
      rotulo: "Com necessidades específicas",
      valor: dados?.resumo.alunos_com_necessidades,
      icon: HeartHandshake,
      tom: "bg-coral-soft",
    },
    {
      rotulo: "Planejamentos no mês",
      valor: dados?.resumo.planejamentos_mes,
      icon: BookOpenCheck,
      tom: "bg-sun-soft",
    },
    {
      rotulo: "Usos da Lumis no mês",
      valor: dados?.resumo.usos_ia_mes,
      icon: Sparkles,
      tom: "bg-tangerine-soft",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/admin"
          aria-label="Voltar ao painel"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-semibold sm:text-3xl">
            {dados?.escola?.nome ?? "Escola"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[dados?.escola?.cidade, dados?.escola && !dados.escola.ativa ? "inativa" : ""]
              .filter(Boolean)
              .join(" · ") || "Painel da escola"}
          </p>
        </div>
      </div>

      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="card-soft p-4">
            <span className={`mb-2 grid h-8 w-8 place-items-center rounded-xl ${c.tom}`}>
              <c.icon className="h-4 w-4" />
            </span>
            <p className="font-display text-2xl font-semibold">
              {carregando && c.valor === undefined ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                (c.valor ?? 0).toLocaleString("pt-BR")
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{c.rotulo}</p>
          </div>
        ))}
      </div>

      <PainelDetalhado escola={id} comoAdmin entre={<PlanoDaEscola escola={id} comoAdmin />} />

      <SecaoRecolhivel
        chave="admin-escola-turmas"
        titulo="Turmas"
        resumo={`${dados?.turmas.length ?? 0} ${dados?.turmas.length === 1 ? "turma" : "turmas"}`}
        className="overflow-hidden"
      >
        {dados && dados.turmas.length === 0 ? (
          <p className="text-sm text-muted-foreground">A escola ainda não criou turmas.</p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/60 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Turma</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Alunos</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Com necessidades</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Professores</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Planejamentos</th>
                </tr>
              </thead>
              <tbody>
                {dados?.turmas.map((t) => (
                  <tr key={t.turma} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-semibold">{t.nome}</span>
                      {t.serie ? (
                        <span className="block text-xs text-muted-foreground">{t.serie}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{t.alunos}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {t.alunos_com_necessidades}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{t.professores}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{t.planejamentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SecaoRecolhivel>
    </div>
  );
}
