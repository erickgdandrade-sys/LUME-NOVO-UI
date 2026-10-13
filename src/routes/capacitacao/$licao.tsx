import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Lock, RotateCcw, Sparkles, Star, Trophy, X } from "lucide-react";
import iconeLumis from "@/assets/lumis-icone.webp";
import { IconeDaLiga } from "@/components/Liga";
import { Confetes, LumisAnimada } from "@/components/Lumis";
import { Progress } from "@/components/ui/progress";
import { tocarAcerto, tocarLicaoConcluida, tocarTrilhaConcluida } from "@/lib/sons";
import { todasAsLicoes, type Pergunta } from "@/lib/capacitacao-trilhas";
import { concluirLicao, estadoDasLicoes, useCapacitacao } from "@/lib/capacitacao-store";
import { ligaDoXp, type Liga } from "@/lib/ligas";
import { progressoStore, registrarResposta } from "@/lib/progresso-store";
import { tomSolid } from "@/lib/lume-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/capacitacao/$licao")({
  head: () => ({ meta: [{ title: "Lição | Capacitação | Lume" }] }),
  component: PaginaLicao,
});

const letras = ["A", "B", "C", "D"];

function embaralhar(quantidade: number, semente: number) {
  const ordem = Array.from({ length: quantidade }, (_, i) => i);
  let x = semente || 1;
  for (let i = ordem.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j]!, ordem[i]!];
  }
  return ordem;
}

function PaginaLicao() {
  const { licao: id } = Route.useParams();
  const { concluidas } = useCapacitacao();
  const indice = todasAsLicoes.findIndex((l) => l.id === id);
  const licao = todasAsLicoes[indice];
  const [semente, setSemente] = useState(1);
  useEffect(() => setSemente(Math.floor(Math.random() * 100000) + 1), [id]);

  if (!licao) {
    return (
      <Aviso titulo="Lição não encontrada" texto="Essa lição não existe ou foi trocada de lugar." />
    );
  }
  if (estadoDasLicoes(concluidas).get(licao.id) === "bloqueada") {
    return (
      <Aviso
        titulo="Lição bloqueada"
        texto="Termine as lições anteriores da trilha para liberar esta."
        bloqueada
      />
    );
  }
  return <Licao key={licao.id} indice={indice} semente={semente} />;
}

type Fase = { tipo: "pergunta" } | { tipo: "fim"; xp: number; novaLiga: Liga | null };

