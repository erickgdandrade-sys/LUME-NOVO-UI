import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileDown,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { FolhaDaProva, type ModoDeImpressao } from "@/components/FolhaDaProva";
import { VersoesDaProva } from "@/components/VersoesDaProva";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAcesso } from "@/lib/acesso";
import { useCabecalhoDaEscola } from "@/lib/escola-dados";
import { useAlunos } from "@/lib/alunos-store";
import { useEstadoNuvem, useMinhasTurmas } from "@/lib/nuvem";
import { refazerQuestao } from "@/lib/prova";
import { baixarArquivo, provaParaDocx } from "@/lib/prova-docx";
import {
  DIFICULDADES,
  LETRAS,
  NOME_DIFICULDADE,
  dividirValor,
  formatarValor,
  linhasPadrao,
  nomeArquivo,
  numero,
  questaoEmBranco,
  type Cabecalho,
  type Prova,
  type Questao,
  type TipoQuestao,
  type VersaoAdaptada,
} from "@/lib/prova-schema";
import { provasStore, salvarProva } from "@/lib/provas-store";
import { contasReais } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/provas/$id")({
  head: () => ({ meta: [{ title: "Editar prova | Lume" }] }),
  component: PaginaDaProva,
});

type Salvamento = "salvo" | "salvando" | "erro";

function PaginaDaProva() {
  const { id } = Route.useParams();
  const salva = provasStore.use().find((p) => p.id === id);
  const estado = useEstadoNuvem();

  if (!salva) {
    const carregando = contasReais && estado.situacao !== "pronta" && estado.situacao !== "erro";
    return (
      <div className="card-soft p-8 text-center">
        {carregando ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <p className="font-display text-lg font-bold">Prova não encontrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ela pode ter sido excluída. Volte para a lista de provas.
            </p>
            <Link to="/provas" className="mt-4 inline-flex text-sm font-semibold text-primary">
              Ver minhas provas →
            </Link>
          </>
        )}
      </div>
    );
  }
  return <Editor key={id} id={id} inicial={salva.prova} />;
}

