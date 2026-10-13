import { Sparkles } from "lucide-react";
import { dataRenovacao, type SituacaoPlano } from "@/lib/plano-escola";
import { cn } from "@/lib/utils";

export function Creditos({
  situacao,
  restante,
  uso = "cada adaptação usa 1",
}: {
  situacao: SituacaoPlano;
  restante: number | null;
  uso?: string;
}) {
  if (restante === null) {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Plano {situacao.plano_nome}: créditos de IA sem limite.
      </p>
    );
  }
  const acabou = restante <= 0;
  const peloTeto =
    situacao.meu_teto !== null && situacao.meu_teto - situacao.meus_creditos_usados === restante;
  return (
    <div
      className={cn(
        "mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
        acabou ? "bg-coral-soft" : restante <= 5 ? "bg-sun-soft" : "bg-secondary",
      )}
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {acabou ? (
          <>
            {peloTeto
              ? "Você usou todos os seus créditos de IA deste mês."
              : situacao.extra_liberado
                ? "Os créditos extras liberados para este mês acabaram."
                : "Os créditos de IA da escola acabaram este mês."}{" "}
            Eles renovam em {dataRenovacao(situacao.renova_em)}. Fale com a coordenação se precisar
            de mais.
          </>
        ) : (
          <>
            <strong>{restante}</strong> {restante === 1 ? "crédito de IA" : "créditos de IA"}{" "}
            {peloTeto
              ? "no seu limite"
              : situacao.extra_liberado && situacao.creditos_usados >= (situacao.creditos_mes ?? 0)
                ? "extras liberados pela coordenação"
                : "da escola"}{" "}
            este mês · {uso} · renova em {dataRenovacao(situacao.renova_em)}
          </>
        )}
      </span>
    </div>
  );
}
