import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Eye, EyeOff, Loader2, RotateCcw, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { CartaoDaLiga, SeloDaLiga } from "@/components/Liga";
import { ligaDoXp } from "@/lib/ligas";
import { useProgresso } from "@/lib/progresso-store";
import { carregarRanking, definirParticipacaoNoRanking, type Ranking } from "@/lib/ranking";
import { usePerfil } from "@/lib/perfil-store";
import { useAcesso } from "@/lib/acesso";
import { useDados } from "@/lib/usar-dados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking | Lume" }] }),
  component: PaginaRanking,
});

type Aba = "professores" | "escolas";

const corDoPodio = ["text-liga-ouro", "text-liga-prata", "text-liga-bronze"];

function Posicao({ n }: { n: number }) {
  return (
    <span
      className={cn(
        "font-display text-sm font-semibold tabular-nums",
        corDoPodio[n - 1] ?? "text-muted-foreground",
      )}
    >
      {n}
    </span>
  );
}

function PaginaRanking() {
  const progresso = useProgresso();
  const { dados, erro, carregando, recarregar } = useDados(carregarRanking, []);
  const [aba, setAba] = useState<Aba>("professores");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Ranking"
        subtitle="Cada lição da capacitação rende XP. O XP define seu nível e a sua liga."
      />

      <CartaoDaLiga xp={progresso.xp} comEscada linkRanking={false} className="mb-6" />

      {erro ? (
        <div role="alert" className="card-soft flex flex-wrap items-center gap-3 p-5 text-sm">
          <span className="flex-1">{erro}</span>
          <button
            type="button"
            onClick={() => void recarregar()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Tentar de novo
          </button>
        </div>
      ) : carregando && !dados ? (
        <p className="card-soft flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando o ranking…
        </p>
      ) : dados && !dados.disponivel ? (
        <p className="card-soft p-5 text-sm text-muted-foreground">
          O ranking entre professores e escolas aparece quando a Lume está conectada às contas das
          escolas. No modo de demonstração você acompanha só a sua liga.
        </p>
      ) : dados ? (
        <>
          <Participacao eu={dados.eu} aoMudar={() => void recarregar()} />
          <div
            role="tablist"
            aria-label="Tipo de ranking"
            className="mb-3 inline-flex rounded-lg border border-border bg-card p-0.5"
          >
            {(
              [
                { id: "professores", rotulo: "Professores", icon: Users },
                { id: "escolas", rotulo: "Escolas", icon: Building2 },
              ] as const
            ).map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  aba === a.id
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <a.icon className="h-4 w-4" /> {a.rotulo}
              </button>
            ))}
          </div>
          {aba === "professores" ? (
            <TabelaProfessores dados={dados} />
          ) : (
            <TabelaEscolas dados={dados} />
          )}
        </>
      ) : null}
    </div>
  );
}

