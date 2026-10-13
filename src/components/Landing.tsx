import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  Lock,
  MessageCircle,
  School,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { LumeLogo } from "@/components/AppShell";
import { ChatLumis } from "@/components/ChatLumis";
import iconeLumis from "@/assets/lumis-icone.webp";
import telaPlano from "@/assets/landing-plano.webp";
import vitrine from "@/assets/landing-vitrine.webp";
import { cn } from "@/lib/utils";

const MENU = [
  { href: "#plataforma", rotulo: "Plataforma" },
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#lumis", rotulo: "Lumis" },
  { href: "#para-escolas", rotulo: "Para escolas" },
];

const RECURSOS: { icon: LucideIcon; tom: string; titulo: string; texto: string }[] = [
  {
    icon: Sparkles,
    tom: "bg-sky-soft text-[#2f6fd6]",
    titulo: "Planejamento com IA",
    texto:
      "O professor cola o plano ou envia um PDF ou foto, e a Lumis devolve a aula completa, adaptada para cada aluno da turma.",
  },
  {
    icon: UsersRound,
    tom: "bg-leaf-soft text-[#2f8f4e]",
    titulo: "Perfis dos alunos",
    texto:
      "Necessidades, o que funciona e o que evitar, registrados em poucos cliques. Não é preciso ter laudo para incluir.",
  },
  {
    icon: GraduationCap,
    tom: "bg-tangerine-soft text-[#d9822b]",
    titulo: "Capacitação em trilhas",
    texto:
      "Lições curtas sobre TEA, TDAH, comunicação e trabalho em grupo, no estilo de aplicativo, para aprender no tempo do professor.",
  },
  {
    icon: BookOpen,
    tom: "bg-lilac-soft text-[#7c4fd6]",
    titulo: "Biblioteca de estratégias",
    texto:
      "Práticas com passo a passo, exemplo e base no DUA, que vão direto para o perfil do aluno ou para o próximo plano.",
  },
  {
    icon: BarChart3,
    tom: "bg-sun-soft text-[#b8860b]",
    titulo: "Painel da gestão",
    texto:
      "Coordenação e direção acompanham turmas, professores, participação e uso da IA, sem expor dados sensíveis dos alunos.",
  },
  {
    icon: MessageCircle,
    tom: "bg-coral-soft text-[#d9534f]",
    titulo: "Lumis para tirar dúvidas",
    texto:
      "Uma assistente sempre à mão para perguntas sobre inclusão e sobre o uso da plataforma, no meio da rotina.",
  },
];

const PASSOS: { icon: LucideIcon; titulo: string; texto: string }[] = [
  {
    icon: School,
    titulo: "A escola convida os professores",
    texto:
      "A gestão cria as turmas e envia os convites por e-mail. Cada professor cria a própria senha.",
  },
  {
    icon: UserPlus,
    titulo: "O professor conhece a turma",
    texto:
      "Cadastra os alunos com o que observa em sala: o que ajuda, o que atrapalha, do que gostam.",
  },
  {
    icon: FileText,
    titulo: "A Lumis adapta cada aula",
    texto:
      "Com o plano ou a atividade em mãos, a Lumis entrega tudo pronto: etapas, atividade e versão para cada aluno.",
  },
];

const botaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#1f6fe0] px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(31,111,224,0.7)] transition-opacity hover:opacity-90";
const botaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-base font-semibold transition-colors hover:bg-secondary";

