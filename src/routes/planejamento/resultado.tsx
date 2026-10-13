import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardCheck,
  Clock,
  FileDown,
  Layers,
  Lightbulb,
  Link2,
  ListOrdered,
  Loader2,
  Package,
  Pencil,
  PencilLine,
  Plus,
  Printer,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { FolhaDaAtividade } from "@/components/FolhaDaAtividade";
import { ItemDaAtividade } from "@/components/ItemDaAtividade";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAcesso } from "@/lib/acesso";
import { useCabecalhoDaEscola } from "@/lib/escola-dados";
import { perfilAnonimoDe, useAlunos } from "@/lib/alunos-store";
import { folhaParaDocx, folhasDoPlano, type FolhaAtividade } from "@/lib/folha-atividade";
import { useEstadoNuvem } from "@/lib/nuvem";
import { refazerParteDoPlano } from "@/lib/plano-partes";
import {
  completarPlano,
  planoExemplo,
  planoOriginalExemplo,
  type ParteDoPlano,
  type PlanoAdaptado,
} from "@/lib/plano-schema";
import { atualizarPlano, planosStore } from "@/lib/planos-store";
import { baixarArquivo } from "@/lib/prova-docx";
import { nomeArquivo } from "@/lib/prova-schema";
import { contasReais } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Busca = { id?: string };

export const Route = createFileRoute("/planejamento/resultado")({
  validateSearch: (search: Record<string, unknown>): Busca =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "Resultado da adaptação com IA | Lume" },
      {
        name: "description",
        content:
          "Veja o plano de aula adaptado: objetivos, estratégias inclusivas, barreiras possíveis e recursos complementares.",
      },
    ],
  }),
  component: Resultado,
});

const tonsAdaptacao = [
  "bg-leaf-soft",
  "bg-coral-soft",
  "bg-sky-soft",
  "bg-lilac-soft",
  "bg-sun-soft",
];

const botaoPequeno =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 print:hidden";

function Secao({
  icon,
  titulo,
  className = "",
  children,
}: {
  icon: ReactNode;
  titulo: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`card-soft p-5 print:break-inside-avoid ${className}`}>
      <h2 className="inline-flex items-center gap-2 font-display text-sm font-bold">
        {icon} {titulo}
      </h2>
      {children}
    </section>
  );
}

