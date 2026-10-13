import { Link } from "@tanstack/react-router";
import { Sparkles, Star, UserPlus } from "lucide-react";
import { UsarComAluno } from "@/components/UsarComAluno";
import type { Estrategia } from "@/lib/biblioteca-estrategias";
import { alternarEstrategiaSalva, useEstrategiasSalvas } from "@/lib/estrategias-salvas";
import { cn } from "@/lib/utils";

const botao =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors";

export function AcoesDaEstrategia({
  estrategia,
  compacto,
}: {
  estrategia: Estrategia;
  compacto?: boolean;
}) {
  const salvas = useEstrategiasSalvas();
  const salva = salvas.includes(estrategia.id);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => alternarEstrategiaSalva(estrategia.id)}
        aria-pressed={salva}
        className={cn(
          botao,
          salva ? "bg-sun-soft" : "border border-border bg-card hover:bg-accent",
        )}
      >
        <Star className={cn("h-3.5 w-3.5", salva && "fill-current text-[#d9a400]")} />
        {salva ? "Salva" : "Salvar"}
      </button>
      <UsarComAluno
        estrategia={estrategia}
        trigger={
          <button
            type="button"
            className={cn(botao, "border border-border bg-card hover:bg-accent")}
          >
            <UserPlus className="h-3.5 w-3.5" /> Usar com um aluno
          </button>
        }
      />
      {compacto ? null : (
        <Link
          to="/planejamento"
          search={{ estrategia: estrategia.id }}
          className={cn(botao, "bg-primary text-primary-foreground hover:opacity-90")}
        >
          <Sparkles className="h-3.5 w-3.5" /> Planejar uma aula com ela
        </Link>
      )}
    </div>
  );
}
