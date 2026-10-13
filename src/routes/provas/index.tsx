import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AnexosDaAula } from "@/components/AnexosDaAula";
import { PageHeader } from "@/components/AppShell";
import { Creditos } from "@/components/CreditosIA";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAcesso } from "@/lib/acesso";
import { useMinhasTurmas } from "@/lib/nuvem";
import { usePerfil } from "@/lib/perfil-store";
import { creditosRestantes, situacaoDoPlano, type SituacaoPlano } from "@/lib/plano-escola";
import type { Anexo } from "@/lib/plano-schema";
import { gerarProva } from "@/lib/prova";
import {
  MAX_DISSERTATIVAS,
  MAX_ALTERNATIVAS_IMPORTADAS,
  MAX_OBJETIVAS,
  alternativasDaProva,
  cabecalhoVazio,
  paraQuestao,
  type DificuldadeDaProva,
  type Prova,
} from "@/lib/prova-schema";
import { criarProva, provasStore, removerProva } from "@/lib/provas-store";
import { XP_PLANO, registrarAtividade } from "@/lib/progresso-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/provas/")({
  head: () => ({
    meta: [
      { title: "Provas com IA | Lume" },
      {
        name: "description",
        content:
          "Anexe o plano de aula ou os slides e a Lumis monta uma prova acessível, pronta para editar e imprimir.",
      },
    ],
  }),
  component: Provas,
});

const NIVEIS: { valor: DificuldadeDaProva; nome: string }[] = [
  { valor: "facil", nome: "Fácil" },
  { valor: "media", nome: "Média" },
  { valor: "dificil", nome: "Difícil" },
  { valor: "misturada", nome: "Misturada" },
];

const cores = ["bg-sky-soft", "bg-leaf-soft", "bg-sun-soft", "bg-lilac-soft", "bg-coral-soft"];