function Titulo({ selo, titulo, texto }: { selo: string; titulo: string; texto: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <span className="rounded-full bg-sky-soft px-3.5 py-1.5 text-xs font-semibold text-[#2f6fd6] dark:text-[#8db5f5]">
        {selo}
      </span>
      <h2 className="mt-4 font-display text-3xl leading-tight font-bold sm:text-4xl">{titulo}</h2>
      <p className="mt-3 text-base text-muted-foreground">{texto}</p>
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#inicio" aria-label="Lume — início">
            <LumeLogo className="h-9 w-auto" />
          </a>
          <nav
            aria-label="Seções"
            className="hidden items-center gap-8 text-sm text-muted-foreground lg:flex"
          >
            {MENU.map((m) => (
              <a key={m.href} href={m.href} className="hover:text-foreground">
                {m.rotulo}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/entrar"
              className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Entrar
            </Link>
            <Link
              to="/demonstracao"
              className="hidden rounded-xl bg-[#1b2744] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:inline-flex dark:bg-white dark:text-[#1b2744]"
            >
              Agendar demonstração
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-[-10%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(253,230,170,0.55),transparent_65%)] dark:opacity-25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-12rem] left-[-12%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(186,220,250,0.6),transparent_65%)] dark:opacity-25"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-20 lg:pb-28">
            <div>
              <span className="inline-flex rounded-full bg-sky-soft px-3.5 py-1.5 text-sm font-semibold text-[#2f6fd6] dark:text-[#8db5f5]">
                IA para educação inclusiva
              </span>
              <h1 className="mt-6 font-display text-[2.6rem] leading-[1.05] font-bold sm:text-6xl">
                Inclusão não deveria depender da{" "}
                <span className="text-[#4aa3f0] dark:text-[#86c3ff]">
                  experiência do professor.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                A Lume utiliza inteligência artificial para transformar planejamentos de aula em
                experiências mais inclusivas para estudantes neurodivergentes.
              </p>
              <p className="mt-3 max-w-xl text-base text-muted-foreground">
                Capacite professores, acompanhe alunos e promova uma educação mais acolhedora em
                toda a escola.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/demonstracao" className={botaoPrimario}>
                  Agendar demonstração <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#plataforma" className={botaoSecundario}>
                  Conhecer a plataforma
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {[
                  "IA educacional",
                  "Baseada em evidências",
                  "Desenvolvida para escolas",
                  "Inclusão prática",
                ].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#2f8f4e]" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <Vitrine />
          </div>
        </section>

        <section id="plataforma" className="scroll-mt-20 border-t border-border/60 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Titulo
              selo="Plataforma"
              titulo="Tudo o que a escola precisa para incluir de verdade"
              texto="Do planejamento da aula ao acompanhamento da gestão, em um só lugar."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map((r) => (
                <article key={r.titulo} className="card-soft p-6">
                  <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", r.tom)}>
                    <r.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{r.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{r.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-20 bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Titulo
              selo="Como funciona"
              titulo="Em três passos, a turma inteira participa"
              texto="Sem instalar nada e sem formação técnica: funciona no navegador do computador ou do celular."
            />
            <ol className="grid gap-4 md:grid-cols-3">
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="card-soft relative p-6">
                  <span className="absolute top-5 right-5 font-display text-4xl font-bold text-border">
                    {i + 1}
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1f6fe0] text-white">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{p.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="lumis" className="scroll-mt-20 py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-3">
                <img src={iconeLumis} alt="" className="h-14 w-14" />
                <span className="rounded-full bg-sun-soft px-3.5 py-1.5 text-xs font-semibold">
                  Conheça a Lumis
                </span>
              </div>
              <h2 className="mt-5 font-display text-3xl leading-tight font-bold sm:text-4xl">
                A assistente que transforma o plano de aula em uma aula para todos
              </h2>
              <ul className="mt-6 space-y-4">
                {[
                  [
                    "Lê o que o professor já tem",
                    "Texto, PDF de uma prova ou foto do caderno: a Lumis entende e adapta.",
                  ],
                  [
                    "Entrega pronto para usar",
                    "Etapas com tempo, atividade com o conteúdo real e a versão com mais apoio já reescrita.",
                  ],
                  [
                    "Pensa em cada aluno",
                    "Uma adaptação para cada estudante, usando os interesses dele, sem separar ninguém da turma.",
                  ],
                  [
                    "Cuida dos dados",
                    "O nome dos alunos nunca é enviado para a IA: só o perfil, de forma anônima.",
                  ],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-leaf-soft">
                      <Check className="h-3.5 w-3.5 text-[#2f8f4e]" />
                    </span>
                    <span>
                      <span className="block font-semibold">{t}</span>
                      <span className="text-sm text-muted-foreground">{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <figure className="relative">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_70px_-30px_rgba(27,39,68,0.45)]">
                <img
                  src={telaPlano}
                  alt="Plano de aula adaptado pela Lumis, com etapas, atividade e adaptações por aluno"
                  className="w-full"
                  loading="lazy"
                />
              </div>
              <figcaption className="card-soft absolute -bottom-5 left-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-[#2f6fd6]" /> Plano pronto em cerca de 1 minuto
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="para-escolas" className="scroll-mt-20 bg-secondary/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Titulo
              selo="Para escolas"
              titulo="A gestão acompanha, os dados ficam protegidos"
              texto="Feita para a rotina de escolas públicas e particulares, de acordo com a LGPD."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card-soft p-6">
                <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                  <BarChart3 className="h-5 w-5 text-[#2f6fd6]" /> Para a coordenação e a direção
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {[
                    "Convite e gestão de professores e turmas",
                    "Pontos de atenção: quem precisa de apoio e o que está pendente",
                    "Evolução da participação dos alunos mês a mês",
                    "Uso da IA e créditos do plano sob controle",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2f8f4e]" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-soft p-6">
                <h3 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                  <ShieldCheck className="h-5 w-5 text-[#2f8f4e]" /> Privacidade em primeiro lugar
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {[
                    "O perfil de cada aluno só é visto pelos professores da turma",
                    "A gestão vê números, não diagnósticos nem anotações",
                    "Os nomes dos alunos nunca vão para a inteligência artificial",
                    "Acesso só por convite da escola, com regras de segurança no banco de dados",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#2f8f4e]" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Estratégias baseadas no Desenho Universal para a Aprendizagem (DUA), na BNCC e na Lei
              Brasileira de Inclusão (Lei 13.146/2015).
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="card-soft px-6 py-12 text-center sm:px-12">
              <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">
                Leve a Lume para a sua escola
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Agende uma demonstração sem compromisso. Mostramos a plataforma funcionando com a
                realidade da sua escola.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/demonstracao" className={botaoPrimario}>
                  Agendar demonstração <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/entrar" className={botaoSecundario}>
                  Já tenho acesso
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <LumeLogo className="h-8 w-auto" />
          <nav aria-label="Rodapé" className="flex flex-wrap justify-center gap-5">
            <Link to="/demonstracao" className="hover:text-foreground">
              Agendar demonstração
            </Link>
            <Link to="/entrar" className="hover:text-foreground">
              Entrar
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} Lume. Educação inclusiva.</p>
        </div>
      </footer>

      <ChatLumis modo="visitante" />
    </div>
  );
}

function Vitrine() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <img
        src={vitrine}
        alt="A Lume aberta no notebook, na tela de planejamento de aula, e no celular, na capacitação do professor"
        width={1509}
        height={955}
        className="w-full drop-shadow-[0_40px_50px_rgba(27,39,68,0.25)] lg:w-[124%] lg:max-w-none lg:-translate-x-[4%]"
      />

      <div
        aria-hidden="true"
        className="card-soft absolute -top-8 left-0 hidden items-center gap-2.5 px-4 py-2.5 sm:inline-flex"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-soft">
          <Sparkles className="h-4 w-4 text-[#2f6fd6]" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-xs font-bold">Plano adaptado</span>
          <span className="text-[11px] text-muted-foreground">6 estratégias sugeridas</span>
        </span>
      </div>

      <div
        aria-hidden="true"
        className="card-soft absolute right-0 -bottom-8 hidden items-center gap-2.5 px-4 py-2.5 sm:inline-flex"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-tangerine-soft">
          <GraduationCap className="h-4 w-4 text-[#d9822b]" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-xs font-bold">Trilha TDAH</span>
          <span className="text-[11px] text-muted-foreground">+40 XP · 3 de 5 lições</span>
        </span>
      </div>
    </div>
  );
}
