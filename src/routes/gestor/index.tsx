import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpenCheck,
  HeartHandshake,
  Loader2,
  School,
  Sparkles,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { useEscolaDoGestor } from "@/lib/acesso";
import { PainelDetalhado } from "@/components/PainelDetalhado";
import { MensalidadeDaEscola } from "@/components/MensalidadeDaEscola";
import { PlanoDaEscola } from "@/components/PlanoDaEscola";
import { SecaoRecolhivel } from "@/components/SecaoRecolhivel";
import { supabase } from "@/lib/supabase";
import { exigir, useDados } from "@/lib/usar-dados";

export const Route = createFileRoute("/gestor/")({
  head: () => ({ meta: [{ title: "Gestão da escola | Lume" }] }),
  component: PainelGestor,
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

function PainelGestor() {
  const escola = useEscolaDoGestor();
  const { dados, erro, carregando } = useDados(async () => {
    if (!escola) return null;
    const sb = supabase();
    const [resumo, turmas] = await Promise.all([
      sb.rpc("resumo_escola", { p_escola: escola.id }),
      sb.rpc("resumo_turmas", { p_escola: escola.id }),
    ]);
    return { resumo: exigir(resumo) as Resumo, turmas: exigir(turmas) as ResumoTurma[] };
  }, [escola?.id]);

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
      <PageHeader
        title={escola?.nome ?? "Gestão da escola"}
        subtitle="Visão geral da escola: professores, turmas e uso da Lume."
        action={
          <Link
            to="/gestor/professores"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" /> Convidar professor
          </Link>
        }
      />

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

      {escola ? (
        <PainelDetalhado
          escola={escola.id}
          entre={
            <>
              <PlanoDaEscola escola={escola.id} />
              <MensalidadeDaEscola escola={escola.id} />
            </>
          }
        />
      ) : null}

      <SecaoRecolhivel
        chave="gestor-turmas"
        titulo="Turmas"
        resumo={`${dados?.turmas.length ?? 0} ${dados?.turmas.length === 1 ? "turma" : "turmas"}`}
        className="overflow-hidden"
        acao={
          <Link to="/gestor/turmas" className="text-xs font-semibold text-primary">
            Gerenciar
          </Link>
        }
      >
        {dados && dados.turmas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma turma ainda.{" "}
            <Link to="/gestor/turmas" className="font-semibold text-primary">
              Criar a primeira turma
            </Link>
          </p>
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

      <p className="mt-6 text-xs text-muted-foreground">
        Por proteção de dados (LGPD), o perfil de inclusão de cada aluno fica só com os professores
        da turma. Aqui aparecem apenas os números.
      </p>
    </div>
  );
}