function Editor({ id, inicial }: { id: string; inicial: Prova }) {
  const [prova, setProva] = useState<Prova>(inicial);
  const [salvamento, setSalvamento] = useState<Salvamento>("salvo");
  const [gabarito, setGabarito] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [modo, setModo] = useState<ModoDeImpressao>("prova");
  const [versaoImpressa, setVersaoImpressa] = useState<VersaoAdaptada | null>(null);
  const alunos = useAlunos();
  const nomeDe = (v: VersaoAdaptada | null) =>
    v ? (alunos.find((a) => a.id === v.alunoId)?.nome ?? "") : "";
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeira = useRef(true);
  const { visao } = useAcesso();
  const escola = visao?.tipo === "professor" ? visao.escola : null;
  const cabecalhoDaEscola = useCabecalhoDaEscola(escola);
  const turmas = useMinhasTurmas();

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    setSalvamento("salvando");
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      salvarProva(id, prova)
        .then(() => setSalvamento("salvo"))
        .catch((e: unknown) => {
          console.error(e);
          setSalvamento("erro");
        });
    }, 900);
  }, [id, prova]);

  useEffect(() => {
    const voltar = () => {
      setModo("prova");
      setVersaoImpressa(null);
    };
    window.addEventListener("afterprint", voltar);
    return () => window.removeEventListener("afterprint", voltar);
  }, []);

  const mudar = (f: (p: Prova) => Prova) => setProva((p) => f(p));
  const mudarCabecalho = (parte: Partial<Cabecalho>) =>
    mudar((p) => ({ ...p, cabecalho: { ...p.cabecalho, ...parte } }));
  const mudarQuestao = (qid: string, parte: Partial<Questao>) =>
    mudar((p) => ({
      ...p,
      questoes: p.questoes.map((q) => (q.id === qid ? { ...q, ...parte } : q)),
    }));

  function mover(qid: string, passo: -1 | 1) {
    mudar((p) => {
      const i = p.questoes.findIndex((q) => q.id === qid);
      const j = i + passo;
      if (i < 0 || j < 0 || j >= p.questoes.length) return p;
      const questoes = [...p.questoes];
      [questoes[i], questoes[j]] = [questoes[j]!, questoes[i]!];
      return { ...p, questoes };
    });
  }

  function apagar(qid: string, n: number) {
    if (!window.confirm(`Apagar a questão ${n}?`)) return;
    mudar((p) => ({ ...p, questoes: p.questoes.filter((q) => q.id !== qid) }));
  }

  function adicionar(tipo: TipoQuestao) {
    const nova = questaoEmBranco(tipo, prova.alternativas);
    mudar((p) => ({ ...p, questoes: [...p.questoes, nova] }));
    setEditando(nova.id);
  }

  async function pedirALumis(q: Questao, acao: "trocar_tipo" | "outra") {
    if (ocupada) return;
    setOcupada(q.id);
    setErros((e) => ({ ...e, [q.id]: "" }));
    try {
      const r = await refazerQuestao(
        {
          acao,
          questao: {
            tipo: q.tipo,
            enunciado: q.enunciado.slice(0, 4000),
            alternativas: q.alternativas.slice(0, 6).map((a) => a.slice(0, 1000)),
            correta: q.correta,
            resposta: q.resposta.slice(0, 4000),
            dificuldade: q.dificuldade,
            habilidade: q.habilidade.slice(0, 300),
          },
          titulo: prova.titulo.slice(0, 200),
          disciplina: prova.cabecalho.disciplina.slice(0, 60),
          serie: prova.cabecalho.serie.slice(0, 40),
          alternativas: prova.alternativas,
          outras: prova.questoes
            .filter((o) => o.id !== q.id && o.enunciado.trim())
            .slice(0, 30)
            .map((o) => o.enunciado.slice(0, 600)),
        },
        escola,
      );
      if (!r.ok) {
        setErros((e) => ({ ...e, [q.id]: r.erro }));
        return;
      }
      mudarQuestao(q.id, {
        ...r.questao,
        linhas: r.questao.tipo === q.tipo ? q.linhas : linhasPadrao(r.questao.dificuldade),
      });
    } finally {
      setOcupada(null);
    }
  }

  function dividir() {
    const total = numero(prova.cabecalho.valorTotal);
    if (total === null || !prova.questoes.length) return;
    const valores = dividirValor(total, prova.questoes.length);
    mudar((p) => ({
      ...p,
      questoes: p.questoes.map((q, i) => ({ ...q, valor: valores[i] ?? 0 })),
    }));
  }

  function imprimir(m: ModoDeImpressao, versao: VersaoAdaptada | null = null) {
    setEditando(null);
    setModo(m);
    setVersaoImpressa(versao);
    setTimeout(() => window.print(), 80);
  }

  function baixarWord(m: ModoDeImpressao, versao: VersaoAdaptada | null = null) {
    const nome = nomeDe(versao);
    const extra = [m === "gabarito" ? "gabarito" : "", versao ? nome || "versao adaptada" : ""]
      .filter(Boolean)
      .join(" - ");
    baixarArquivo(
      provaParaDocx(prova, m, versao ?? undefined, nome, cabecalhoDaEscola),
      `${nomeArquivo(prova.titulo, extra)}.docx`,
    );
  }

  const objetivas = prova.questoes.filter((q) => q.tipo === "objetiva").length;
  const soma = prova.questoes.reduce((s, q) => s + (q.valor ?? 0), 0);
  const comValor = prova.questoes.some((q) => q.valor !== null);
  const total = numero(prova.cabecalho.valorTotal);

  return (
    <>
      <div className="print:hidden">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Link
            to="/provas"
            aria-label="Voltar para as provas"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <label htmlFor="titulo" className="sr-only">
              Título da prova
            </label>
            <input
              id="titulo"
              value={prova.titulo}
              onChange={(e) => mudar((p) => ({ ...p, titulo: e.target.value.slice(0, 200) }))}
              placeholder="Título da prova"
              className="w-full rounded-xl bg-transparent px-1 font-display text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-2xl"
            />
            <p className="px-1 text-xs text-muted-foreground" aria-live="polite">
              {salvamento === "salvando"
                ? "Salvando…"
                : salvamento === "erro"
                  ? "Não foi possível salvar. Confira sua internet."
                  : "Todas as mudanças estão salvas"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => imprimir("prova")}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Printer className="h-4 w-4" /> Imprimir prova
            </button>
            <button
              type="button"
              onClick={() => imprimir("gabarito")}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              <FileCheck2 className="h-4 w-4" /> Imprimir gabarito
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent">
                <FileDown className="h-4 w-4" /> Baixar em Word{" "}
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg"
                  onSelect={() => baixarWord("prova")}
                >
                  Prova
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg"
                  onSelect={() => baixarWord("gabarito")}
                >
                  Gabarito
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <EditorDoCabecalho
          cabecalho={prova.cabecalho}
          turmas={turmas.map((t) => t.nome)}
          escolaFixa={cabecalhoDaEscola?.nome ?? null}
          onChange={mudarCabecalho}
        />

        <div className="mt-8 mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Questões</h2>
            <p className="text-sm text-muted-foreground">
              {prova.questoes.length} {prova.questoes.length === 1 ? "questão" : "questões"} ·{" "}
              {objetivas} {objetivas === 1 ? "objetiva" : "objetivas"} ·{" "}
              {prova.questoes.length - objetivas}{" "}
              {prova.questoes.length - objetivas === 1 ? "dissertativa" : "dissertativas"}
              {comValor ? ` · soma dos valores: ${formatarValor(soma)}` : ""}
              {comValor && total !== null && Math.abs(total - soma) > 0.001 ? (
                <span className="font-semibold text-destructive">
                  {" "}
                  (o valor da prova é {formatarValor(total)})
                </span>
              ) : null}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={gabarito}
              onChange={(e) => setGabarito(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Mostrar respostas
          </label>
        </div>

        <ol className="space-y-4">
          {prova.questoes.map((q, i) => (
            <CartaoDaQuestao
              key={q.id}
              q={q}
              n={i + 1}
              primeira={i === 0}
              ultima={i === prova.questoes.length - 1}
              editando={editando === q.id}
              gabarito={gabarito}
              ocupada={ocupada === q.id}
              bloqueada={ocupada !== null && ocupada !== q.id}
              erro={erros[q.id] ?? ""}
              onEditar={(sim) => setEditando(sim ? q.id : null)}
              onChange={(parte) => mudarQuestao(q.id, parte)}
              onMover={(passo) => mover(q.id, passo)}
              onApagar={() => apagar(q.id, i + 1)}
              onLumis={(acao) => void pedirALumis(q, acao)}
            />
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => adicionar("objetiva")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Questão objetiva
          </button>
          <button
            type="button"
            onClick={() => adicionar("dissertativa")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Questão dissertativa
          </button>
          {total !== null && prova.questoes.length ? (
            <button
              type="button"
              onClick={dividir}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              Dividir {formatarValor(total)} pontos entre as questões
            </button>
          ) : null}
        </div>

        <VersoesDaProva
          prova={prova}
          escola={escola}
          onMudar={(versoes) => mudar((p) => ({ ...p, versoes }))}
          onImprimir={(m, v) => imprimir(m, v)}
          onWord={(m, v) => baixarWord(m, v)}
        />
      </div>

      <div className="hidden print:block">
        <FolhaDaProva
          prova={prova}
          modo={modo}
          versao={versaoImpressa ?? undefined}
          nome={nomeDe(versaoImpressa)}
          escola={modo === "prova" ? cabecalhoDaEscola : null}
        />
      </div>
    </>
  );
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {rotulo}
      </label>
      {children}
    </div>
  );
}

const campo = "h-10 rounded-xl bg-card";

function EditorDoCabecalho({
  cabecalho: c,
  turmas,
  escolaFixa,
  onChange,
}: {
  cabecalho: Cabecalho;
  turmas: string[];
  escolaFixa: string | null;
  onChange: (parte: Partial<Cabecalho>) => void;
}) {
  const texto = (chave: keyof Cabecalho, max: number) => ({
    value: c[chave] as string,
    onChange: (e: { target: { value: string } }) =>
      onChange({ [chave]: e.target.value.slice(0, max) }),
  });
  return (
    <section className="card-soft p-5" aria-labelledby="titulo-cabecalho">
      <h2 id="titulo-cabecalho" className="font-display text-base font-semibold">
        Cabeçalho
      </h2>
      <p className="text-xs text-muted-foreground">
        O que aparece no topo da folha. A escola e o professor ficam salvos para as próximas provas.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo id="c-escola" rotulo={escolaFixa ? "Escola (cabeçalho da gestão)" : "Escola"}>
          {escolaFixa ? (
            <Input id="c-escola" className={campo} value={escolaFixa} disabled readOnly />
          ) : (
            <Input id="c-escola" className={campo} {...texto("escola", 120)} />
          )}
        </Campo>
        <Campo id="c-professor" rotulo="Professor(a)">
          <Input id="c-professor" className={campo} {...texto("professor", 80)} />
        </Campo>
        <Campo id="c-disciplina" rotulo="Disciplina">
          <Input id="c-disciplina" className={campo} {...texto("disciplina", 60)} />
        </Campo>
        <Campo id="c-turma" rotulo="Turma">
          <Input
            id="c-turma"
            list="turmas-do-professor"
            className={campo}
            {...texto("turma", 60)}
          />
          <datalist id="turmas-do-professor">
            {turmas.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Campo>
        <Campo id="c-serie" rotulo="Série">
          <Input id="c-serie" className={campo} {...texto("serie", 40)} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo id="c-data" rotulo="Data">
            <Input
              id="c-data"
              placeholder="Em branco na folha"
              className={campo}
              {...texto("data", 20)}
            />
          </Campo>
          <Campo id="c-valor" rotulo="Valor da prova">
            <Input
              id="c-valor"
              inputMode="decimal"
              placeholder="Ex.: 10"
              className={campo}
              {...texto("valorTotal", 10)}
            />
          </Campo>
        </div>
      </div>
      <div className="mt-3">
        <Campo id="c-instrucoes" rotulo="Instruções para o aluno (uma por linha)">
          <Textarea
            id="c-instrucoes"
            className="min-h-24 rounded-xl bg-card text-sm"
            {...texto("instrucoes", 1500)}
          />
        </Campo>
      </div>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={c.camposDoAluno}
          onChange={(e) => onChange({ camposDoAluno: e.target.checked })}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Espaço para nome, data e nota do aluno
      </label>
    </section>
  );
}

const botaoPequeno =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";
const botaoIcone =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30";

function CartaoDaQuestao({
  q,
  n,
  primeira,
  ultima,
  editando,
  gabarito,
  ocupada,
  bloqueada,
  erro,
  onEditar,
  onChange,
  onMover,
  onApagar,
  onLumis,
}: {
  q: Questao;
  n: number;
  primeira: boolean;
  ultima: boolean;
  editando: boolean;
  gabarito: boolean;
  ocupada: boolean;
  bloqueada: boolean;
  erro: string;
  onEditar: (sim: boolean) => void;
  onChange: (parte: Partial<Questao>) => void;
  onMover: (passo: -1 | 1) => void;
  onApagar: () => void;
  onLumis: (acao: "trocar_tipo" | "outra") => void;
}) {
  const objetiva = q.tipo === "objetiva";
  return (
    <li className={cn("card-soft p-5", ocupada && "opacity-70")} aria-busy={ocupada}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
          {n}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            objetiva ? "bg-sky-soft" : "bg-lilac-soft",
          )}
        >
          {objetiva ? "Objetiva" : "Dissertativa"}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
          {NOME_DIFICULDADE[q.dificuldade]}
        </span>
        {q.valor !== null ? (
          <span className="rounded-full bg-sun-soft px-2.5 py-1 text-xs font-semibold">
            {formatarValor(q.valor)} {q.valor > 0 && q.valor <= 1 ? "ponto" : "pontos"}
          </span>
        ) : null}
        <span className="ml-auto flex items-center">
          <button
            type="button"
            className={botaoIcone}
            disabled={primeira || ocupada}
            onClick={() => onMover(-1)}
            aria-label={`Subir a questão ${n}`}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={botaoIcone}
            disabled={ultima || ocupada}
            onClick={() => onMover(1)}
            aria-label={`Descer a questão ${n}`}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(botaoIcone, "hover:bg-coral-soft")}
            disabled={ocupada}
            onClick={onApagar}
            aria-label={`Apagar a questão ${n}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>

      {editando ? (
        <EdicaoDaQuestao q={q} n={n} onChange={onChange} />
      ) : (
        <VisaoDaQuestao q={q} gabarito={gabarito} />
      )}

      {erro ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl bg-coral-soft px-3 py-2 text-xs"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erro}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            botaoPequeno,
            editando && "border-primary bg-primary text-primary-foreground hover:bg-primary",
          )}
          disabled={ocupada}
          onClick={() => onEditar(!editando)}
        >
          {editando ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editando ? "Pronto" : "Editar"}
        </button>
        <button
          type="button"
          className={botaoPequeno}
          disabled={ocupada || bloqueada || !q.enunciado.trim()}
          onClick={() => onLumis("trocar_tipo")}
        >
          {ocupada ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Repeat className="h-3.5 w-3.5" />
          )}
          Trocar para {objetiva ? "dissertativa" : "objetiva"}
        </button>
        <button
          type="button"
          className={botaoPequeno}
          disabled={ocupada || bloqueada || !q.enunciado.trim()}
          onClick={() => onLumis("outra")}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Gerar outra no lugar
        </button>
      </div>
    </li>
  );
}

function VisaoDaQuestao({ q, gabarito }: { q: Questao; gabarito: boolean }) {
  return (
    <div className="mt-3">
      <p className="text-sm whitespace-pre-wrap">
        {q.enunciado || <span className="text-muted-foreground">Questão sem enunciado.</span>}
      </p>
      {q.tipo === "objetiva" ? (
        <ol className="mt-3 space-y-1.5">
          {q.alternativas.map((a, i) => {
            const certa = gabarito && i === q.correta;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
                  certa ? "bg-leaf-soft font-semibold" : "bg-secondary/60",
                )}
              >
                <span className="font-semibold">{LETRAS[i]})</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap">{a}</span>
                {certa ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-label="Correta" /> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {q.linhas} {q.linhas === 1 ? "linha" : "linhas"} para a resposta
        </p>
      )}
      {gabarito && (q.resposta || q.habilidade) ? (
        <div className="mt-3 rounded-xl bg-sun-soft px-3 py-2 text-sm">
          {q.resposta ? (
            <p className="whitespace-pre-wrap">
              <strong>{q.tipo === "objetiva" ? "Por quê: " : "Resposta esperada: "}</strong>
              {q.resposta}
            </p>
          ) : null}
          {q.habilidade ? (
            <p className="mt-1 text-xs text-muted-foreground">Avalia: {q.habilidade}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EdicaoDaQuestao({
  q,
  n,
  onChange,
}: {
  q: Questao;
  n: number;
  onChange: (parte: Partial<Questao>) => void;
}) {
  const objetiva = q.tipo === "objetiva";
  const p = `q${n}`;
  return (
    <div className="mt-4 space-y-4">
      <Campo id={`${p}-enunciado`} rotulo="Enunciado">
        <Textarea
          id={`${p}-enunciado`}
          value={q.enunciado}
          onChange={(e) => onChange({ enunciado: e.target.value.slice(0, 4000) })}
          className="min-h-28 rounded-xl bg-card text-sm"
          autoFocus
        />
      </Campo>

      {objetiva ? (
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-muted-foreground">
            Alternativas (marque a correta)
          </legend>
          <div className="space-y-2">
            {q.alternativas.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${p}-correta`}
                  checked={q.correta === i}
                  onChange={() => onChange({ correta: i })}
                  aria-label={`Alternativa ${LETRAS[i]} é a correta`}
                  className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="w-5 shrink-0 text-sm font-semibold">{LETRAS[i]})</span>
                <Input
                  value={a}
                  onChange={(e) =>
                    onChange({
                      alternativas: q.alternativas.map((x, j) =>
                        j === i ? e.target.value.slice(0, 1000) : x,
                      ),
                    })
                  }
                  aria-label={`Texto da alternativa ${LETRAS[i]}`}
                  className={campo}
                />
                <button
                  type="button"
                  className={botaoIcone}
                  disabled={q.alternativas.length <= 2}
                  onClick={() =>
                    onChange({
                      alternativas: q.alternativas.filter((_, j) => j !== i),
                      correta: q.correta === i ? 0 : q.correta > i ? q.correta - 1 : q.correta,
                    })
                  }
                  aria-label={`Tirar a alternativa ${LETRAS[i]}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {q.alternativas.length < LETRAS.length ? (
            <button
              type="button"
              className={cn(botaoPequeno, "mt-2")}
              onClick={() => onChange({ alternativas: [...q.alternativas, ""] })}
            >
              <Plus className="h-3.5 w-3.5" /> Alternativa
            </button>
          ) : null}
        </fieldset>
      ) : null}

      <Campo
        id={`${p}-resposta`}
        rotulo={
          objetiva
            ? "Por que a correta está certa (gabarito)"
            : "Resposta esperada e critérios de correção"
        }
      >
        <Textarea
          id={`${p}-resposta`}
          value={q.resposta}
          onChange={(e) => onChange({ resposta: e.target.value.slice(0, 4000) })}
          className="min-h-20 rounded-xl bg-card text-sm"
        />
      </Campo>

      <div className="grid gap-3 sm:grid-cols-3">
        <Campo id={`${p}-dificuldade`} rotulo="Dificuldade">
          <select
            id={`${p}-dificuldade`}
            value={q.dificuldade}
            onChange={(e) => onChange({ dificuldade: e.target.value as Questao["dificuldade"] })}
            className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            {DIFICULDADES.map((d) => (
              <option key={d} value={d}>
                {NOME_DIFICULDADE[d]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id={`${p}-valor`} rotulo="Valor (pontos)">
          <Input
            id={`${p}-valor`}
            inputMode="decimal"
            placeholder="Sem valor"
            defaultValue={q.valor === null ? "" : formatarValor(q.valor)}
            onChange={(e) => onChange({ valor: numero(e.target.value) })}
            className={campo}
          />
        </Campo>
        {objetiva ? (
          <Campo id={`${p}-habilidade`} rotulo="O que avalia">
            <Input
              id={`${p}-habilidade`}
              value={q.habilidade}
              onChange={(e) => onChange({ habilidade: e.target.value.slice(0, 300) })}
              className={campo}
            />
          </Campo>
        ) : (
          <Campo id={`${p}-linhas`} rotulo="Linhas para a resposta">
            <Input
              id={`${p}-linhas`}
              type="number"
              min={1}
              max={30}
              value={q.linhas}
              onChange={(e) =>
                onChange({ linhas: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })
              }
              className={campo}
            />
          </Campo>
        )}
      </div>
    </div>
  );
}
