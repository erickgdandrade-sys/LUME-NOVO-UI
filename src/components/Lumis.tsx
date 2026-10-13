import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Sparkle } from "lucide-react";
import lumis from "@/assets/lumis-icone.webp";
import { cn } from "@/lib/utils";

const MOVIMENTOS = [
  "lumis-girar 1.3s cubic-bezier(.6,0,.3,1)",
  "lumis-pulinho 1s ease-out",
  "lumis-balanco 1.2s ease-in-out",
  "lumis-cambalhota 1.2s cubic-bezier(.5,0,.3,1)",
  "lumis-pulinho 1s ease-out",
] as const;

/** Lumis flutuando e, de tempos em tempos, fazendo um movimento diferente. */
export function LumisAnimada({ className }: { className?: string }) {
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPasso((p) => p + 1), 2400);
    return () => window.clearInterval(id);
  }, []);
  const movimento = MOVIMENTOS[passo % MOVIMENTOS.length];

  return (
    <div className={cn("lumis-anima relative", className)} aria-hidden="true">
      {[
        "left-0 top-2 h-4 w-4 [animation-delay:0s]",
        "right-0 top-0 h-3 w-3 [animation-delay:.6s]",
        "-right-2 bottom-4 h-4 w-4 [animation-delay:1.2s]",
        "-left-1 bottom-2 h-3 w-3 [animation-delay:.9s]",
      ].map((pos) => (
        <Sparkle key={pos} className={cn("animate-lumis-brilho absolute fill-sun text-sun", pos)} />
      ))}
      <div
        className="h-full w-full"
        style={{ animation: "lumis-flutuar 2.6s ease-in-out infinite" }}
      >
        <img
          key={passo}
          src={lumis}
          alt=""
          className="h-full w-full object-contain"
          style={passo === 0 ? undefined : { animation: `${movimento} both` }}
        />
      </div>
    </div>
  );
}

/** Frases que sobem uma de cada vez, em ciclo. */
export function FrasesEmCiclo({
  frases,
  intervalo = 2600,
  className,
}: {
  frases: readonly string[];
  intervalo?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => n + 1), intervalo);
    return () => window.clearInterval(id);
  }, [intervalo]);

  return (
    <div className={cn("relative h-6 overflow-hidden", className)} aria-live="polite">
      {i > 0 ? (
        <p
          key={`saindo-${i}`}
          aria-hidden="true"
          className="animate-frase-sair absolute inset-x-0 top-0 truncate text-center text-base font-semibold"
        >
          {frases[(i - 1) % frases.length]}
        </p>
      ) : null}
      <p
        key={i}
        className="lumis-anima animate-frase-entrar absolute inset-x-0 top-0 truncate text-center text-base font-semibold"
      >
        {frases[i % frases.length]}
      </p>
    </div>
  );
}

const CORES = ["#F07A5F", "#F5B342", "#8BC34A", "#3FA9E0", "#E85D8A", "#4F7FE0"];

/** Explosão de confetes a partir do centro do elemento pai (que precisa ser relative). */
export function Confetes({
  quantidade = 30,
  alcance = 180,
}: {
  quantidade?: number;
  alcance?: number;
}) {
  const pecas = useMemo(
    () =>
      Array.from({ length: quantidade }, (_, k) => {
        const angulo = Math.random() * Math.PI * 2;
        const raio = alcance * (0.5 + Math.random() * 0.8);
        return {
          k,
          x: `${Math.round(Math.cos(angulo) * raio)}px`,
          y: `${Math.round(Math.sin(angulo) * raio + alcance * 0.35)}px`,
          r: `${Math.round(360 + Math.random() * 360)}deg`,
          atraso: `${(Math.random() * 0.15).toFixed(2)}s`,
          cor: CORES[k % CORES.length],
          redondo: k % 3 === 0,
        };
      }),
    [quantidade, alcance],
  );

  return (
    <div
      className="confetes pointer-events-none absolute inset-0 overflow-visible"
      aria-hidden="true"
    >
      {pecas.map((p) => (
        <span
          key={p.k}
          className={cn(
            "absolute left-1/2 top-1/3 h-3 w-2 opacity-0",
            p.redondo ? "rounded-full" : "rounded-[2px]",
          )}
          style={
            {
              background: p.cor,
              animation: `confete 2.2s cubic-bezier(.15,.7,.3,1) ${p.atraso} both`,
              "--x": p.x,
              "--y": p.y,
              "--r": p.r,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
