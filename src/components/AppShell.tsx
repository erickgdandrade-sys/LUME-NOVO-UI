import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  ShieldCheck,
  Home,
  GraduationCap,
  Headset,
  Sparkles,
  Trophy,
  Users,
  UsersRound,
  UserCog,
  Wallet,
  BookOpen,
  BarChart3,
  Flame,
  Menu,
  School,
  Building2,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Fragment, type ReactNode } from "react";
import iconeLumis from "@/assets/lumis-icone.webp";
import { inicioDa, useAcesso, type Visao } from "@/lib/acesso";
import { abrirLumis } from "@/lib/lumis-chat";
import { useSincronizarNuvem } from "@/lib/nuvem";
import { ChatLumis } from "@/components/ChatLumis";
import { SeloDaLiga } from "@/components/Liga";
import logo from "@/assets/lume-logo.png";
import logoBranca from "@/assets/lume-logo-branca.png";
import { MenuPerfil } from "@/components/MenuPerfil";
import { Notificacoes } from "@/components/Notificacoes";
import { TemaSeletor } from "@/components/TemaSeletor";
import { ligaDoXp } from "@/lib/ligas";
import { usePerfil } from "@/lib/perfil-store";
import { sequenciaDias, useProgresso } from "@/lib/progresso-store";
import { cn, iniciais } from "@/lib/utils";

type ItemMenu = {
  to: string;
  label: string;
  icon: LucideIcon;
  grupo?: string;
  /** Atalho fixo na barra inferior do celular; o resto vai para "Mais". */
  celular?: boolean;
  /** Rótulo menor para a barra do celular. */
  curto?: string;
};

const menuProfessor: ItemMenu[] = [
  { to: "/", label: "Início", icon: Home, celular: true },
  {
    to: "/planejamento",
    label: "Planejamento",
    curto: "Planejar",
    icon: Sparkles,
    grupo: "Ensinar",
    celular: true,
  },
  { to: "/provas", label: "Provas", icon: ClipboardCheck, grupo: "Ensinar" },
  { to: "/alunos", label: "Alunos", icon: Users, grupo: "Acompanhar", celular: true },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, grupo: "Acompanhar" },
  {
    to: "/capacitacao",
    label: "Capacitação",
    curto: "Aprender",
    icon: GraduationCap,
    grupo: "Aprender",
    celular: true,
  },
  { to: "/biblioteca", label: "Biblioteca", icon: BookOpen, grupo: "Aprender" },
  { to: "/ranking", label: "Ranking", icon: Trophy, grupo: "Aprender" },
];

const menuGestor: ItemMenu[] = [
  { to: "/gestor", label: "Início", icon: Home },
  { to: "/gestor/professores", label: "Professores", icon: Users, grupo: "Escola" },
  { to: "/gestor/alunos", label: "Alunos", icon: UsersRound, grupo: "Escola" },
  { to: "/gestor/turmas", label: "Turmas", icon: School, grupo: "Escola" },
  {
    to: "/gestor/escola",
    label: "Dados da escola",
    curto: "Escola",
    icon: Building2,
    grupo: "Escola",
  },
];

const menuAdmin: ItemMenu[] = [
  { to: "/admin", label: "Painel", icon: Home, celular: true },
  { to: "/admin/escolas", label: "Escolas", icon: Building2, grupo: "Clientes", celular: true },
  { to: "/admin/contas", label: "Contas", icon: UserCog, grupo: "Clientes" },
  {
    to: "/admin/atendimento",
    label: "Atendimento",
    icon: Headset,
    grupo: "Operação",
    celular: true,
  },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet, grupo: "Operação", celular: true },
  { to: "/admin/demonstracoes", label: "Demonstrações", icon: CalendarCheck, grupo: "Operação" },
  { to: "/admin/equipe", label: "Equipe Lume", icon: ShieldCheck, grupo: "Lume" },
];

function menuDa(visao: Visao | null): ItemMenu[] {
  if (!visao) return [];
  if (visao.tipo === "admin") return menuAdmin;
  if (visao.tipo === "gestor") return menuGestor;
  if (visao.tipo === "sem-acesso") return [];
  return menuProfessor;
}

