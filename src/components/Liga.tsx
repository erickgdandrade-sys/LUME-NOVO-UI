import { Link } from "@tanstack/react-router";
import { Award, ChevronRight, Gem, Medal, type LucideIcon } from "lucide-react";
import { LIGAS, faixaDeNiveis, progressoNaLiga, type Liga } from "@/lib/ligas";
import { nivel } from "@/lib/progresso-store";
import { cn } from "@/lib/utils";

const ICONES: Record<Liga["id"], LucideIcon> = {
  bronze: Medal,
  prata: Medal,
  ouro: Medal,
  platina: Award,
  diamante: Gem,
};

export function IconeDaLiga({ liga, className }: { liga: Liga; className?: string }) {
  const Icone = ICONES[liga.id];
  return <Icone className={className} aria-hidden="true" />;
}

/** Selo compacto, usado em listas e no ranking. */
export function SeloDaLiga({ liga, className }: { liga: Liga; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
        liga.tom,
        className,
      )}
    >
      <IconeDaLiga liga={liga} className="h-3.5 w-3.5" />
      {liga.nome}
    </span>
  );
}

/** Card com a liga atual, a barra até a próxima e (opcional) a escada de ligas. */
export function CartaoDaLiga({
  xp,
  comEscada = false,
  linkRanking = true,
  className,
}: {
  xp: number;
  comEscada?: boolean;
  linkRanking?: boolean;
  className?: string;
}) {
  const { liga, proxima, faltam, pct } = progressoNaLiga(xp);
  return (
    <section className={cn("card-soft p-5", className)} aria-label="Sua liga">
      <div className="flex items-center gap-4">
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl", liga.tom)}>
          <IconeDaLiga liga={liga} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Sua liga</p>
          <p className="truncate font-conquista text-xl leading-tight font-extrabold">
            Liga {liga.nome}
          </p>
        </div>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={proxima ? `Progresso até a Liga ${proxima.nome}` : "Liga máxima"}
      >
        <div className={cn("h-full rounded-full", liga.barra)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Nível {nivel(xp)} · {xp.toLocaleString("pt-BR")} XP
        {proxima
          ? ` · faltam ${faltam.toLocaleString("pt-BR")} XP para a Liga ${proxima.nome}`
          : " · você está na liga mais alta"}
      </p>
      {linkRanking ? (
        <Link
          to="/ranking"
          className="-ml-2.5 mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-primary hover:bg-accent"
        >
          Ver ranking <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
      {comEscada ? (
        <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Ligas">
          {LIGAS.map((l) => {
            const atual = l.id === liga.id;
            const passou = LIGAS.indexOf(l) < LIGAS.indexOf(liga);
            return (
              <li
                key={l.id}
                aria-current={atual ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                  atual ? cn("border-transparent font-semibold", l.tom) : "border-border",
                  !atual && !passou && "text-muted-foreground",
                )}
              >
                <IconeDaLiga liga={l} className="h-3.5 w-3.5" />
                {l.nome}
                <span className="font-normal opacity-70">· {faixaDeNiveis(l)}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
