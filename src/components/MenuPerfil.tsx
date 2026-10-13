import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart3,
  Check,
  GraduationCap,
  Info,
  LogOut,
  Pencil,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  escolherVisao,
  inicioDa,
  nomeDaVisao,
  useAcesso,
  visoesPossiveis,
  type Visao,
} from "@/lib/acesso";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePerfil } from "@/lib/perfil-store";
import { nivel, useProgresso } from "@/lib/progresso-store";
import { sair, useSessao } from "@/lib/sessao-store";
import { sonsStore, useSonsLigados } from "@/lib/sons";
import { iniciais } from "@/lib/utils";

export function MenuPerfil() {
  const perfil = usePerfil();
  const sonsLigados = useSonsLigados();
  const progresso = useProgresso();
  const sessao = useSessao();
  const acesso = useAcesso();
  const navigate = useNavigate();
  const visao = acesso.visao;
  const ehProfessor = visao?.tipo === "professor" || visao?.tipo === "demo";
  const outrasVisoes = visoesPossiveis(acesso);

  function trocarPara(nova: Visao) {
    escolherVisao(nova);
    void navigate({ to: inicioDa(nova) as "/" });
  }

  const ehAtual = (v: Visao) =>
    visao !== null &&
    v.tipo === visao.tipo &&
    ("escola" in v ? "escola" in visao && v.escola === visao.escola : true);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Menu do perfil de ${perfil.nome}`}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-primary ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-primary/40 data-[state=open]:ring-2 data-[state=open]:ring-primary/40"
          >
            <Avatar foto={perfil.foto} nome={perfil.nome} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-primary">
              <Avatar foto={perfil.foto} nome={perfil.nome} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold">
                {perfil.nome}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {visao && !ehProfessor
                  ? nomeDaVisao(visao)
                  : `${perfil.funcao} · Nível ${nivel(progresso.xp)}`}
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link to="/perfil">
              <Pencil /> Meu perfil
            </Link>
          </DropdownMenuItem>
          {outrasVisoes.length > 1 ? (
            <>
              <DropdownMenuSeparator />
              <p className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-muted-foreground">
                <ArrowLeftRight className="h-3.5 w-3.5" /> Entrar como
              </p>
              {outrasVisoes.map((v) => (
                <DropdownMenuItem
                  key={`${v.tipo}-${"escola" in v ? v.escola : ""}`}
                  className="cursor-pointer rounded-lg"
                  onSelect={() => trocarPara(v)}
                >
                  {ehAtual(v) ? <Check /> : <span className="w-4" />}
                  <span className="truncate">{nomeDaVisao(v)}</span>
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
          {ehProfessor ? (
            <>
              <DropdownMenuItem
                className="cursor-pointer rounded-lg"
                onSelect={(e) => {
                  e.preventDefault();
                  sonsStore.set(!sonsLigados);
                }}
              >
                {sonsLigados ? <Volume2 /> : <VolumeX />}
                <span className="flex-1">Sons de comemoração</span>
                <span className="text-xs text-muted-foreground">
                  {sonsLigados ? "Ligados" : "Desligados"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link to="/alunos">
                  <Users /> Meus alunos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link to="/capacitacao">
                  <GraduationCap /> Minha capacitação
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link to="/relatorios">
                  <BarChart3 /> Relatórios
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                <Link to="/dados">
                  <ShieldCheck /> Meus dados e privacidade
                </Link>
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuSeparator />
          )}
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link to="/sobre">
              <Info /> Sobre a Lume
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {sessao ? (
            <p className="truncate px-2 py-1 text-xs text-muted-foreground">{sessao.email}</p>
          ) : null}
          <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => void sair()}>
            <LogOut /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function Avatar({ foto, nome }: { foto?: string | null | undefined; nome: string }) {
  return foto ? (
    <img src={foto} alt="" className="h-full w-full object-cover" />
  ) : (
    <>{iniciais(nome) || "?"}</>
  );
}