function Provas() {
  const navigate = useNavigate();
  const provas = provasStore.use();
  const turmas = useMinhasTurmas();
  const perfil = usePerfil();
  const { visao } = useAcesso();
  const escola = visao?.tipo === "professor" ? visao.escola : null;
  const escolaNome = visao?.tipo === "professor" ? visao.escolaNome : "";

  const [modo, setModo] = useState<"criar" | "importar">("criar");
  const importar = modo === "importar";
  const [pedido, setPedido] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [serie, setSerie] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [objetivas, setObjetivas] = useState(8);
  const [dissertativas, setDissertativas] = useState(2);
  const [alternativas, setAlternativas] = useState(4);
  const [dificuldade, setDificuldade] = useState<DificuldadeDaProva>("misturada");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [situacao, setSituacao] = useState<SituacaoPlano | null>(null);

  useEffect(() => {
    if (!escola) return;
    situacaoDoPlano(escola)
      .then(setSituacao)
      .catch((e: unknown) => console.error(e));
  }, [escola, carregando]);

  useEffect(() => {
    const [unicaDisciplina] = perfil.disciplinas ?? [];
    const [unicaSerie] = perfil.series ?? [];
    if (perfil.disciplinas?.length === 1 && unicaDisciplina)
      setDisciplina((d) => d || unicaDisciplina);
    if (perfil.series?.length === 1 && unicaSerie) setSerie((v) => v || unicaSerie);
  }, [perfil.disciplinas, perfil.series]);

  const restante = situacao ? creditosRestantes(situacao) : null;
  const semCreditos = restante !== null && restante <= 0;
  const total = importar ? 1 : objetivas + dissertativas;
  const curto = pedido.trim().length < 15 && anexos.length === 0;
  const series = [
    ...new Set([
      ...(perfil.series ?? []),
      ...turmas.map((t) => t.serie).filter((s): s is string => !!s),
    ]),
  ];
  const disciplinas = [
    ...new Set([
      ...(perfil.disciplinas ?? []),
      ...turmas.map((t) => t.disciplina).filter((d): d is string => !!d),
    ]),
  ];

  async function enviar() {
    if (curto || total < 1 || carregando || semCreditos) return;
    setCarregando(true);
    setErro("");
    try {
      const r = await gerarProva(
        {
          modo,
          pedido: pedido.trim(),
          serie: serie.trim(),
          disciplina: disciplina.trim(),
          objetivas,
          dissertativas,
          alternativas,
          dificuldade,
          anexos,
        },
        escola,
      );
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      const anterior = provasStore.get()[0]?.prova.cabecalho;
      const usadas = importar ? MAX_ALTERNATIVAS_IMPORTADAS : alternativas;
      const prova: Prova = {
        titulo: r.prova.titulo,
        alternativas: importar ? alternativasDaProva(r.prova.questoes, alternativas) : alternativas,
        origem: importar
          ? `Prova importada${anexos.length ? ` de: ${anexos.map((a) => a.nome).join(", ")}` : ""}`
          : pedido.trim() || `A partir de: ${anexos.map((a) => a.nome).join(", ")}`,
        cabecalho: {
          ...cabecalhoVazio(),
          escola: anterior?.escola || escolaNome,
          professor:
            anterior?.professor || (perfil.nome && perfil.nome !== "Professora" ? perfil.nome : ""),
          disciplina: disciplina.trim() || r.prova.disciplina,
          serie: serie.trim() || (r.prova.serie === "Não informado" ? "" : r.prova.serie),
          instrucoes: r.prova.instrucoes.join("\n"),
          camposDoAluno: anterior?.camposDoAluno ?? true,
        },
        questoes: r.prova.questoes.map((q) => paraQuestao(q, usadas)),
      };
      const salva = await criarProva(prova);
      registrarAtividade(XP_PLANO);
      void navigate({ to: "/provas/$id", params: { id: salva.id } });
    } catch (e) {
      console.error(e);
      setErro("Não foi possível falar com o servidor. Confira sua internet e tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Provas"
        subtitle="Crie uma prova acessível a partir do seu material, ou importe uma prova pronta para revisar e adaptar para os alunos."
      />

      <form
        className="card-soft p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <div
          role="tablist"
          aria-label="Como montar a prova"
          className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 sm:inline-grid"
        >
          {(
            [
              ["criar", "Criar prova nova"],
              ["importar", "Importar prova pronta"],
            ] as const
          ).map(([valor, nome]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={modo === valor}
              disabled={carregando}
              onClick={() => {
                setModo(valor);
                setErro("");
              }}
              className={cn(
                "cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors sm:text-sm",
                modo === valor
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {nome}
            </button>
          ))}
        </div>

        <label htmlFor="pedido" className="mb-2 block font-display text-sm font-bold">
          {importar ? "Sua prova" : "O que a prova vai cobrar"}
        </label>
        <Textarea
          id="pedido"
          value={pedido}
          onChange={(e) => setPedido(e.target.value)}
          disabled={carregando}
          placeholder={
            importar
              ? "Anexe a prova abaixo (PDF, Word ou foto) ou cole aqui o texto dela. A Lumis copia as questões como estão, sem inventar nada."
              : "Conte o conteúdo da prova (ex.: frações equivalentes e comparação de frações) ou anexe o plano de aula, os slides ou a apostila. Pode dizer também o que quer evitar ou destacar."
          }
          className="min-h-32 resize-y rounded-2xl bg-card text-sm"
        />
        <AnexosDaAula
          anexos={anexos}
          onChange={setAnexos}
          desativado={carregando}
          ajuda={
            importar
              ? "Pode ser o arquivo da prova ou uma foto bem iluminada de cada página. Não envie provas já respondidas ou com nomes de alunos."
              : "A Lumis lê o material e monta as questões. Não envie arquivos com nomes ou dados de alunos."
          }
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Campo id="serie" rotulo="Série">
            <Input
              id="serie"
              list="series-da-escola"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              disabled={carregando}
              placeholder="Ex.: 5º ano"
              maxLength={40}
              className="h-10 rounded-xl bg-card"
            />
            <datalist id="series-da-escola">
              {series.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Campo>
          <Campo id="disciplina" rotulo="Disciplina">
            <Input
              id="disciplina"
              list="disciplinas-da-escola"
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              disabled={carregando}
              placeholder="Ex.: Matemática"
              maxLength={60}
              className="h-10 rounded-xl bg-card"
            />
            <datalist id="disciplinas-da-escola">
              {disciplinas.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Campo>
        </div>

        {importar ? (
          <p className="mt-4 rounded-2xl bg-sky-soft px-4 py-3 text-sm">
            A Lumis transcreve todas as questões na mesma ordem. Se a prova não tiver gabarito, ela
            sugere um para você conferir. Depois é só revisar e criar as versões adaptadas para os
            alunos.
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Contador
                rotulo="Questões objetivas"
                ajuda="Múltipla escolha"
                valor={objetivas}
                maximo={MAX_OBJETIVAS}
                onChange={setObjetivas}
                desativado={carregando}
              />
              <Contador
                rotulo="Questões dissertativas"
                ajuda="Resposta escrita"
                valor={dissertativas}
                maximo={MAX_DISSERTATIVAS}
                onChange={setDissertativas}
                desativado={carregando}
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <Opcoes
                rotulo="Alternativas por questão"
                valor={alternativas}
                opcoes={[3, 4, 5].map((n) => ({ valor: n, nome: String(n) }))}
                onChange={setAlternativas}
                desativado={carregando || objetivas === 0}
              />
              <Opcoes
                rotulo="Dificuldade"
                valor={dificuldade}
                opcoes={NIVEIS}
                onChange={setDificuldade}
                desativado={carregando}
              />
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {total === 0
                ? "Escolha pelo menos uma questão."
                : `A prova terá ${total} ${total === 1 ? "questão" : "questões"}${
                    objetivas && dissertativas
                      ? `: ${objetivas} ${objetivas === 1 ? "objetiva" : "objetivas"} e ${dissertativas} ${dissertativas === 1 ? "dissertativa" : "dissertativas"}`
                      : ""
                  }. Depois você pode editar, trocar o tipo ou pedir outra no lugar de qualquer questão.`}
            </p>
          </>
        )}

        {erro ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        {situacao ? (
          <Creditos
            situacao={situacao}
            restante={restante}
            uso={
              importar
                ? "importar uma prova usa 1"
                : "cada prova usa 1, e refazer questões é grátis"
            }
          />
        ) : null}

        <button
          type="submit"
          disabled={curto || total < 1 || carregando || semCreditos}
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {carregando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />{" "}
              {importar
                ? "Lendo a prova… pode levar até 2 minutos"
                : "Montando a prova… pode levar até 2 minutos"}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> {importar ? "Importar prova" : "Gerar prova com IA"}
            </>
          )}
        </button>
      </form>

      <h2 className="mt-10 mb-4 font-display text-xl font-semibold">Minhas provas</h2>
      {provas.length === 0 ? (
        <div className="card-soft p-6 text-center text-sm text-muted-foreground">
          As provas que você gerar vão aparecer aqui, prontas para editar e imprimir.
        </div>
      ) : (
        <div className="space-y-3">
          {provas.map((p, i) => {
            const n = p.prova.questoes.length;
            return (
              <div key={p.id} className="card-soft flex items-center gap-2 p-2 pr-3">
                <Link
                  to="/provas/$id"
                  params={{ id: p.id }}
                  className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-secondary/60"
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${cores[i % cores.length]}`}
                  >
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm font-bold">
                      {p.prova.titulo || "Prova sem título"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {n} {n === 1 ? "questão" : "questões"}
                      {p.prova.cabecalho.serie ? ` · ${p.prova.cabecalho.serie}` : ""} ·{" "}
                      {new Date(p.criadoEm).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Excluir a prova "${p.prova.titulo || "sem título"}"?`))
                      return;
                    void removerProva(p.id).catch((e: unknown) => {
                      console.error(e);
                      window.alert("Não foi possível excluir a prova. Tente de novo.");
                    });
                  }}
                  aria-label={`Excluir ${p.prova.titulo}`}
                  className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-coral-soft hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {rotulo}
      </label>
      {children}
    </div>
  );
}

function Contador({
  rotulo,
  ajuda,
  valor,
  maximo,
  onChange,
  desativado,
}: {
  rotulo: string;
  ajuda: string;
  valor: number;
  maximo: number;
  onChange: (n: number) => void;
  desativado: boolean;
}) {
  const botao =
    "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{rotulo}</p>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={botao}
          disabled={desativado || valor <= 0}
          onClick={() => onChange(valor - 1)}
          aria-label={`Menos ${rotulo.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-7 text-center font-display text-lg font-semibold" aria-live="polite">
          {valor}
        </span>
        <button
          type="button"
          className={botao}
          disabled={desativado || valor >= maximo}
          onClick={() => onChange(valor + 1)}
          aria-label={`Mais ${rotulo.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Opcoes<T extends string | number>({
  rotulo,
  valor,
  opcoes,
  onChange,
  desativado,
}: {
  rotulo: string;
  valor: T;
  opcoes: { valor: T; nome: string }[];
  onChange: (v: T) => void;
  desativado: boolean;
}) {
  return (
    <fieldset disabled={desativado} className="min-w-0 disabled:opacity-50">
      <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={o.valor === valor}
            onClick={() => onChange(o.valor)}
            className={cn(
              "min-w-11 cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
              o.valor === valor
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {o.nome}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
