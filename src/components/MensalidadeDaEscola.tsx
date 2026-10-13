import { useEffect, useState } from "react";
import {
  ROTULO_DA_SITUACAO,
  TOM_DA_SITUACAO,
  dataBR,
  hojeISO,
  nomeDoMes,
  primeiroDoMes,
  reais,
  situacaoNaTela,
  totalDa,
  type Cobranca,
  type Contrato,
} from "@/lib/financeiro";
import { SecaoRecolhivel } from "@/components/SecaoRecolhivel";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Mensalidade = {
  contrato: Omit<Contrato, "escola" | "observacao"> | null;
  cobrancas: Omit<Cobranca, "escola" | "observacao">[];
};

export function MensalidadeDaEscola({ escola }: { escola: string }) {
  const [dados, setDados] = useState<Mensalidade | null>(null);

  useEffect(() => {
    let ativo = true;
    void supabase()
      .rpc("mensalidade_da_escola", { p_escola: escola })
      .then(({ data, error }) => {
        if (error) return console.error(error.message);
        if (ativo) setDados(data as Mensalidade);
      });
    return () => {
      ativo = false;
    };
  }, [escola]);

  if (!dados || (!dados.contrato && dados.cobrancas.length === 0)) return null;

  const hoje = hojeISO();
  const doMes = dados.cobrancas.find((c) => c.competencia === primeiroDoMes(hoje));
  const situacaoDoMes = doMes ? situacaoNaTela(doMes, hoje) : null;
  const { contrato } = dados;

  return (
    <SecaoRecolhivel
      chave="gestor-mensalidade"
      titulo="Mensalidade da Lume"
      resumo={
        doMes && situacaoDoMes
          ? `${nomeDoMes(doMes.competencia)}: ${reais(totalDa(doMes))} · ${ROTULO_DA_SITUACAO[situacaoDoMes]}`
          : contrato
            ? `${reais(Number(contrato.valor_mensal))} por mês`
            : undefined
      }
      className={cn(
        "overflow-hidden",
        (situacaoDoMes === "atrasada" || situacaoDoMes === "vence-logo") && "ring-2 ring-sun",
      )}
    >
      {contrato ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Info rotulo="Valor mensal" valor={reais(Number(contrato.valor_mensal))} />
          <Info rotulo="Vencimento" valor={`Todo dia ${contrato.dia_vencimento}`} />
          <Info
            rotulo="Crédito de IA extra"
            valor={
              Number(contrato.valor_credito_extra) > 0
                ? `${reais(Number(contrato.valor_credito_extra))} cada`
                : "Sem cobrança"
            }
          />
        </div>
      ) : null}

      {doMes && situacaoDoMes ? (
        <p
          className={cn("mt-4 rounded-2xl px-4 py-3 text-sm", TOM_DA_SITUACAO[situacaoDoMes])}
          role="status"
        >
          {situacaoDoMes === "paga"
            ? `A mensalidade de ${nomeDoMes(doMes.competencia)} já foi paga${doMes.pago_em ? ` em ${dataBR(doMes.pago_em)}` : ""}. Obrigado!`
            : situacaoDoMes === "atrasada"
              ? `A mensalidade de ${nomeDoMes(doMes.competencia)} venceu em ${dataBR(doMes.vencimento)}. Se já pagou, desconsidere.`
              : `A mensalidade de ${nomeDoMes(doMes.competencia)} vence em ${dataBR(doMes.vencimento)}: ${reais(totalDa(doMes))}.`}
          {Number(doMes.valor_extra) > 0
            ? ` Inclui ${doMes.creditos_extra} créditos extras do mês anterior (${reais(Number(doMes.valor_extra))}).`
            : ""}
        </p>
      ) : null}

      {dados.cobrancas.length ? (
        <div className="-mx-5 mt-4 overflow-x-auto border-b border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/60 text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-semibold">Mês</th>
                <th className="px-3 py-2 font-semibold">Vencimento</th>
                <th className="px-3 py-2 text-right font-semibold">Valor</th>
                <th className="px-5 py-2 text-right font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {dados.cobrancas.map((c) => {
                const s = situacaoNaTela(c, hoje);
                return (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 capitalize">{nomeDoMes(c.competencia)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{dataBR(c.vencimento)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{reais(totalDa(c))}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          TOM_DA_SITUACAO[s],
                        )}
                      >
                        {ROTULO_DA_SITUACAO[s]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-muted-foreground">
        Dúvidas sobre a mensalidade? Fale com a equipe da Lume pelo chat da Lumis.
      </p>
    </SecaoRecolhivel>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="font-display text-lg font-semibold">{valor}</p>
    </div>
  );
}
