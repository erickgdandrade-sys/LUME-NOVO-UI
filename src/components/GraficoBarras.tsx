import { cn } from "@/lib/utils";

type Ponto = { rotulo: string; valor: number | null };

export function GraficoBarras({
  titulo,
  dados,
  unidade = "",
  cor = "bg-primary",
  maximo,
}: {
  titulo: string;
  dados: Ponto[];
  unidade?: string;
  cor?: string;
  maximo?: number;
}) {
  const teto = maximo ?? Math.max(1, ...dados.map((d) => d.valor ?? 0));
  const texto = (v: number | null) => (v === null ? "sem dados" : `${v}${unidade}`);
  return (
    <figure className="w-full">
      <figcaption className="mb-3 text-sm font-semibold">{titulo}</figcaption>
      <div
        className="grid h-32 items-end gap-2 border-b border-border"
        style={{ gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${titulo}: ${dados.map((d) => `${d.rotulo} ${texto(d.valor)}`).join(", ")}`}
      >
        {dados.map((d) => (
          <div key={d.rotulo} className="flex h-full flex-col items-center justify-end">
            <span className="mb-1 text-[11px] font-semibold tabular-nums">
              {d.valor === null ? "–" : `${d.valor}${unidade}`}
            </span>
            <span
              className={cn(
                "w-full max-w-10 rounded-t-[4px]",
                d.valor === null ? "bg-border" : cor,
              )}
              style={{ height: `${d.valor === null ? 2 : Math.max((d.valor / teto) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div
        className="mt-1.5 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))` }}
      >
        {dados.map((d) => (
          <span key={d.rotulo} className="text-center text-[11px] text-muted-foreground">
            {d.rotulo}
          </span>
        ))}
      </div>
    </figure>
  );
}
