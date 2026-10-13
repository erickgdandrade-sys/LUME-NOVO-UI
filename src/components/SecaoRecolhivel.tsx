import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useRecolhida } from "@/lib/secoes-recolhidas";
import { cn } from "@/lib/utils";

export function SecaoRecolhivel({
  chave,
  titulo,
  resumo,
  acao,
  children,
  className,
  fechadaPorPadrao = false,
}: {
  chave: string;
  titulo: ReactNode;
  resumo?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
  fechadaPorPadrao?: boolean;
}) {
  const [fechada, alternar] = useRecolhida(chave, fechadaPorPadrao);
  const id = useId();

  return (
    <section className={cn("card-soft", className)}>
      <div className="flex items-center gap-3 p-5">
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!fechada}
          aria-controls={id}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              fechada && "-rotate-90",
            )}
          />
          <span className="min-w-0">
            <span className="block font-display text-base font-semibold">{titulo}</span>
            {fechada && resumo ? (
              <span className="block truncate text-xs text-muted-foreground">{resumo}</span>
            ) : null}
          </span>
        </button>
        {acao ? <div className="shrink-0">{acao}</div> : null}
      </div>
      {fechada ? null : (
        <div id={id} className="px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}
