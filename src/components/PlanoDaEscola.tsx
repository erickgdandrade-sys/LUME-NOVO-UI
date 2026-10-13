import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  dataRenovacao,
  mudarUsoExtra,
  pedirMaisCreditos,
  situacaoDoPlano,
  textoLimite,
  type SituacaoPlano,
} from "@/lib/plano-escola";
import { cn } from "@/lib/utils";

export function PlanoDaEscola({
  escola,
  comoAdmin = false,
}: {
  escola: string;
  comoAdmin?: boolean;
}) {
  const [situacao, setSituacao] = useState<SituacaoPlano | null>(null);
  const [pedindo, setPedindo] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const carregar = useCallback(() => {
    situacaoDoPlano(escola)
      .then(setSituacao)
      .catch((e: unknown) => console.error(e));
  }, [escola]);
  useEffect(carregar, [carregar]);

  if (!situacao) return null;

  const pctCreditos =
    situacao.creditos_mes === null || situacao.creditos_mes === 0
      ? 0
      : Math.min(100, Math.round((situacao.creditos_usados / situacao.creditos_mes) * 100));
  const pctTurmas =
    situacao.max_turmas === null || situacao.max_turmas === 0
      ? 0
      : Math.min(100, Math.round((situacao.turmas_ativas / situacao.max_turmas) * 100));
  const alerta = pctCreditos >= 80 || pctTurmas >= 100;

  async function enviar() {
    setEnviando(true);
    setAviso(null);
    const r = await pedirMaisCreditos(escola, mensagem);
    setEnviando(false);
    if (!r.ok) return setAviso({ tipo: "erro", texto: r.erro });
    setPedindo(false);
    setMensagem("");
    setAviso({ tipo: "ok", texto: "Pedido enviado. A equipe da Lume vai entrar em contato." });
  }

  return (
    <section className={cn("card-soft mb-6 p-5", alerta && "ring-2 ring-sun")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Plano da escola</p>
          <p className="font-display text-xl font-semibold">{situacao.plano_nome}</p>
        </div>
        {comoAdmin ? null : (
          <button
            type="button"
            onClick={() => setPedindo((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-secondary"
          >
            <Sparkles className="h-3.5 w-3.5" /> Pedir mais créditos ou turmas
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Medidor
          titulo="Créditos de IA neste mês"
          usado={situacao.creditos_usados}
          limite={situacao.creditos_mes}
          pct={pctCreditos}
          rodape={`Renova em ${dataRenovacao(situacao.renova_em)} · cada adaptação da Lumis usa 1`}
        />
        <Medidor
          titulo="Turmas ativas"
          usado={situacao.turmas_ativas}
          limite={situacao.max_turmas}
          pct={pctTurmas}
          rodape="Desative turmas antigas para liberar espaço"
        />
      </div>

      {alerta ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {pctCreditos >= 100
            ? situacao.extra_liberado
              ? "Os créditos do plano acabaram, mas o uso extra está liberado: os professores continuam usando a Lumis."
              : "Os créditos de IA do plano acabaram este mês. Os professores só voltam a usar a Lumis quando renovarem, a não ser que você libere o uso extra."
            : pctCreditos >= 80
              ? `A escola já usou ${pctCreditos}% dos créditos de IA do mês.`
              : "A escola chegou ao limite de turmas ativas do plano."}
        </p>
      ) : null}

      {!comoAdmin && (pctCreditos >= 100 || situacao.extra_liberado) ? (
        <UsoExtra
          escola={escola}
          situacao={situacao}
          onMudou={(texto) => {
            setAviso({ tipo: "ok", texto });
            carregar();
          }}
          onErro={(texto) => setAviso({ tipo: "erro", texto })}
        />
      ) : null}

      {pedindo ? (
        <div className="mt-4 space-y-2">
          <Textarea
            value={mensagem}
            maxLength={1000}
            rows={3}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Conte o que precisa (opcional): mais créditos, mais turmas, outro plano…"
            aria-label="Mensagem para a equipe da Lume"
            className="resize-none rounded-2xl bg-card text-sm"
          />
          <button
            type="button"
            disabled={enviando}
            onClick={() => void enviar()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar pedido
          </button>
        </div>
      ) : null}
      {aviso ? (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-2xl px-4 py-2 text-sm",
            aviso.tipo === "ok" ? "bg-leaf-soft" : "bg-coral-soft",
          )}
        >
          {aviso.texto}
        </p>
      ) : null}
    </section>
  );
}

function Medidor({
  titulo,
  usado,
  limite,
  pct,
  rodape,
}: {
  titulo: string;
  usado: number;
  limite: number | null;
  pct: number;
  rodape: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{titulo}</span>
        <span className="tabular-nums">
          <strong>{usado}</strong> de {textoLimite(limite)}
        </span>
      </div>
      {limite !== null ? (
        <Progress
          value={pct}
          className={cn(
            "mt-2 h-2",
            pct >= 100 ? "[&>*]:bg-coral" : pct >= 80 ? "[&>*]:bg-sun" : "",
          )}
          aria-label={`${titulo}: ${usado} de ${limite}`}
        />
      ) : null}
      <p className="mt-1.5 text-xs text-muted-foreground">{rodape}</p>
    </div>
  );
}

const OPCOES_EXTRA: { valor: number | null; rotulo: string }[] = [
  { valor: 50, rotulo: "Até 50 créditos extras" },
  { valor: 100, rotulo: "Até 100 créditos extras" },
  { valor: 250, rotulo: "Até 250 créditos extras" },
  { valor: null, rotulo: "Sem limite neste mês" },
];

function UsoExtra({
  escola,
  situacao,
  onMudou,
  onErro,
}: {
  escola: string;
  situacao: SituacaoPlano;
  onMudou: (texto: string) => void;
  onErro: (texto: string) => void;
}) {
  const [opcao, setOpcao] = useState(1);
  const [ocupado, setOcupado] = useState(false);
  const escolhida = OPCOES_EXTRA[opcao]!;

  async function mudar(liberar: boolean) {
    setOcupado(true);
    const r = await mudarUsoExtra(escola, liberar, liberar ? escolhida.valor : null);
    setOcupado(false);
    if (!r.ok) return onErro(r.erro);
    onMudou(
      liberar
        ? "Uso extra liberado. Os professores já podem voltar a usar a Lumis."
        : "Uso extra encerrado. A Lumis volta a ficar bloqueada até os créditos renovarem.",
    );
  }

  if (situacao.extra_liberado) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Uso extra liberado neste mês</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {situacao.extra_limite === null
            ? "Sem limite de créditos extras"
            : `Até ${situacao.extra_limite} créditos extras`}
          {situacao.extra_liberado_por ? ` · liberado por ${situacao.extra_liberado_por}` : ""}
          {situacao.extra_liberado_em
            ? ` em ${new Date(situacao.extra_liberado_em).toLocaleDateString("pt-BR")}`
            : ""}
        </p>
        <p className="mt-2 text-sm">
          Créditos extras usados: <strong>{situacao.creditos_extra_usados}</strong>
          {situacao.extra_limite === null ? "" : ` de ${situacao.extra_limite}`} · cobrados à parte
        </p>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void mudar(false)}
          className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Parar uso extra
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-dashed border-border p-4">
      <p className="text-sm font-semibold">Precisa continuar usando a Lumis este mês?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Você pode liberar o uso além do plano. Os créditos extras usados são cobrados à parte.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={opcao}
          onChange={(e) => setOpcao(Number(e.target.value))}
          aria-label="Quantos créditos extras liberar"
          className="h-10 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm"
        >
          {OPCOES_EXTRA.map((o, i) => (
            <option key={o.rotulo} value={i}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={ocupado}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Usar mesmo assim
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Liberar uso extra de IA?</AlertDialogTitle>
              <AlertDialogDescription>
                Os créditos de IA do plano {situacao.plano_nome} acabaram. Ao confirmar, os
                professores voltam a usar a Lumis neste mês (
                {escolhida.valor === null ? "sem limite" : `até ${escolhida.valor} créditos extras`}
                ), e <strong>cada crédito extra usado será cobrado à parte</strong> pela equipe da
                Lume. Você pode parar o uso extra a qualquer momento, e ele termina sozinho quando
                os créditos renovarem, em {dataRenovacao(situacao.renova_em)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void mudar(true)}>
                Liberar e aceitar a cobrança
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