function Licao({ indice, semente }: { indice: number; semente: number }) {
  const licao = todasAsLicoes[indice]!;
  const navigate = useNavigate();
  const total = licao.perguntas.length;
  const [fila, setFila] = useState<Pergunta[]>(licao.perguntas);
  const [posicao, setPosicao] = useState(0);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [verificada, setVerificada] = useState(false);
  const [certas, setCertas] = useState<Set<string>>(new Set());
  const [erradas, setErradas] = useState<Set<string>>(new Set());
  const [fase, setFase] = useState<Fase>({ tipo: "pergunta" });

  const pergunta = fila[posicao]!;
  const ordem = useMemo(
    () => embaralhar(pergunta.alternativas.length, semente + posicao * 7919),
    [pergunta, posicao, semente],
  );
  const acertou = selecionada === pergunta.correta;
  const revisao = erradas.has(pergunta.id) && !verificada;
  const proxima = todasAsLicoes[indice + 1];
  const fimDaTrilha = !proxima || proxima.trilha.id !== licao.trilha.id;

  function verificar() {
    if (selecionada === null || verificada) return;
    setVerificada(true);
    registrarResposta(acertou);
    if (acertou) {
      tocarAcerto();
      setCertas((s) => new Set(s).add(pergunta.id));
    } else {
      setErradas((s) => new Set(s).add(pergunta.id));
      setFila((f) => [...f, pergunta]);
    }
  }

  function continuar() {
    if (!verificada) return;
    if (posicao + 1 >= fila.length) {
      const ligaAntes = ligaDoXp(progressoStore.get().xp);
      const xp = concluirLicao(licao.id, total - erradas.size, total);
      const ligaDepois = ligaDoXp(progressoStore.get().xp);
      const novaLiga = ligaDepois.id !== ligaAntes.id ? ligaDepois : null;
      if (fimDaTrilha || novaLiga) tocarTrilhaConcluida();
      else tocarLicaoConcluida();
      setFase({ tipo: "fim", xp, novaLiga });
      return;
    }
    setPosicao((p) => p + 1);
    setSelecionada(null);
    setVerificada(false);
  }

  useEffect(() => {
    if (fase.tipo !== "pergunta") return;
    const tecla = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!verificada && n >= 1 && n <= ordem.length) setSelecionada(ordem[n - 1]!);
      if (e.key === "Enter") {
        e.preventDefault();
        if (verificada) continuar();
        else verificar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  if (fase.tipo === "fim") {
    const deprimeira = total - erradas.size;
    const grande = fimDaTrilha || fase.novaLiga !== null;
    return (
      <div className="mx-auto max-w-xl py-6 text-center">
        <div className="relative mx-auto w-fit">
          <Confetes quantidade={grande ? 80 : 32} alcance={grande ? 300 : 190} />
          <div className="animate-lumis-surgir">
            <LumisAnimada className={grande ? "h-32 w-32" : "h-24 w-24"} />
          </div>
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold sm:text-3xl">
          {fimDaTrilha ? "Trilha concluída!" : "Lição concluída!"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {fimDaTrilha
            ? `Você terminou a trilha "${licao.trilha.titulo}".`
            : `Você terminou "${licao.titulo}".`}
        </p>
        {fimDaTrilha ? (
          <p className="animate-lumis-surgir mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-4 text-sm font-semibold [animation-delay:.3s]">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full text-white",
                tomSolid[licao.trilha.cor],
              )}
            >
              <Trophy className="h-4 w-4" />
            </span>
            Selo “{licao.trilha.titulo}” conquistado
          </p>
        ) : null}
        {fase.novaLiga ? (
          <div
            role="status"
            className={cn(
              "animate-lumis-surgir mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-left [animation-delay:.45s]",
              fase.novaLiga.tom,
            )}
          >
            <IconeDaLiga liga={fase.novaLiga} className="h-8 w-8 shrink-0" />
            <span>
              <span className="block text-xs font-semibold opacity-80">Você subiu de liga!</span>
              <span className="block font-conquista text-xl leading-tight font-extrabold">
                Liga {fase.novaLiga.nome}
              </span>
            </span>
          </div>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-xs font-medium text-muted-foreground">XP ganho</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-2xl font-semibold">
              <Star className="h-5 w-5 fill-sun text-sun" /> {fase.xp}
            </p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-xs font-medium text-muted-foreground">Acertos de primeira</p>
            <p className="mt-1 text-2xl font-semibold">
              {deprimeira} de {total}
            </p>
          </div>
        </div>
        {proxima ? (
          <p className="mt-6 rounded-xl bg-leaf-soft px-4 py-3 text-sm">
            {fimDaTrilha ? (
              <>
                Próxima trilha liberada: <strong>{proxima.trilha.titulo}</strong>
              </>
            ) : (
              <>
                Próxima lição liberada: <strong>{proxima.titulo}</strong>
              </>
            )}
          </p>
        ) : (
          <p className="mt-6 rounded-xl bg-leaf-soft px-4 py-3 text-sm">
            Você concluiu todas as trilhas da capacitação. Parabéns!
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {proxima ? (
            <button
              type="button"
              onClick={() =>
                void navigate({ to: "/capacitacao/$licao", params: { licao: proxima.id } })
              }
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {fimDaTrilha ? "Começar próxima trilha" : "Próxima lição"}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          <Link
            to="/capacitacao"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary"
          >
            Voltar para as trilhas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-40">
      <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to="/capacitacao"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Sair da lição"
        >
          <X className="h-4 w-4" />
        </Link>
        <Progress
          value={(certas.size / total) * 100}
          className="h-3"
          aria-label={`${certas.size} de ${total} perguntas certas`}
        />
        <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
          {certas.size}/{total}
        </span>
      </div>

      <p className="text-xs font-semibold text-muted-foreground">
        {licao.trilha.titulo} · {licao.titulo}
      </p>
      {revisao ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1 text-xs font-semibold">
          <RotateCcw className="h-3.5 w-3.5" /> Revisão: você errou esta antes
        </p>
      ) : null}
      <h1 className="mt-3 mb-6 font-display text-xl leading-snug font-semibold sm:text-2xl">
        {pergunta.enunciado}
      </h1>

      <div className="space-y-3" role="radiogroup" aria-label="Alternativas">
        {ordem.map((original, pos) => {
          const escolhida = selecionada === original;
          const certa = original === pergunta.correta;
          return (
            <button
              key={original}
              type="button"
              role="radio"
              aria-checked={escolhida}
              disabled={verificada}
              onClick={() => setSelecionada(original)}
              className={cn(
                "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                !verificada && !escolhida && "cursor-pointer border-border bg-card hover:bg-accent",
                !verificada && escolhida && "cursor-pointer border-primary bg-accent",
                verificada && certa && "border-leaf bg-leaf-soft",
                verificada && escolhida && !certa && "border-coral bg-coral-soft",
                verificada && !certa && !escolhida && "border-border bg-card opacity-50",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg border font-display text-xs font-semibold",
                  escolhida && !verificada ? "border-primary text-primary" : "border-border",
                )}
              >
                {letras[pos]}
              </span>
              <span className="min-w-0">{pergunta.alternativas[original]}</span>
              {verificada && certa ? <Check className="h-5 w-5 shrink-0" /> : null}
              {verificada && escolhida && !certa ? <X className="h-5 w-5 shrink-0" /> : null}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-16 z-20 border-t px-4 py-4 lg:bottom-0 lg:left-60",
          !verificada && "border-border bg-card",
          verificada && acertou && "border-leaf/50 bg-leaf-soft",
          verificada && !acertou && "border-coral/50 bg-coral-soft",
        )}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
          {verificada ? (
            <div role="status" className="flex min-w-0 flex-1 items-start gap-3">
              {acertou ? (
                <span className="animate-lumis-surgir shrink-0">
                  <span
                    className="lumis-anima block"
                    style={{ animation: "lumis-pulinho 1s ease-out .45s both" }}
                  >
                    <img src={iconeLumis} alt="" className="h-12 w-12 object-contain" />
                  </span>
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-semibold">
                  {acertou ? (
                    <>
                      <Sparkles className="h-4 w-4" /> Muito bem!
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" /> Resposta certa:{" "}
                      {letras[ordem.indexOf(pergunta.correta)]}
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm">{pergunta.explicacao}</p>
                {!acertou ? (
                  <p className="mt-1 text-xs font-semibold">Ela vai voltar no fim da lição.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="hidden flex-1 text-xs text-muted-foreground sm:block">
              Escolha uma alternativa e clique em Verificar.
            </p>
          )}
          <button
            type="button"
            disabled={selecionada === null}
            onClick={verificada ? continuar : verificar}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
              verificada && !acertou ? "bg-coral" : verificada ? "bg-leaf" : "bg-primary",
            )}
          >
            {verificada ? "Continuar" : "Verificar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Aviso({
  titulo,
  texto,
  bloqueada,
}: {
  titulo: string;
  texto: string;
  bloqueada?: boolean;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {bloqueada ? (
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
          <Lock className="h-6 w-6" />
        </span>
      ) : null}
      <h1 className="mt-4 font-display text-2xl font-bold">{titulo}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
      <Link
        to="/capacitacao"
        className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Voltar para as trilhas
      </Link>
    </div>
  );
}