/** Nome das telas internas, para o caminho no topo (ex.: Alunos › Perfil do aluno). */
const SUBPAGINAS: [RegExp, string, string?][] = [
  [/^\/alunos\/[^/]+$/, "Perfil do aluno"],
  [/^\/capacitacao\/[^/]+$/, "Lição"],
  [/^\/biblioteca\/[^/]+$/, "Estratégia"],
  [/^\/provas\/[^/]+$/, "Prova"],
  [/^\/planejamento\/resultado$/, "Plano adaptado"],
  [/^\/admin\/escola\/[^/]+$/, "Escola", "/admin/escolas"],
];

const PAGINAS_SOLTAS: Record<string, string> = {
  "/perfil": "Meu perfil",
  "/dados": "Meus dados e privacidade",
  "/sobre": "Sobre a Lume",
};

const INICIOS = new Set(["/", "/gestor", "/admin"]);

function limpar(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function isActive(pathname: string, to: string) {
  const p = limpar(pathname);
  return INICIOS.has(to) ? p === to : p === to || p.startsWith(`${to}/`);
}

export function LumeLogo({ className }: { className?: string }) {
  return (
    <>
      <img src={logo} alt="Lume" className={cn("h-10 w-auto dark:hidden", className)} />
      <img src={logoBranca} alt="Lume" className={cn("hidden h-10 w-auto dark:block", className)} />
    </>
  );
}

const focoDoMenu =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset";

function Caminho({ pathname, nav }: { pathname: string; nav: ItemMenu[] }) {
  const p = limpar(pathname);
  const [, sub, pai] = SUBPAGINAS.find(([r]) => r.test(p)) ?? [];
  const secao = nav.find((item) => (pai ? item.to === pai : isActive(pathname, item.to)));
  const solta = PAGINAS_SOLTAS[p];
  const partes = solta
    ? [{ rotulo: solta }]
    : [
        ...(secao ? [{ rotulo: secao.label, to: sub ? secao.to : undefined }] : []),
        ...(sub ? [{ rotulo: sub }] : []),
      ];
  if (!partes.length) return null;
  return (
    <nav aria-label="Você está em" className="hidden min-w-0 lg:block">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {partes.map((parte, i) => (
          <Fragment key={parte.rotulo}>
            {i > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
            <li className="min-w-0 truncate">
              {"to" in parte && parte.to ? (
                <Link
                  to={parte.to as "/"}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {parte.rotulo}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-foreground">
                  {parte.rotulo}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

function RodapeDoMenu({ visao }: { visao: Visao | null }) {
  const perfil = usePerfil();
  const progresso = useProgresso();
  const dias = sequenciaDias(progresso.dias);
  const ehProfessor = visao?.tipo === "professor" || visao?.tipo === "demo";
  const contexto =
    visao?.tipo === "admin"
      ? "Admin Lume"
      : visao?.tipo === "gestor"
        ? `Gestão · ${visao.escolaNome}`
        : visao?.tipo === "professor"
          ? visao.escolaNome
          : visao?.tipo === "demo"
            ? "Demonstração"
            : "";

  return (
    <div className="mt-4 border-t border-border pt-3">
      {ehProfessor ? (
        <Link
          to="/ranking"
          className={cn(
            "mb-2 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary",
            focoDoMenu,
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-tangerine" />
            {dias === 1 ? "1 dia seguido" : `${dias} dias seguidos`}
          </span>
          <SeloDaLiga liga={ligaDoXp(progresso.xp)} />
        </Link>
      ) : null}
      <Link
        to="/perfil"
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-secondary",
          focoDoMenu,
        )}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-primary">
          {perfil.foto ? (
            <img src={perfil.foto} alt="" className="h-full w-full object-cover" />
          ) : (
            iniciais(perfil.nome) || "?"
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{perfil.nome}</span>
          {contexto ? (
            <span className="block truncate text-xs text-muted-foreground">{contexto}</span>
          ) : null}
        </span>
      </Link>
    </div>
  );
}

function BotaoMais({ itens, pathname }: { itens: ItemMenu[]; pathname: string }) {
  const ativo = itens.some((item) => isActive(pathname, item.to));
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-0 cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px]",
            focoDoMenu,
            ativo ? "font-semibold text-primary" : "font-medium text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "grid h-7 w-12 max-w-full place-items-center rounded-full transition-colors",
              ativo && "bg-accent",
            )}
          >
            <Menu className="h-[18px] w-[18px] shrink-0" />
          </span>
          <span className="w-full truncate text-center">Mais</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-56 rounded-xl p-1.5">
        {itens.map((item) => (
          <DropdownMenuItem key={item.to} asChild className="cursor-pointer rounded-lg py-2">
            <Link
              to={item.to as "/"}
              aria-current={isActive(pathname, item.to) ? "page" : undefined}
              className={cn(isActive(pathname, item.to) && "font-semibold text-primary")}
            >
              <item.icon /> {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { visao } = useAcesso();
  useSincronizarNuvem(visao?.tipo === "professor" ? visao.escola : null);
  const emLicao = /^\/capacitacao\/[^/]+$/.test(limpar(pathname));
  const nav = menuDa(visao);
  const cabeTudo = nav.length <= 5;
  const navCelular = cabeTudo ? nav : nav.filter((item) => item.celular);
  const navMais = cabeTudo ? [] : nav.filter((item) => !item.celular);
  const ehProfessor = visao?.tipo === "professor" || visao?.tipo === "demo";
  const inicio = inicioDa(visao) as "/";

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-3 py-5 lg:flex print:hidden">
        <Link to={inicio} className="mb-5 block px-3" aria-label="Lume — início">
          <LumeLogo className="h-8" />
        </Link>
        <nav className="flex flex-1 flex-col overflow-y-auto" aria-label="Principal">
          {nav.map((item, i) => {
            const active = isActive(pathname, item.to);
            const novoGrupo = item.grupo && item.grupo !== nav[i - 1]?.grupo;
            return (
              <Fragment key={item.to}>
                {novoGrupo ? (
                  <p className="px-3 pt-4 pb-1 text-[11px] font-medium text-muted-foreground">
                    {item.grupo}
                  </p>
                ) : null}
                <Link
                  to={item.to as "/"}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "my-px flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    focoDoMenu,
                    active
                      ? "bg-accent font-semibold text-primary"
                      : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </Fragment>
            );
          })}
        </nav>
        <RodapeDoMenu visao={visao} />
      </aside>

      <div className="lg:pl-60 print:pl-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6 print:hidden">
          <Link to={inicio} className="lg:hidden" aria-label="Lume — início">
            <LumeLogo className="h-7" />
          </Link>
          <Caminho pathname={pathname} nav={nav} />
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {emLicao ? null : (
              <button
                type="button"
                onClick={() => abrirLumis()}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
              >
                <img src={iconeLumis} alt="" className="h-5 w-5 object-contain" />
                <span className="hidden sm:inline">Perguntar à Lumis</span>
                <span className="sr-only sm:hidden">Perguntar à Lumis</span>
              </button>
            )}
            <TemaSeletor />
            {ehProfessor ? <Notificacoes /> : null}
            <span className="ml-1.5">
              <MenuPerfil />
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12 print:p-0">
          {children}
        </main>
        {emLicao ? null : <ChatLumis />}
      </div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden print:hidden"
        style={{
          gridTemplateColumns: `repeat(${Math.max(navCelular.length + (navMais.length ? 1 : 0), 1)}, minmax(0, 1fr))`,
        }}
      >
        {navCelular.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to as "/"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px]",
                focoDoMenu,
                active ? "font-semibold text-primary" : "font-medium text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-12 max-w-full place-items-center rounded-full transition-colors",
                  active && "bg-accent",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
              </span>
              <span className="w-full truncate text-center">{item.curto ?? item.label}</span>
            </Link>
          );
        })}
        {navMais.length ? <BotaoMais itens={navMais} pathname={pathname} /> : null}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