function Lista({
  itens,
  editando,
  onChange,
  numerada,
  rotulo,
  className = "mt-2 space-y-1.5 text-sm text-muted-foreground",
}: {
  itens: string[];
  editando: boolean;
  onChange: (itens: string[]) => void;
  numerada?: boolean;
  rotulo: string;
  className?: string;
}) {
  if (editando) {
    return (
      <div className="mt-2 space-y-2">
        {itens.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            {numerada ? (
              <span className="mt-2 w-5 shrink-0 text-sm font-semibold">{i + 1}.</span>
            ) : null}
            <Textarea
              value={item}
              rows={Math.max(1, Math.ceil(item.length / 60))}
              aria-label={`${rotulo}, item ${i + 1}`}
              onChange={(e) =>
                onChange(itens.map((x, j) => (j === i ? e.target.value.slice(0, 2000) : x)))
              }
              className="field-sizing-content min-h-11 rounded-xl bg-card text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(itens.filter((_, j) => j !== i))}
              aria-label={`Tirar o item ${i + 1} de ${rotulo}`}
              className="mt-1 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-coral-soft hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" className={botaoPequeno} onClick={() => onChange([...itens, ""])}>
          <Plus className="h-3.5 w-3.5" /> Item
        </button>
      </div>
    );
  }
  if (itens.length === 0) {
    return <p className="mt-2 text-sm italic text-muted-foreground">Não informado.</p>;
  }
  if (numerada) {
    return (
      <ol className={cn("list-decimal pl-5", className)}>
        {itens.map((item, i) => (
          <li key={`${i}-${item}`}>
            <ItemDaAtividade item={item} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className={className}>
      {itens.map((item, i) => (
        <li key={`${i}-${item}`} className="whitespace-pre-line">
          • {item}
        </li>
      ))}
    </ul>
  );
}

function Texto({
  valor,
  editando,
  onChange,
  rotulo,
  multilinha,
  className,
}: {
  valor: string;
  editando: boolean;
  onChange: (v: string) => void;
  rotulo: string;
  multilinha?: boolean;
  className?: string;
}) {
  if (!editando) return valor ? <span className={className}>{valor}</span> : null;
  return multilinha ? (
    <Textarea
      value={valor}
      rows={Math.max(2, Math.ceil(valor.length / 80))}
      aria-label={rotulo}
      placeholder={rotulo}
      onChange={(e) => onChange(e.target.value.slice(0, 4000))}
      className="field-sizing-content mt-1 min-h-16 rounded-xl bg-card text-sm"
    />
  ) : (
    <Input
      value={valor}
      aria-label={rotulo}
      placeholder={rotulo}
      onChange={(e) => onChange(e.target.value.slice(0, 300))}
      className="mt-1 h-9 rounded-xl bg-card text-sm"
    />
  );
}

function RefazerComLumis({
  ocupado,
  bloqueado,
  erro,
  onRefazer,
}: {
  ocupado: boolean;
  bloqueado: boolean;
  erro: string;
  onRefazer: (pedido: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pedido, setPedido] = useState("");
  return (
    <div className="mt-3 print:hidden">
      {aberto || ocupado ? (
        <form
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2"
          onSubmit={(e) => {
            e.preventDefault();
            onRefazer(pedido.trim());
          }}
        >
          <Input
            value={pedido}
            onChange={(e) => setPedido(e.target.value.slice(0, 500))}
            disabled={ocupado}
            aria-label="O que a Lumis deve mudar"
            placeholder="O que mudar? Ex.: mais curta, mais lúdica, usar material concreto (opcional)"
            className="h-9 min-w-0 flex-1 basis-56 rounded-xl text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={ocupado || bloqueado}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ocupado ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {ocupado ? "Refazendo…" : "Refazer"}
          </button>
          {!ocupado ? (
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Cancelar"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          className={botaoPequeno}
          disabled={bloqueado}
          onClick={() => setAberto(true)}
        >
          <Sparkles className="h-3.5 w-3.5" /> Refazer com a Lumis
        </button>
      )}
      {erro ? (
        <p
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-xl bg-coral-soft px-3 py-2 text-xs"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {erro}
        </p>
      ) : null}
    </div>
  );
}

function Resultado() {
  const { id } = Route.useSearch();
  const planos = planosStore.use();
  const estado = useEstadoNuvem();
  const salvo = id ? planos.find((p) => p.id === id) : undefined;

  if (id && !salvo) {
    const carregando = contasReais && estado.situacao !== "pronta" && estado.situacao !== "erro";
    return (
      <div className="card-soft mx-auto max-w-md p-10 text-center">
        {carregando ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <p className="font-display text-lg font-semibold">Plano não encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Ele pode ter sido excluído.</p>
            <Link
              to="/planejamento"
              className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Voltar ao planejamento
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <PlanoDaAula
      key={id ?? "exemplo"}
      id={salvo?.id ?? null}
      inicial={completarPlano(salvo?.resultado ?? planoExemplo)}
      original={salvo?.original ?? planoOriginalExemplo}
      nomes={salvo?.nomes ?? {}}
      alunosIds={salvo?.alunosIds ?? []}
    />
  );
}

type Salvamento = "salvo" | "salvando" | "erro";

function PlanoDaAula({
  id,
  inicial,
  original,
  nomes,
  alunosIds,
}: {
  id: string | null;
  inicial: PlanoAdaptado;
  original: string;
  nomes: Record<string, string>;
  alunosIds: (string | null)[];
}) {
  const [plano, setPlano] = useState(inicial);
  const [editando, setEditando] = useState(false);
  const [salvamento, setSalvamento] = useState<Salvamento>("salvo");
  const [desfazer, setDesfazer] = useState<{ plano: PlanoAdaptado; nome: string } | null>(null);
  const [refazendo, setRefazendo] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [folha, setFolha] = useState<FolhaAtividade | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeira = useRef(true);
  const alunos = useAlunos();
  const { visao } = useAcesso();
  const escola = visao?.tipo === "professor" ? visao.escola : null;
  const cabecalhoDaEscola = useCabecalhoDaEscola(escola);
  const editavel = id !== null;

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (!id) return;
    setSalvamento("salvando");
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      atualizarPlano(id, plano)
        .then(() => setSalvamento("salvo"))
        .catch((e: unknown) => {
          console.error(e);
          setSalvamento("erro");
        });
    }, 900);
  }, [id, plano]);

  useEffect(() => {
    const voltar = () => setFolha(null);
    window.addEventListener("afterprint", voltar);
    return () => window.removeEventListener("afterprint", voltar);
  }, []);

  const mudar = (parte: Partial<PlanoAdaptado>) => setPlano((p) => ({ ...p, ...parte }));

  function perfilDo(rotulo: string) {
    const n = Number(/^Aluno (\d+)$/.exec(rotulo)?.[1]);
    const alunoId = n ? alunosIds[n - 1] : null;
    const aluno = alunoId ? alunos.find((a) => a.id === alunoId) : undefined;
    return aluno ? perfilAnonimoDe(aluno, rotulo) : undefined;
  }

  async function refazer(chave: string, parte: ParteDoPlano, indice: number, pedido: string) {
    if (refazendo) return;
    setRefazendo(chave);
    setErros((e) => ({ ...e, [chave]: "" }));
    const atual =
      parte === "etapa"
        ? plano.etapas[indice]
        : parte === "atividade"
          ? plano.atividade
          : plano.adaptacoes[indice];
    const perfil =
      parte === "adaptacao" ? perfilDo(plano.adaptacoes[indice]?.aluno ?? "") : undefined;
    try {
      const r = await refazerParteDoPlano(
        {
          parte,
          titulo: plano.titulo.slice(0, 300),
          disciplina: plano.disciplina.slice(0, 100),
          serie: plano.serie.slice(0, 60),
          duracao: plano.duracao.slice(0, 60),
          objetivo: plano.objetivo.slice(0, 2000),
          etapas: plano.etapas.slice(0, 12).map((e) => e.titulo.slice(0, 300)),
          atual: JSON.stringify(atual ?? {}).slice(0, 15000),
          pedido,
          ...(perfil ? { perfil } : {}),
        },
        escola,
      );
      if (!r.ok) {
        setErros((e) => ({ ...e, [chave]: r.erro }));
        return;
      }
      const antes = plano;
      if (r.parte === "etapa") {
        mudar({ etapas: plano.etapas.map((e, i) => (i === indice ? r.etapa : e)) });
        setDesfazer({ plano: antes, nome: `a etapa ${indice + 1}` });
      } else if (r.parte === "atividade") {
        mudar({ atividade: r.atividade });
        setDesfazer({ plano: antes, nome: "a atividade" });
      } else {
        mudar({ adaptacoes: plano.adaptacoes.map((a, i) => (i === indice ? r.adaptacao : a)) });
        const nome = nomes[r.adaptacao.aluno];
        setDesfazer({ plano: antes, nome: nome ? `a adaptação de ${nome}` : "a adaptação" });
      }
    } finally {
      setRefazendo(null);
    }
  }

  function imprimir(f: FolhaAtividade | null) {
    setEditando(false);
    setFolha(f);
    setTimeout(() => window.print(), 80);
  }

  const folhas = folhasDoPlano(plano, nomes);
  const refazerProps = (chave: string, parte: ParteDoPlano, indice = 0) => ({
    ocupado: refazendo === chave,
    bloqueado: refazendo !== null && refazendo !== chave,
    erro: erros[chave] ?? "",
    onRefazer: (pedido: string) => void refazer(chave, parte, indice, pedido),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className={folha ? "print:hidden" : ""}>
        <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Link
            to="/planejamento"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card print:invisible"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            {editando ? (
              <Input
                value={plano.titulo}
                aria-label="Título do plano"
                onChange={(e) => mudar({ titulo: e.target.value.slice(0, 300) })}
                className="h-10 rounded-xl bg-card font-display text-lg font-semibold"
              />
            ) : (
              <h1 className="truncate font-display text-xl font-semibold sm:text-2xl print:whitespace-normal">
                {plano.titulo}
              </h1>
            )}
            {editavel ? (
              <p className="text-xs text-muted-foreground print:hidden" aria-live="polite">
                {salvamento === "salvando"
                  ? "Salvando…"
                  : salvamento === "erro"
                    ? "Não foi possível salvar. Confira sua internet."
                    : "Todas as mudanças estão salvas"}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2 print:hidden">
            {editavel ? (
              <button
                type="button"
                onClick={() => setEditando((v) => !v)}
                aria-pressed={editando}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  editando
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                {editando ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                <span className="hidden sm:inline">{editando ? "Pronto" : "Editar"}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => imprimir(null)}
              aria-label="Imprimir o plano ou salvar em PDF"
              title="Imprimir o plano ou salvar em PDF"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
          {editando ? (
            <div className="grid w-full gap-2 sm:grid-cols-3">
              <Texto
                valor={plano.disciplina}
                editando
                rotulo="Disciplina"
                onChange={(v) => mudar({ disciplina: v })}
              />
              <Texto
                valor={plano.serie}
                editando
                rotulo="Série"
                onChange={(v) => mudar({ serie: v })}
              />
              <Texto
                valor={plano.duracao}
                editando
                rotulo="Duração"
                onChange={(v) => mudar({ duracao: v })}
              />
            </div>
          ) : (
            <>
              {plano.disciplina ? (
                <span className="rounded-full bg-secondary px-3 py-1.5">{plano.disciplina}</span>
              ) : null}
              <span className="rounded-full bg-secondary px-3 py-1.5">{plano.serie}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
                <Clock className="h-3.5 w-3.5" /> {plano.duracao}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {editavel ? "Gerado com IA" : "Exemplo"}
              </span>
            </>
          )}
        </div>

        {desfazer ? (
          <div
            role="status"
            className="sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-leaf-soft px-4 py-2.5 text-sm shadow-soft print:hidden"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              A Lumis refez {desfazer.nome}. Revise antes de usar.
            </span>
            <button
              type="button"
              className={botaoPequeno}
              onClick={() => {
                setPlano(desfazer.plano);
                setDesfazer(null);
              }}
            >
              <Undo2 className="h-3.5 w-3.5" /> Desfazer
            </button>
            <button
              type="button"
              onClick={() => setDesfazer(null)}
              aria-label="Fechar aviso"
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full hover:bg-black/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {folhas.length ? (
          <section className="card-soft mb-6 p-5 print:hidden" aria-labelledby="titulo-folhas">
            <h2
              id="titulo-folhas"
              className="inline-flex items-center gap-2 font-display text-base font-semibold"
            >
              <Printer className="h-4 w-4" /> Folhas para entregar aos alunos
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Só a atividade, com espaço para responder. A folha não diz que é adaptada, para
              ninguém ser exposto na turma.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {folhas.map((f) => (
                <li key={f.chave} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="min-w-0 flex-1 text-sm font-semibold">{f.rotulo}</span>
                  <button type="button" className={botaoPequeno} onClick={() => imprimir(f)}>
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                  <button
                    type="button"
                    className={botaoPequeno}
                    onClick={() =>
                      baixarArquivo(
                        folhaParaDocx(f, cabecalhoDaEscola),
                        `${nomeArquivo(f.titulo, f.nome || (f.chave === "apoio" ? "mais apoio" : ""))}.docx`,
                      )
                    }
                  >
                    <FileDown className="h-3.5 w-3.5" /> Word
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Tabs defaultValue="ia">
          <TabsList className="mb-6 h-11 w-full rounded-full p-1 print:hidden">
            <TabsTrigger value="original" className="h-9 flex-1 rounded-full">
              Plano original
            </TabsTrigger>
            <TabsTrigger value="ia" className="h-9 flex-1 rounded-full">
              Com IA (inclusivo)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-0">
            <section className="card-soft p-5">
              <h2 className="font-display text-base font-semibold">Como você escreveu</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{original}</p>
            </section>
          </TabsContent>

          <TabsContent value="ia" className="mt-0">
            {editando ? (
              <p className="mb-4 rounded-2xl bg-sky-soft px-4 py-3 text-sm print:hidden">
                Você está editando. Mude o que quiser: tudo é salvo sozinho. Clique em{" "}
                <strong>Pronto</strong> para voltar à leitura.
              </p>
            ) : null}

            <section className="card-soft mb-4 p-5 print:break-inside-avoid">
              <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold">
                <Target className="h-4 w-4" /> Objetivos
              </h2>
              <div className="mt-2 text-sm font-medium">
                <Texto
                  valor={plano.objetivo}
                  editando={editando}
                  multilinha
                  rotulo="Objetivo geral"
                  onChange={(v) => mudar({ objetivo: v })}
                />
              </div>
              <Lista
                itens={plano.objetivosEspecificos}
                editando={editando}
                rotulo="Objetivos específicos"
                onChange={(v) => mudar({ objetivosEspecificos: v })}
              />
            </section>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Secao icon={<BookOpen className="h-4 w-4" />} titulo="Habilidades da BNCC">
                <Lista
                  itens={plano.habilidadesBncc}
                  editando={editando}
                  rotulo="Habilidades da BNCC"
                  onChange={(v) => mudar({ habilidadesBncc: v })}
                />
              </Secao>
              <Secao icon={<Layers className="h-4 w-4" />} titulo="Conteúdos">
                <Lista
                  itens={plano.conteudos}
                  editando={editando}
                  rotulo="Conteúdos"
                  onChange={(v) => mudar({ conteudos: v })}
                />
              </Secao>
            </div>

            {plano.materiais.length > 0 || editando ? (
              <Secao icon={<Package className="h-4 w-4" />} titulo="Materiais" className="mb-4">
                <Lista
                  itens={plano.materiais}
                  editando={editando}
                  rotulo="Materiais"
                  onChange={(v) => mudar({ materiais: v })}
                />
              </Secao>
            ) : null}

            <section className="mb-4">
              <h2 className="mb-3 font-display text-base font-semibold">
                Estratégias inclusivas para a turma
              </h2>
              {editando ? (
                <div className="card-soft p-5">
                  <Lista
                    itens={plano.estrategias}
                    editando
                    rotulo="Estratégias"
                    onChange={(v) => mudar({ estrategias: v })}
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {plano.estrategias.map((e, i) => (
                    <div
                      key={`${i}-${e}`}
                      className="card-soft px-4 py-3 text-sm font-medium print:break-inside-avoid"
                    >
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {plano.etapas.length > 0 || editando ? (
              <section className="card-soft mb-4 p-5">
                <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold">
                  <ListOrdered className="h-4 w-4" /> Passo a passo da aula
                </h2>
                <ol className="mt-4 space-y-5">
                  {plano.etapas.map((e, i) => {
                    const mudarEtapa = (parte: Partial<typeof e>) =>
                      mudar({
                        etapas: plano.etapas.map((x, j) => (j === i ? { ...x, ...parte } : x)),
                      });
                    return (
                      <li
                        key={i}
                        className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 print:break-inside-avoid"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-display text-xs font-semibold">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          {editando ? (
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <Texto
                                    valor={e.titulo}
                                    editando
                                    rotulo={`Título da etapa ${i + 1}`}
                                    onChange={(v) => mudarEtapa({ titulo: v })}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    mudar({ etapas: plano.etapas.filter((_, j) => j !== i) })
                                  }
                                  aria-label={`Apagar a etapa ${i + 1}`}
                                  className="mt-1 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-coral-soft hover:text-foreground"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <Texto
                                valor={e.descricao}
                                editando
                                multilinha
                                rotulo={`O que acontece na etapa ${i + 1}`}
                                onChange={(v) => mudarEtapa({ descricao: v })}
                              />
                              <Texto
                                valor={e.inclusao}
                                editando
                                multilinha
                                rotulo="Para incluir todos"
                                onChange={(v) => mudarEtapa({ inclusao: v })}
                              />
                            </div>
                          ) : (
                            <>
                              <span className="block text-sm font-semibold">{e.titulo}</span>
                              <span className="mt-1 block text-sm text-muted-foreground">
                                {e.descricao}
                              </span>
                              {e.inclusao ? (
                                <span className="mt-2 block rounded-2xl bg-leaf-soft px-3 py-2 text-sm">
                                  <strong>Para incluir todos:</strong> {e.inclusao}
                                </span>
                              ) : null}
                            </>
                          )}
                          {editavel ? (
                            <RefazerComLumis {...refazerProps(`etapa-${i}`, "etapa", i)} />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {editando ? (
                  <button
                    type="button"
                    className={cn(botaoPequeno, "mt-4")}
                    onClick={() =>
                      mudar({
                        etapas: [
                          ...plano.etapas,
                          { titulo: "Nova etapa (10 min)", descricao: "", inclusao: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Etapa
                  </button>
                ) : null}
              </section>
            ) : null}

            {plano.atividade.itens.length > 0 || editando ? (
              <section className="card-soft mb-4 p-5">
                <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold">
                  <PencilLine className="h-4 w-4" /> Atividade pronta
                  {!editando && plano.atividade.titulo ? `: ${plano.atividade.titulo}` : ""}
                </h2>
                {editando ? (
                  <Texto
                    valor={plano.atividade.titulo}
                    editando
                    rotulo="Título da atividade"
                    onChange={(v) => mudar({ atividade: { ...plano.atividade, titulo: v } })}
                  />
                ) : null}
                <div className="mt-2 text-sm font-medium">
                  <Texto
                    valor={plano.atividade.enunciado}
                    editando={editando}
                    multilinha
                    rotulo="Enunciado"
                    onChange={(v) => mudar({ atividade: { ...plano.atividade, enunciado: v } })}
                  />
                </div>
                <Lista
                  itens={plano.atividade.itens}
                  editando={editando}
                  numerada
                  rotulo="Itens da atividade"
                  className="mt-3 space-y-1.5 text-sm text-muted-foreground"
                  onChange={(v) => mudar({ atividade: { ...plano.atividade, itens: v } })}
                />
                {plano.atividade.versaoAdaptada.length > 0 ||
                plano.atividade.apoios.length > 0 ||
                editando ? (
                  <div className="mt-4 rounded-2xl bg-sky-soft p-4 print:break-inside-avoid">
                    <p className="text-sm font-bold">Versão com mais apoio, pronta para entregar</p>
                    <Lista
                      itens={plano.atividade.versaoAdaptada}
                      editando={editando}
                      numerada
                      rotulo="Versão com mais apoio"
                      className="mt-2 space-y-1.5 text-sm"
                      onChange={(v) =>
                        mudar({ atividade: { ...plano.atividade, versaoAdaptada: v } })
                      }
                    />
                    {plano.atividade.apoios.length > 0 || editando ? (
                      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Acompanha a folha
                        </p>
                        <Lista
                          itens={plano.atividade.apoios}
                          editando={editando}
                          rotulo="Apoios"
                          onChange={(v) => mudar({ atividade: { ...plano.atividade, apoios: v } })}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {editavel ? <RefazerComLumis {...refazerProps("atividade", "atividade")} /> : null}
              </section>
            ) : null}

            {plano.avaliacao.length > 0 || editando ? (
              <Secao
                icon={<ClipboardCheck className="h-4 w-4" />}
                titulo="Avaliação"
                className="mb-4"
              >
                <Lista
                  itens={plano.avaliacao}
                  editando={editando}
                  rotulo="Avaliação"
                  onChange={(v) => mudar({ avaliacao: v })}
                />
              </Secao>
            ) : null}

            {plano.adaptacoes.length > 0 ? (
              <section className="mb-4">
                <h2 className="mb-3 font-display text-base font-semibold">
                  Participação inclusiva
                </h2>
                <div className="space-y-3">
                  {plano.adaptacoes.map((a, i) => {
                    const nome = a.aluno ? nomes[a.aluno] : undefined;
                    const mudarAdaptacao = (parte: Partial<typeof a>) =>
                      mudar({
                        adaptacoes: plano.adaptacoes.map((x, j) =>
                          j === i ? { ...x, ...parte } : x,
                        ),
                      });
                    return (
                      <div
                        key={i}
                        className={`rounded-3xl ${tonsAdaptacao[i % tonsAdaptacao.length]} p-4 print:break-inside-avoid`}
                      >
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 font-display text-sm font-bold">
                            {nome ?? (editando ? "Perfil" : a.perfil)}
                            {nome && !editando ? (
                              <span className="ml-1.5 font-sans text-xs font-semibold text-muted-foreground">
                                {a.perfil}
                              </span>
                            ) : null}
                          </p>
                          {editando ? (
                            <button
                              type="button"
                              onClick={() =>
                                mudar({ adaptacoes: plano.adaptacoes.filter((_, j) => j !== i) })
                              }
                              aria-label={`Apagar a adaptação ${nome ?? a.perfil}`}
                              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-black/10 hover:text-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                        {editando ? (
                          <Texto
                            valor={a.perfil}
                            editando
                            rotulo="Necessidades"
                            onChange={(v) => mudarAdaptacao({ perfil: v })}
                          />
                        ) : null}
                        <Lista
                          itens={a.itens}
                          editando={editando}
                          rotulo={`Ações para ${nome ?? a.perfil}`}
                          onChange={(v) => mudarAdaptacao({ itens: v })}
                        />
                        {a.atividade.length > 0 || editando ? (
                          <div className="mt-3 rounded-2xl bg-card/70 p-3">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Atividade para {nome ?? "este perfil"}
                            </p>
                            <Lista
                              itens={a.atividade}
                              editando={editando}
                              numerada
                              rotulo={`Atividade para ${nome ?? a.perfil}`}
                              className="mt-1.5 space-y-1 text-sm"
                              onChange={(v) => mudarAdaptacao({ atividade: v })}
                            />
                          </div>
                        ) : null}
                        {editavel ? (
                          <RefazerComLumis {...refazerProps(`adaptacao-${i}`, "adaptacao", i)} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="card-soft p-5">
                <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
                  <AlertTriangle className="h-4 w-4" /> Possíveis barreiras
                </p>
                <Lista
                  itens={plano.barreiras}
                  editando={editando}
                  rotulo="Barreiras"
                  onChange={(v) => mudar({ barreiras: v })}
                />
              </div>
              <div className="card-soft p-5">
                <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
                  <Lightbulb className="h-4 w-4" /> Recomendações
                </p>
                <Lista
                  itens={plano.recomendacoes}
                  editando={editando}
                  rotulo="Recomendações"
                  onChange={(v) => mudar({ recomendacoes: v })}
                />
              </div>
            </section>

            <section className="card-soft p-5">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
                <Link2 className="h-4 w-4" /> Recursos complementares
              </p>
              <Lista
                itens={plano.recursos}
                editando={editando}
                rotulo="Recursos"
                onChange={(v) => mudar({ recursos: v })}
              />
            </section>

            <p className="mt-4 text-center text-xs text-muted-foreground print:hidden">
              {editavel
                ? "Sugestões geradas por IA. Revise antes de aplicar: você conhece sua turma melhor que ninguém."
                : "Este é um exemplo. Gere um plano seu para poder editar e refazer partes com a Lumis."}
            </p>
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden print:block">
        {folha ? <FolhaDaAtividade folha={folha} escola={cabecalhoDaEscola} /> : null}
      </div>
    </div>
  );
}
