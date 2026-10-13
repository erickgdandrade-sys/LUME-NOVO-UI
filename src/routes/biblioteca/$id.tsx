import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, Ban, Lightbulb, ListChecks, Package, Printer, Target } from "lucide-react";
import { AcoesDaEstrategia } from "@/components/AcoesDaEstrategia";
import { corDaCategoria, estrategiaPorId, estrategias } from "@/lib/biblioteca-estrategias";
import { tomSoft, tomSolid } from "@/lib/lume-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/$id")({
  head: () => ({ meta: [{ title: "Estratégia | Biblioteca | Lume" }] }),
  component: PaginaEstrategia,
});

function PaginaEstrategia() {
  const { id } = Route.useParams();
  const e = estrategiaPorId(id);

  if (!e) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl font-semibold">Estratégia não encontrada</p>
        <Link to="/biblioteca" className="mt-4 inline-block text-sm font-semibold text-primary">
          Voltar para a biblioteca
        </Link>
      </div>
    );
  }

  const relacionadas = estrategias
    .filter(
      (o) =>
        o.id !== e.id &&
        (o.categoria === e.categoria || o.necessidades.some((n) => e.necessidades.includes(n))),
    )
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link
          to="/biblioteca"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Biblioteca
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-accent"
        >
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </button>
      </div>

      <header className={cn("mb-6 rounded-xl p-6", tomSoft[corDaCategoria(e.categoria)])}>
        <p className="text-xs font-semibold text-muted-foreground">
          {e.categoria} · DUA {e.principio}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{e.titulo}</h1>
        <p className="mt-2 text-sm">{e.resumo}</p>
        {e.necessidades.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {e.necessidades.map((n) => (
              <span key={n} className="rounded-full bg-card/70 px-2.5 py-1 text-xs font-semibold">
                {n}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-5 print:hidden">
          <AcoesDaEstrategia estrategia={e} />
        </div>
      </header>

      <div className="space-y-4">
        <Bloco icon={<Target className="h-4 w-4" />} titulo="Quando usar">
          <ul className="list-disc space-y-1 pl-5">
            {e.quandoUsar.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </Bloco>
        <Bloco icon={<ListChecks className="h-4 w-4" />} titulo="Passo a passo">
          <ol className="list-decimal space-y-1.5 pl-5">
            {e.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Bloco>
        <Bloco icon={<Lightbulb className="h-4 w-4" />} titulo="Exemplo em sala">
          <p>{e.exemplo}</p>
        </Bloco>
        <div className="grid gap-4 sm:grid-cols-2">
          {e.materiais.length ? (
            <Bloco icon={<Package className="h-4 w-4" />} titulo="Materiais">
              <ul className="list-disc space-y-1 pl-5">
                {e.materiais.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Bloco>
          ) : null}
          {e.evite.length ? (
            <Bloco icon={<Ban className="h-4 w-4" />} titulo="Evite">
              <ul className="list-disc space-y-1 pl-5">
                {e.evite.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Bloco>
          ) : null}
        </div>
      </div>

      {relacionadas.length ? (
        <section className="mt-8 print:hidden">
          <h2 className="mb-3 font-display text-base font-semibold">Combina com</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {relacionadas.map((r) => (
              <Link
                key={r.id}
                to="/biblioteca/$id"
                params={{ id: r.id }}
                className="card-soft p-4 transition-colors hover:border-primary/40"
              >
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      tomSolid[corDaCategoria(r.categoria)],
                    )}
                  />
                  {r.categoria}
                </span>
                <span className="mt-0.5 block text-sm font-semibold">{r.titulo}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Bloco({
  icon,
  titulo,
  children,
}: {
  icon: ReactNode;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="card-soft p-5 print:break-inside-avoid">
      <h2 className="mb-2 inline-flex items-center gap-2 font-display text-sm font-bold">
        {icon} {titulo}
      </h2>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
