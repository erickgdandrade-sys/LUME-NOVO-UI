import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search, Sparkles, Star } from "lucide-react";
import { AcoesDaEstrategia } from "@/components/AcoesDaEstrategia";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { necessidadesDe, useAlunos } from "@/lib/alunos-store";
import {
  CATEGORIAS,
  corDaCategoria,
  estrategias,
  type Estrategia,
} from "@/lib/biblioteca-estrategias";
import { useEstrategiasSalvas } from "@/lib/estrategias-salvas";
import { tomSolid } from "@/lib/lume-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/")({
  head: () => ({
    meta: [
      { title: "Biblioteca de estratégias | Lume" },
      {
        name: "description",
        content:
          "Estratégias inclusivas com passo a passo, exemplo e base no DUA, para usar com seus alunos e nos seus planos.",
      },
    ],
  }),
  component: Biblioteca,
});

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const NECESSIDADES = [...new Set(estrategias.flatMap((e) => e.necessidades))].sort();

function Biblioteca() {
  const alunos = useAlunos();
  const salvas = useEstrategiasSalvas();
  const [categoria, setCategoria] = useState("Todas");
  const [necessidade, setNecessidade] = useState("");
  const [busca, setBusca] = useState("");
  const [soSalvas, setSoSalvas] = useState(false);

  const necessidadesDaTurma = new Map<string, number>();
  for (const a of alunos) {
    for (const n of necessidadesDe(a))
      necessidadesDaTurma.set(n, (necessidadesDaTurma.get(n) ?? 0) + 1);
  }
  const recomendadas = estrategias
    .map((e) => ({
      e,
      alunos: alunos.filter((a) => e.necessidades.some((n) => necessidadesDe(a).includes(n)))
        .length,
    }))
    .filter((r) => r.alunos > 0)
    .sort((x, y) => y.alunos - x.alunos)
    .slice(0, 4);

  const termo = normalizar(busca.trim());
  const lista = estrategias.filter(
    (e) =>
      (categoria === "Todas" || e.categoria === categoria) &&
      (!necessidade || e.necessidades.includes(necessidade)) &&
      (!soSalvas || salvas.includes(e.id)) &&
      normalizar(
        [e.titulo, e.resumo, e.categoria, ...e.quandoUsar, ...e.necessidades].join(" "),
      ).includes(termo),
  );
  const filtrando = Boolean(termo || necessidade || soSalvas || categoria !== "Todas");

  return (
    <div>
      <PageHeader
        title="Biblioteca de estratégias"
        subtitle="Práticas com passo a passo e exemplo, prontas para usar com seus alunos e nos seus planos."
      />

      {recomendadas.length > 0 && !filtrando ? (
        <section className="card-soft mb-6 p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold">
            <Sparkles className="h-4 w-4" /> Para os seus alunos
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Escolhidas pelas necessidades que você marcou nos perfis.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recomendadas.map(({ e, alunos: qtd }) => (
              <Link
                key={e.id}
                to="/biblioteca/$id"
                params={{ id: e.id }}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{e.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    Ajuda {qtd} {qtd === 1 ? "aluno seu" : "alunos seus"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por situação, ex.: “grupo”, “barulho”, “leitura”"
            aria-label="Buscar estratégias"
            className="h-10 rounded-lg bg-card pl-11"
          />
        </div>
        <select
          value={necessidade}
          onChange={(e) => setNecessidade(e.target.value)}
          aria-label="Filtrar por necessidade"
          className="h-10 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="">Qualquer necessidade</option>
          {NECESSIDADES.map((n) => (
            <option key={n} value={n}>
              {n}
              {necessidadesDaTurma.get(n) ? ` (${necessidadesDaTurma.get(n)} na turma)` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={soSalvas}
          onClick={() => setSoSalvas((v) => !v)}
          className={cn(
            "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors",
            soSalvas ? "border-sun bg-sun-soft" : "border-input bg-card hover:bg-secondary",
          )}
        >
          <Star className={cn("h-4 w-4", soSalvas && "fill-sun text-sun")} /> Minhas salvas (
          {salvas.length})
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Categorias">
        {["Todas", ...CATEGORIAS.map((c) => c.nome)].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoria(c)}
            aria-pressed={categoria === c}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              categoria === c
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        {lista.length} {lista.length === 1 ? "estratégia" : "estratégias"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {lista.map((e) => (
          <Cartao key={e.id} estrategia={e} />
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {soSalvas && salvas.length === 0
            ? "Você ainda não salvou nenhuma estratégia. Toque em ☆ Salvar nas que quiser guardar."
            : "Nenhuma estratégia encontrada para essa busca."}
        </p>
      ) : null}

      <p className="mt-8 text-xs text-muted-foreground">
        As estratégias seguem os três princípios do Desenho Universal para a Aprendizagem (DUA),
        propostos pelo CAST: múltiplos meios de engajamento, de representação e de ação e expressão,
        alinhados à Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva
        (MEC, 2008).
      </p>
    </div>
  );
}

function Cartao({ estrategia: e }: { estrategia: Estrategia }) {
  return (
    <article className="card-soft flex flex-col p-5">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", tomSolid[corDaCategoria(e.categoria)])}
        />
        {e.categoria} · DUA {e.principio}
      </span>
      <Link
        to="/biblioteca/$id"
        params={{ id: e.id }}
        className="mt-1.5 text-base font-semibold hover:text-primary"
      >
        {e.titulo}
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">{e.resumo}</p>
      {e.necessidades.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.necessidades.map((n) => (
            <span
              key={n}
              className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {n}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <AcoesDaEstrategia estrategia={e} compacto />
        <Link
          to="/biblioteca/$id"
          params={{ id: e.id }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
        >
          Ver passo a passo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
