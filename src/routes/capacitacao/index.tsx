import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock, Play, RotateCcw, Star, Trophy } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { CartaoDaLiga } from "@/components/Liga";
import heroImg from "@/assets/capacitacao-hero.svg";
import { trilhas } from "@/lib/capacitacao-trilhas";
import {
  estadoDaTrilha,
  estadoDasLicoes,
  licaoAtual,
  resumoCapacitacao,
  useCapacitacao,
} from "@/lib/capacitacao-store";
import { tomSoft, tomSolid } from "@/lib/lume-data";
import { useProgresso } from "@/lib/progresso-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/capacitacao/")({
  head: () => ({
    meta: [
      { title: "Capacitação do professor | Lume" },
      {
        name: "description",
        content:
          "Trilhas curtas e gamificadas sobre educação inclusiva, TEA, TDAH e comunicação na sala de aula.",
      },
    ],
  }),
  component: Capacitacao,
});

const deslocamento = ["sm:translate-x-0", "sm:translate-x-16", "sm:-translate-x-16"];

function Capacitacao() {
  const progresso = useProgresso();
  const { concluidas } = useCapacitacao();
  const estados = estadoDasLicoes(concluidas);
  const atual = licaoAtual(concluidas);
  const resumo = resumoCapacitacao(concluidas);

  return (
    <div>
      <PageHeader
        title="Capacitação do professor"
        subtitle="Trilhas curtas, práticas e aplicáveis na próxima aula."
      />

      <div className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="card-soft overflow-hidden">
          <img
            src={heroImg}
            alt="Ilustração de uma professora conduzindo uma atividade inclusiva com a turma"
            className="h-40 w-full object-cover"
          />
          <div className="p-5">
            <p className="mb-3 text-xs text-muted-foreground">
              {resumo.feitas} de {resumo.total} lições · {resumo.trilhasConcluidas} de{" "}
              {resumo.totalTrilhas} trilhas concluídas
            </p>
            {atual ? (
              <>
                <p className="text-xs font-medium text-muted-foreground">
                  Próxima lição · {atual.trilha.titulo}
                </p>
                <p className="mt-0.5 text-lg font-semibold">{atual.titulo}</p>
                <Link
                  to="/capacitacao/$licao"
                  params={{ licao: atual.id }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4" /> {resumo.feitas === 0 ? "Começar agora" : "Continuar"}
                </Link>
              </>
            ) : (
              <>
                <p className="inline-flex items-center gap-2 text-lg font-semibold">
                  <Trophy className="h-5 w-5 text-sun" /> Você concluiu todas as trilhas!
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Refaça qualquer lição para revisar e ganhar mais XP.
                </p>
              </>
            )}
          </div>
        </div>
        <CartaoDaLiga xp={progresso.xp} comEscada />
      </div>

      <div className="space-y-12">
        {trilhas.map((trilha, t) => {
          const estadoTrilha = estadoDaTrilha(trilha, estados);
          const feitas = trilha.licoes.filter((l) => concluidas[l.id]).length;
          return (
            <section key={trilha.id} aria-labelledby={`trilha-${trilha.id}`}>
              <div
                className={cn(
                  "mb-6 rounded-xl p-5",
                  estadoTrilha === "bloqueada" ? "bg-secondary" : tomSoft[trilha.cor],
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">Trilha {t + 1}</p>
                    <h2
                      id={`trilha-${trilha.id}`}
                      className="font-display text-lg leading-tight font-semibold"
                    >
                      {trilha.titulo}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{trilha.descricao}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold">
                    {estadoTrilha === "concluida"
                      ? "Concluída"
                      : estadoTrilha === "bloqueada"
                        ? "Bloqueada"
                        : `${feitas}/${trilha.licoes.length}`}
                  </span>
                </div>
              </div>

              <ol className="flex flex-col items-center gap-5">
                {trilha.licoes.map((licao, i) => {
                  const estado = estados.get(licao.id);
                  const bolinha = (
                    <span
                      className={cn(
                        "grid h-16 w-16 place-items-center rounded-full border-b-4 text-card shadow-soft transition-transform",
                        estado === "bloqueada"
                          ? "border-border bg-secondary text-muted-foreground"
                          : cn(tomSolid[trilha.cor], "border-black/15"),
                        estado === "atual" &&
                          "ring-4 ring-primary/30 ring-offset-2 ring-offset-background",
                        estado !== "bloqueada" && "group-hover:-translate-y-0.5",
                      )}
                    >
                      {estado === "concluida" ? (
                        <Check className="h-7 w-7" />
                      ) : estado === "bloqueada" ? (
                        <Lock className="h-6 w-6" />
                      ) : (
                        <Star className="h-7 w-7" />
                      )}
                    </span>
                  );
                  const legenda = (
                    <span className="mt-2 block text-center">
                      <span className="block text-sm font-semibold">{licao.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        {estado === "concluida" ? (
                          <span className="inline-flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" /> Revisar
                          </span>
                        ) : estado === "atual" ? (
                          "Começar"
                        ) : (
                          "Bloqueada"
                        )}
                      </span>
                    </span>
                  );
                  return (
                    <li key={licao.id} className={cn("w-40 text-center", deslocamento[i % 3])}>
                      {estado === "bloqueada" ? (
                        <div aria-disabled="true" className="flex flex-col items-center opacity-70">
                          {bolinha}
                          {legenda}
                        </div>
                      ) : (
                        <Link
                          to="/capacitacao/$licao"
                          params={{ licao: licao.id }}
                          className="group flex flex-col items-center"
                        >
                          {bolinha}
                          {legenda}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