function Participacao({ eu, aoMudar }: { eu: Ranking["eu"]; aoMudar: () => void }) {
  const perfil = usePerfil();
  const { visao } = useAcesso();
  const escola = visao?.tipo === "professor" ? visao.escolaNome : "";
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function mudar(participa: boolean) {
    setSalvando(true);
    setErro("");
    try {
      await definirParticipacaoNoRanking(participa);
      aoMudar();
    } catch (e) {
      console.error(e);
      setErro("Não foi possível salvar. Confira sua internet e tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section
      className={cn(
        "card-soft mb-6 flex flex-wrap items-center gap-4 p-5",
        !eu.participa && "border-primary/40 bg-accent/40",
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
        {eu.participa ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        {eu.participa ? (
          <>
            <p className="text-sm font-semibold">
              {eu.posicao
                ? `Você está em ${eu.posicao}º de ${eu.total} no ranking`
                : "Você participa do ranking"}
            </p>
            <p className="text-sm text-muted-foreground">
              Aparece como {perfil.nome}
              {escola ? ` · ${escola}` : ""}, com seu XP e sua liga.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Você ainda não aparece no ranking</p>
            <p className="text-sm text-muted-foreground">
              Se participar, os professores de outras escolas veem seu nome, sua escola, seu XP e
              sua liga. Você pode sair quando quiser.
            </p>
          </>
        )}
        {erro ? <p className="mt-1 text-xs text-destructive">{erro}</p> : null}
      </div>
      <button
        type="button"
        disabled={salvando}
        onClick={() => void mudar(!eu.participa)}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
          eu.participa
            ? "border border-border bg-card hover:bg-secondary"
            : "bg-primary text-primary-foreground hover:opacity-90",
        )}
      >
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {eu.participa ? "Sair do ranking" : "Participar do ranking"}
      </button>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="card-soft flex flex-col items-center px-6 py-12 text-center">
      <Trophy className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function TabelaProfessores({ dados }: { dados: Ranking }) {
  if (dados.professores.length === 0)
    return <Vazio texto="Ninguém entrou no ranking ainda. Seja a primeira pessoa a participar." />;
  return (
    <div className="card-soft overflow-hidden">
      <table className="w-full text-sm">
        <caption className="sr-only">Ranking de professores por XP</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="w-12 px-4 py-2.5 font-medium">
              #
            </th>
            <th scope="col" className="px-2 py-2.5 font-medium">
              Professor
            </th>
            <th scope="col" className="hidden px-2 py-2.5 font-medium sm:table-cell">
              Liga
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              XP
            </th>
          </tr>
        </thead>
        <tbody>
          {dados.professores.map((p, i) => (
            <tr
              key={`${p.posicao}-${p.nome}-${i}`}
              aria-current={p.voce ? "true" : undefined}
              className={cn("border-b border-border last:border-0", p.voce && "bg-accent/60")}
            >
              <td className="px-4 py-3">
                <Posicao n={p.posicao} />
              </td>
              <td className="min-w-0 px-2 py-3">
                <span className="block truncate font-semibold">
                  {p.nome}
                  {p.voce ? <span className="ml-1.5 text-xs text-primary">· você</span> : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{p.escola}</span>
                <SeloDaLiga liga={ligaDoXp(p.xp)} className="mt-1 sm:hidden" />
              </td>
              <td className="hidden px-2 py-3 sm:table-cell">
                <SeloDaLiga liga={ligaDoXp(p.xp)} />
              </td>
              <td className="px-4 py-3 text-right font-display font-semibold tabular-nums">
                {p.xp.toLocaleString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaEscolas({ dados }: { dados: Ranking }) {
  if (dados.escolas.length === 0)
    return (
      <Vazio texto="O ranking de escolas soma o XP dos professores que participam. Ainda não há nenhum." />
    );
  return (
    <>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <caption className="sr-only">Ranking de escolas por XP total</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="w-12 px-4 py-2.5 font-medium">
                #
              </th>
              <th scope="col" className="px-2 py-2.5 font-medium">
                Escola
              </th>
              <th scope="col" className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">
                Professores
              </th>
              <th scope="col" className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">
                XP médio
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                XP total
              </th>
            </tr>
          </thead>
          <tbody>
            {dados.escolas.map((e) => (
              <tr
                key={`${e.posicao}-${e.nome}`}
                className={cn(
                  "border-b border-border last:border-0",
                  e.sua_escola && "bg-accent/60",
                )}
              >
                <td className="px-4 py-3">
                  <Posicao n={e.posicao} />
                </td>
                <td className="px-2 py-3">
                  <span className="block font-semibold">
                    {e.nome}
                    {e.sua_escola ? (
                      <span className="ml-1.5 text-xs text-primary">· sua escola</span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground sm:hidden">
                    {e.professores} {e.professores === 1 ? "professor" : "professores"} · média{" "}
                    {e.xp_medio.toLocaleString("pt-BR")} XP
                  </span>
                </td>
                <td className="hidden px-2 py-3 text-right tabular-nums sm:table-cell">
                  {e.professores}
                </td>
                <td className="hidden px-2 py-3 text-right tabular-nums sm:table-cell">
                  {e.xp_medio.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right font-display font-semibold tabular-nums">
                  {e.xp_total.toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Conta só o XP de quem aceitou participar do ranking.
      </p>
    </>
  );
}
