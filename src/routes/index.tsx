import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap,
  Sparkles,
  Users,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Flame,
  Brain,
  UserRoundCheck,
  Route as Trilha,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Apresentacao } from "@/components/Apresentacao";
import { AvisoImportar } from "@/components/AvisoImportar";
import { IconeDaLiga } from "@/components/Liga";
import { MESES, useAlunos } from "@/lib/alunos-store";
import { ligaDoXp } from "@/lib/ligas";
import { apresentacaoStore, nomeDaSaudacao, usePerfil } from "@/lib/perfil-store";
import { nivel, sequenciaDias, useProgresso } from "@/lib/progresso-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início | Lume — educação inclusiva" },
      {
        name: "description",
        content:
          "Painel da professora: capacitação prática, planejamento de aula com IA, perfis dos alunos e biblioteca de estratégias inclusivas.",
      },
      { property: "og:title", content: "Início | Lume" },
      {
        property: "og:description",
        content: "Tudo o que você precisa para tornar sua próxima aula mais inclusiva.",
      },
    ],
  }),
  component: Dashboard,
});

const cards = [
  {
    to: "/capacitacao",
    icon: GraduationCap,
    iconTone: "bg-tangerine-soft text-tangerine",
    titulo: "Capacitação prática",
    desc: "Estratégias inclusivas em poucos minutos.",
  },
  {
    to: "/planejamento",
    icon: Sparkles,
    iconTone: "bg-sky-soft text-sky",
    titulo: "Planejamento com IA",
    desc: "Adapte qualquer plano de aula para a sua turma.",
  },
  {
    to: "/alunos",
    icon: Users,
    iconTone: "bg-leaf-soft text-leaf",
    titulo: "Perfis dos alunos",
    desc: "Necessidades e estratégias de cada estudante.",
  },
  {
    to: "/biblioteca",
    icon: BookOpen,
    iconTone: "bg-lilac-soft text-lilac",
    titulo: "Biblioteca de estratégias",
    desc: "Estratégias com a base pedagógica de cada uma.",
  },
] as const;

const destaques = [
  {
    to: "/capacitacao",
    icon: Brain,
    iconTone: "text-sky",
    t: "Neurodiversidade na prática",
    d: "Aplique estratégias no dia a dia da sala.",
  },
  {
    to: "/capacitacao",
    icon: Trilha,
    iconTone: "text-leaf",
    t: "Nova trilha: TDAH",
    d: "5 aulas curtas com exemplos reais de sala.",
  },
] as const;

function Dashboard() {
  const perfil = usePerfil();
  const progresso = useProgresso();
  const alunos = useAlunos();
  const apresentacaoVista = apresentacaoStore.use();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const mesAtual = MESES[new Date().getMonth()] ?? "Jan";
  const semRegistro = alunos.filter((a) => !a.evolucao.some((e) => e.mes === mesAtual)).length;
  const dias = sequenciaDias(progresso.dias);

  const avisoAlunos = {
    to: "/alunos",
    icon: UserRoundCheck,
    iconTone: semRegistro === 0 ? "text-leaf" : "text-coral",
    t:
      semRegistro === 0
        ? "Registros do mês em dia"
        : `${semRegistro} ${semRegistro === 1 ? "aluno" : "alunos"} sem registro em ${mesAtual}`,
    d:
      semRegistro === 0
        ? "Todos os alunos têm participação registrada neste mês."
        : "Registre a participação antes do conselho de classe.",
  } as const;
  const listaDestaques = [avisoAlunos, ...destaques];

  if (montado && !apresentacaoVista) return <Apresentacao primeiroAcesso />;

  const liga = ligaDoXp(progresso.xp);
  const numeros = [
    {
      rotulo: "Sequência",
      valor: dias === 1 ? "1 dia" : `${dias} dias`,
      icone: <Flame className="h-5 w-5 shrink-0 text-tangerine" />,
      to: "/capacitacao",
    },
    {
      rotulo: "Sua liga",
      valor: liga.nome,
      extra: `Nível ${nivel(progresso.xp)} · ${progresso.xp.toLocaleString("pt-BR")} XP`,
      icone: (
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", liga.tom)}>
          <IconeDaLiga liga={liga} className="h-4 w-4" />
        </span>
      ),
      to: "/ranking",
    },
    {
      rotulo: `Sem registro em ${mesAtual}`,
      valor: semRegistro === 1 ? "1 aluno" : `${semRegistro} alunos`,
      icone: (
        <UserRoundCheck
          className={cn("h-5 w-5 shrink-0", semRegistro === 0 ? "text-leaf" : "text-coral")}
        />
      ),
      to: "/alunos",
    },
  ] as const;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            Olá, {nomeDaSaudacao(perfil)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Vamos tornar sua próxima aula mais inclusiva.
          </p>
        </div>
        <Link
          to="/planejamento"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" /> Adaptar uma aula
        </Link>
      </div>

      <div className="mb-8 mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        {numeros.map((n) => (
          <Link
            key={n.rotulo}
            to={n.to}
            className="card-soft flex min-w-0 flex-col gap-2 p-3 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3.5"
          >
            {n.icone}
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{n.rotulo}</p>
              <p className="truncate font-display text-base font-semibold leading-tight sm:text-lg">
                {n.valor}
              </p>
              {"extra" in n ? (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{n.extra}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      <AvisoImportar />

      <h2 className="mb-3 text-lg font-semibold">Comece por aqui</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="card-soft group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 transition-colors hover:border-primary/40"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.iconTone}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{c.titulo}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{c.desc}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Para você hoje</h2>
      <div className="card-soft divide-y divide-border overflow-hidden">
        {listaDestaques.map((h) => (
          <Link
            key={h.t}
            to={h.to}
            className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-secondary/60"
          >
            <h.icon className={`h-5 w-5 ${h.iconTone}`} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{h.t}</span>
              <span className="block text-sm text-muted-foreground">{h.d}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
