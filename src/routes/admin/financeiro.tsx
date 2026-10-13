import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { SecaoRecolhivel } from "@/components/SecaoRecolhivel";
import { Input } from "@/components/ui/input";
import {
  FORMAS,
  ROTULO_DA_SITUACAO,
  TOM_DA_SITUACAO,
  dataBR,
  hojeISO,
  mudarMes,
  nomeDoMes,
  primeiroDoMes,
  reais,
  resumoFinanceiro,
  situacaoNaTela,
  totalDa,
  type Cobranca,
  type Contrato,
} from "@/lib/financeiro";
import { lembrarGestor } from "@/lib/lembrete";
import { supabase } from "@/lib/supabase";
import { exigir, useDados } from "@/lib/usar-dados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro | Admin Lume" }] }),
  component: Financeiro,
});

type Escola = { id: string; nome: string; ativa: boolean };

const ROTULO = ROTULO_DA_SITUACAO;
const TOM = TOM_DA_SITUACAO;

const numero = (t: string) => {
  const n = Number(t.replace(/\./g, "").replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};
const comoTexto = (n: number) => String(n).replace(".", ",");

function Financeiro() {
  const hoje = hojeISO();
  const atual = primeiroDoMes(hoje);
  const [mes, setMes] = useState(atual);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const sb = supabase();
    if (mes <= atual) await sb.rpc("gerar_cobrancas", { p_mes: mes });
    const [escolas, contratos, cobrancas] = await Promise.all([
      sb.from("escolas").select("id, nome, ativa").order("nome"),
      sb
        .from("contratos")
        .select(
          "escola, valor_mensal, dia_vencimento, valor_credito_extra, inicio, ativo, observacao",
        ),
      sb
        .from("cobrancas")
        .select(
          "id, escola, competencia, vencimento, valor, creditos_extra, valor_extra, situacao, pago_em, forma, observacao",
        )
        .eq("competencia", mes)
        .order("vencimento"),
    ]);
    return {
      escolas: exigir(escolas) as Escola[],
      contratos: exigir(contratos) as Contrato[],
      cobrancas: (exigir(cobrancas) as Cobranca[]).map((c) => ({
        ...c,
        valor: Number(c.valor),
        valor_extra: Number(c.valor_extra),
      })),
    };
  }, [mes]);

  const nomeDe = (id: string) => dados?.escolas.find((e) => e.id === id)?.nome ?? "Escola";
  const resumo = resumoFinanceiro(dados?.cobrancas ?? [], hoje);
  const semContrato = (dados?.escolas ?? []).filter(
    (e) => e.ativa && !dados?.contratos.some((c) => c.escola === e.id),
  );

  function baixarPlanilha() {
    if (!dados) return;
    const linhas = [
      [
        "Escola",
        "Competência",
        "Vencimento",
        "Mensalidade",
        "Créditos extras",
        "Valor extras",
        "Total",
        "Situação",
        "Pago em",
        "Forma",
      ],
      ...dados.cobrancas.map((c) => [
        nomeDe(c.escola),
        nomeDoMes(c.competencia),
        dataBR(c.vencimento),
        comoTexto(c.valor),
        String(c.creditos_extra),
        comoTexto(c.valor_extra),
        comoTexto(totalDa(c)),
        ROTULO[situacaoNaTela(c, hoje)],
        c.pago_em ? dataBR(c.pago_em) : "",
        c.forma ?? "",
      ]),
    ];
    const csv = linhas.map((l) => l.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(
      new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `mensalidades-${mes.slice(0, 7)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const cartoes = [
    { rotulo: "Previsto no mês", valor: resumo.previsto, tom: "bg-sky-soft" },
    { rotulo: "Recebido", valor: resumo.recebido, tom: "bg-leaf-soft" },
    { rotulo: "A receber", valor: resumo.aReceber, tom: "bg-sun-soft" },
    { rotulo: "Em atraso", valor: resumo.emAtraso, tom: "bg-coral-soft" },
  ];

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Contratos e mensalidades das escolas. As mensalidades do mês são geradas sozinhas a partir dos contratos."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMes((m) => mudarMes(m, -1))}
          aria-label="Mês anterior"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border bg-card hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-40 text-center font-display text-lg font-semibold capitalize">
          {nomeDoMes(mes)}
        </p>
        <button
          type="button"
          onClick={() => setMes((m) => mudarMes(m, 1))}
          aria-label="Próximo mês"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border bg-card hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {mes !== atual ? (
          <button
            type="button"
            onClick={() => setMes(atual)}
            className="text-xs font-semibold text-primary"
          >
            Voltar para este mês
          </button>
        ) : null}
        <span className="flex-1" />
        {mes > atual ? (
          <button
            type="button"
            onClick={() =>
              void supabase()
                .rpc("gerar_cobrancas", { p_mes: mes })
                .then(({ error }) => {
                  setAviso(
                    error
                      ? { ok: false, texto: "Não foi possível gerar as mensalidades." }
                      : { ok: true, texto: `Mensalidades de ${nomeDoMes(mes)} geradas.` },
                  );
                  void recarregar();
                })
            }
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Gerar as deste mês agora
          </button>
        ) : null}
        <button
          type="button"
          onClick={baixarPlanilha}
          disabled={!dados?.cobrancas.length}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Baixar planilha
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="card-soft p-4">
            <span className={`mb-2 block h-1.5 w-8 rounded-full ${c.tom}`} />
            <p className="font-display text-xl font-semibold">{dados ? reais(c.valor) : "…"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.rotulo}</p>
          </div>
        ))}
      </div>

      {aviso ? (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={cn(
            "mb-4 rounded-2xl px-4 py-3 text-sm",
            aviso.ok ? "bg-leaf-soft" : "bg-coral-soft",
          )}
        >
          {aviso.texto}
        </p>
      ) : null}
      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </p>
      ) : null}

      <div className="space-y-4">
        <SecaoRecolhivel
          chave="financeiro-mensalidades"
          titulo={`Mensalidades de ${nomeDoMes(mes)}`}
          resumo={`${dados?.cobrancas.length ?? 0} mensalidades`}
        >
          {dados && dados.cobrancas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {mes > atual
                ? "Este mês ainda não começou. Use “Gerar as deste mês agora” se quiser adiantar."
                : "Nenhuma mensalidade neste mês. Cadastre os contratos das escolas abaixo."}
            </p>
          ) : (
            <ul className="space-y-3">
              {dados?.cobrancas.map((c) => (
                <LinhaCobranca
                  key={c.id}
                  cobranca={c}
                  escola={nomeDe(c.escola)}
                  hoje={hoje}
                  onResultado={(r) => {
                    setAviso(r);
                    void recarregar();
                  }}
                />
              ))}
            </ul>
          )}
        </SecaoRecolhivel>

        <SecaoRecolhivel
          chave="financeiro-contratos"
          titulo="Contratos das escolas"
          resumo={
            semContrato.length
              ? `${semContrato.length} ${semContrato.length === 1 ? "escola ativa sem contrato" : "escolas ativas sem contrato"}`
              : "Todas as escolas ativas têm contrato"
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">
            O valor de cada crédito extra é cobrado na mensalidade do mês seguinte ao uso. Mudanças
            valem para as próximas mensalidades.
          </p>
          <ul className="space-y-3">
            {(dados?.escolas ?? [])
              .filter((e) => e.ativa || dados?.contratos.some((c) => c.escola === e.id))
              .map((e) => (
                <LinhaContrato
                  key={e.id}
                  escola={e}
                  contrato={dados?.contratos.find((c) => c.escola === e.id) ?? null}
                  mesAtual={atual}
                  onSalvo={(texto) => {
                    setAviso({ ok: true, texto });
                    void recarregar();
                  }}
                />
              ))}
          </ul>
        </SecaoRecolhivel>
      </div>
    </div>
  );
}

const botao =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";

function LinhaCobranca({
  cobranca: c,
  escola,
  hoje,
  onResultado,
}: {
  cobranca: Cobranca;
  escola: string;
  hoje: string;
  onResultado: (r: { ok: boolean; texto: string }) => void;
}) {
  const [modo, setModo] = useState<"ver" | "pagar" | "editar">("ver");
  const [pagoEm, setPagoEm] = useState(hoje);
  const [forma, setForma] = useState(FORMAS[0]!);
  const [valor, setValor] = useState(comoTexto(c.valor));
  const [valorExtra, setValorExtra] = useState(comoTexto(c.valor_extra));
  const [vencimento, setVencimento] = useState(c.vencimento);
  const [ocupado, setOcupado] = useState(false);
  const situacao = situacaoNaTela(c, hoje);

  async function salvar(parte: Partial<Cobranca>, ok: string) {
    setOcupado(true);
    const { error } = await supabase().from("cobrancas").update(parte).eq("id", c.id);
    setOcupado(false);
    setModo("ver");
    onResultado(error ? { ok: false, texto: "Não foi possível salvar." } : { ok: true, texto: ok });
  }

  function editar(e: FormEvent) {
    e.preventDefault();
    const v = numero(valor);
    const x = numero(valorExtra);
    if (v === null || x === null || !vencimento) {
      onResultado({ ok: false, texto: "Confira os valores e a data." });
      return;
    }
    void salvar({ valor: v, valor_extra: x, vencimento }, "Mensalidade atualizada.");
  }

  return (
    <li className="rounded-2xl border border-border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{escola}</p>
          <p className="text-xs text-muted-foreground">
            Mensalidade {reais(c.valor)}
            {c.valor_extra > 0
              ? ` + ${c.creditos_extra} créditos extras (${reais(c.valor_extra)})`
              : ""}
            {" · "}vence em {dataBR(c.vencimento)}
            {c.situacao === "paga" && c.pago_em
              ? ` · paga em ${dataBR(c.pago_em)}${c.forma ? ` (${c.forma})` : ""}`
              : ""}
          </p>
        </div>
        <p className="font-display text-base font-semibold tabular-nums">{reais(totalDa(c))}</p>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", TOM[situacao])}>
          {ROTULO[situacao]}
        </span>
      </div>

      {modo === "pagar" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void salvar(
              { situacao: "paga", pago_em: pagoEm, forma },
              `${escola}: pagamento registrado.`,
            );
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <label className="text-xs font-semibold text-muted-foreground">
            Pago em
            <Input
              type="date"
              value={pagoEm}
              max={hoje}
              onChange={(e) => setPagoEm(e.target.value)}
              className="mt-1 h-9 w-40 rounded-xl bg-card"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Forma
            <select
              value={forma}
              onChange={(e) => setForma(e.target.value)}
              className="mt-1 block h-9 rounded-xl border border-input bg-card px-3 text-sm"
            >
              {FORMAS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5" /> Confirmar
          </button>
          <button type="button" onClick={() => setModo("ver")} className={botao}>
            Cancelar
          </button>
        </form>
      ) : null}

      {modo === "editar" ? (
        <form onSubmit={editar} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Mensalidade (R$)
            <Input
              value={valor}
              inputMode="decimal"
              onChange={(e) => setValor(e.target.value)}
              className="mt-1 h-9 w-32 rounded-xl bg-card"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Extras (R$)
            <Input
              value={valorExtra}
              inputMode="decimal"
              onChange={(e) => setValorExtra(e.target.value)}
              className="mt-1 h-9 w-28 rounded-xl bg-card"
            />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Vencimento
            <Input
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
              className="mt-1 h-9 w-40 rounded-xl bg-card"
            />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex h-9 cursor-pointer items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            Salvar
          </button>
          <button type="button" onClick={() => setModo("ver")} className={botao}>
            Cancelar
          </button>
        </form>
      ) : null}

      {modo === "ver" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.situacao === "pendente" ? (
            <>
              <button
                type="button"
                className={botao}
                disabled={ocupado}
                onClick={() => setModo("pagar")}
              >
                <Check className="h-3.5 w-3.5" /> Marcar como paga
              </button>
              <button
                type="button"
                className={botao}
                disabled={ocupado}
                onClick={() => {
                  setOcupado(true);
                  void lembrarGestor(c.id).then((r) => {
                    setOcupado(false);
                    onResultado(
                      r.ok ? { ok: true, texto: r.mensagem } : { ok: false, texto: r.erro },
                    );
                  });
                }}
              >
                <Send className="h-3.5 w-3.5" /> Lembrete ao gestor
              </button>
              <button
                type="button"
                className={botao}
                disabled={ocupado}
                onClick={() => setModo("editar")}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                type="button"
                className={cn(botao, "hover:bg-coral-soft")}
                disabled={ocupado}
                onClick={() => {
                  if (
                    window.confirm(
                      `Cancelar a mensalidade de ${escola}? Ela deixa de contar no previsto.`,
                    )
                  ) {
                    void salvar({ situacao: "cancelada" }, "Mensalidade cancelada.");
                  }
                }}
              >
                <Ban className="h-3.5 w-3.5" /> Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              className={botao}
              disabled={ocupado}
              onClick={() =>
                void salvar(
                  { situacao: "pendente", pago_em: null, forma: null },
                  "Voltou para pendente.",
                )
              }
            >
              <RotateCcw className="h-3.5 w-3.5" />{" "}
              {c.situacao === "paga" ? "Desfazer pagamento" : "Reativar"}
            </button>
          )}
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin self-center" /> : null}
        </div>
      ) : null}
    </li>
  );
}

function LinhaContrato({
  escola,
  contrato,
  mesAtual,
  onSalvo,
}: {
  escola: Escola;
  contrato: Contrato | null;
  mesAtual: string;
  onSalvo: (texto: string) => void;
}) {
  const [valor, setValor] = useState(contrato ? comoTexto(Number(contrato.valor_mensal)) : "");
  const [dia, setDia] = useState(String(contrato?.dia_vencimento ?? 10));
  const [extra, setExtra] = useState(
    contrato ? comoTexto(Number(contrato.valor_credito_extra)) : "",
  );
  const [inicio, setInicio] = useState(contrato?.inicio ?? mesAtual);
  const [ativo, setAtivo] = useState(contrato?.ativo ?? true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const v = numero(valor);
    const x = numero(extra || "0");
    const d = Number(dia);
    if (v === null || x === null || !Number.isInteger(d) || d < 1 || d > 28) {
      setErro("Confira os valores. O dia de vencimento vai de 1 a 28.");
      return;
    }
    setOcupado(true);
    setErro("");
    const dadosContrato = {
      valor_mensal: v,
      dia_vencimento: d,
      valor_credito_extra: x,
      inicio: primeiroDoMes(inicio),
      ativo,
    };
    const { error } = contrato
      ? await supabase().from("contratos").update(dadosContrato).eq("escola", escola.id)
      : await supabase()
          .from("contratos")
          .insert({ escola: escola.id, ...dadosContrato });
    setOcupado(false);
    if (error) {
      console.error(error.message);
      return setErro("Não foi possível salvar o contrato.");
    }
    onSalvo(`Contrato da ${escola.nome} salvo.`);
  }

  return (
    <li className={cn("rounded-2xl border border-border p-3", !contrato && "border-dashed")}>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold">
        {escola.nome}
        {!contrato ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-semibold">
            <AlertCircle className="h-3 w-3" /> Sem contrato
          </span>
        ) : null}
        {escola.ativa ? null : (
          <span className="text-xs font-normal text-muted-foreground">(escola inativa)</span>
        )}
      </p>
      <form onSubmit={(e) => void salvar(e)} className="flex flex-wrap items-end gap-2" noValidate>
        <label className="text-xs font-semibold text-muted-foreground">
          Mensalidade (R$)
          <Input
            value={valor}
            inputMode="decimal"
            placeholder="Ex.: 890,00"
            onChange={(e) => setValor(e.target.value)}
            className="mt-1 h-9 w-32 rounded-xl bg-card"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Vence no dia
          <Input
            value={dia}
            inputMode="numeric"
            onChange={(e) => setDia(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="mt-1 h-9 w-20 rounded-xl bg-card"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Crédito extra (R$ cada)
          <Input
            value={extra}
            inputMode="decimal"
            placeholder="Ex.: 0,50"
            onChange={(e) => setExtra(e.target.value)}
            className="mt-1 h-9 w-32 rounded-xl bg-card"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Cobrar a partir de
          <Input
            type="month"
            value={inicio.slice(0, 7)}
            onChange={(e) => setInicio(`${e.target.value}-01`)}
            className="mt-1 h-9 w-40 rounded-xl bg-card"
          />
        </label>
        <label className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Cobrando
        </label>
        <button
          type="submit"
          disabled={ocupado}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {contrato ? "Salvar" : "Cadastrar contrato"}
        </button>
      </form>
      {erro ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
    </li>
  );
}
