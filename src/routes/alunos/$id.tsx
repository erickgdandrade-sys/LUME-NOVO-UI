import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Ear,
  Heart,
  Home,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";
import iconeLumis from "@/assets/lumis-icone.webp";
import { AlunoFormDialog } from "@/components/AlunoFormDialog";
import { ParticipacaoChart } from "@/components/ParticipacaoChart";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MESES,
  adicionarNota,
  necessidadesDe,
  registrarParticipacao,
  removerAluno,
  useAluno,
} from "@/lib/alunos-store";
import { suporteTom, type Aluno } from "@/lib/lume-data";
import { abrirLumis } from "@/lib/lumis-chat";
import { FotoDoAluno } from "@/components/FotoDoAluno";

/** Pergunta pronta para a Lumis, sem o nome do aluno (o chat não deve receber nomes). */
function perguntaParaLumis(a: Aluno) {
  const partes = [
    `Tenho um aluno do ${a.serie || "ensino fundamental"}, com suporte ${a.suporte.toLowerCase()}.`,
  ];
  const necessidades = necessidadesDe(a);
  if (necessidades.length) partes.push(`Necessidades observadas: ${necessidades.join(", ")}.`);
  if (a.tags.length) partes.push(`Diagnóstico informado: ${a.tags.join(", ")}.`);
  const lista = (itens: string[]) =>
    itens
      .slice(0, 3)
      .map((i) => i.trim().replace(/[.;]+$/, ""))
      .join("; ");
  if (a.funcionam.length) partes.push(`O que já funciona: ${lista(a.funcionam)}.`);
  if (a.naoFuncionam.length) partes.push(`O que evitar: ${lista(a.naoFuncionam)}.`);
  partes.push("Que estratégias posso usar na próxima aula para incluí-lo melhor?");
  return partes.join(" ");
}

function ResumoDaParticipacao({ aluno }: { aluno: Aluno }) {
  const pontos = aluno.evolucao.map((e) => e.participacao);
  const ultima = pontos[pontos.length - 1];
  const primeira = pontos[0];
  if (ultima === undefined) {
    return (
      <div className="self-start rounded-lg bg-secondary p-4">
        <p className="text-xs font-medium text-muted-foreground">Participação</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sem registros ainda. Registre o mês na seção de participação abaixo.
        </p>
      </div>
    );
  }
  const variacao = primeira !== undefined && pontos.length > 1 ? ultima - primeira : null;
  const largura = 160;
  const altura = 36;
  // Escala pelo intervalo dos próprios registros, para a tendência ficar visível.
  const menor = Math.min(...pontos);
  const faixa = Math.max(Math.max(...pontos) - menor, 10);
  const linha = pontos
    .map((v, i) => {
      const x = pontos.length === 1 ? largura : (i / (pontos.length - 1)) * largura;
      const y = altura - 3 - ((v - menor) / faixa) * (altura - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="self-start rounded-lg bg-secondary p-4">
      <p className="text-xs font-medium text-muted-foreground">
        Participação · {aluno.evolucao[aluno.evolucao.length - 1]?.mes}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold tabular-nums">{ultima}%</p>
          {variacao !== null ? (
            <p
              className={`inline-flex items-center gap-1 text-xs font-medium ${variacao >= 0 ? "text-leaf" : "text-coral"}`}
            >
              {variacao >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {variacao >= 0 ? "+" : ""}
              {variacao} desde {aluno.evolucao[0]?.mes}
            </p>
          ) : null}
        </div>
        {pontos.length > 1 ? (
          <svg
            viewBox={`0 0 ${largura} ${altura}`}
            className="h-9 w-32 overflow-visible text-primary"
            aria-hidden="true"
          >
            <polyline
              points={linha}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/alunos/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do aluno | Lume" },
      { name: "description", content: "Perfil detalhado do aluno e estratégias que funcionam." },
    ],
  }),
  component: PerfilAluno,
});

function Secao({
  icon,
  titulo,
  itens,
  aluno,
  etapa,
}: {
  icon: ReactNode;
  titulo: string;
  itens: string[];
  aluno: Aluno;
  etapa: number;
}) {
  return (
    <section className="card-soft p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
        {icon} {titulo}
      </h2>
      {itens.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {itens.map((i) => (
            <li key={i}>• {i}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <AlunoFormDialog
            aluno={aluno}
            etapaInicial={etapa}
            trigger={
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            }
          />
        </div>
      )}
    </section>
  );
}

function RegistrarParticipacao({ id }: { id: string }) {
  const [mes, setMes] = useState<string>(MESES[new Date().getMonth()] ?? "Jan");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    const n = Number(valor);
    if (valor === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      setErro("Informe um valor entre 0 e 100.");
      return;
    }
    registrarParticipacao(id, mes, Math.round(n))
      .then(() => {
        setValor("");
        setErro("");
      })
      .catch((e: unknown) => {
        console.error(e);
        setErro("Não foi possível salvar. Confira sua conexão e tente de novo.");
      });
  }

  return (
    <form onSubmit={enviar} className="mt-5 border-t border-border pt-4">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Registrar participação</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          aria-label="Mês"
          className="h-9 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm"
        >
          {MESES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="relative w-28">
          <Input
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0–100"
            aria-label="Participação em %"
            className="bg-card pr-7"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            %
          </span>
        </div>
        <button
          type="submit"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Registrar
        </button>
      </div>
      {erro ? <p className="mt-1.5 text-xs text-destructive">{erro}</p> : null}
    </form>
  );
}

function NovaNota({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar anotação
      </button>
    );
  }

  return (
    <form
      className="mt-4 space-y-2 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        adicionarNota(id, titulo.trim() || "Anotação", texto.trim())
          .then(() => {
            setTitulo("");
            setTexto("");
            setAberto(false);
          })
          .catch((e: unknown) => {
            console.error(e);
            window.alert(
              "Não foi possível salvar a anotação. Confira sua conexão e tente de novo.",
            );
          });
      }}
    >
      <Input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (ex.: Comportamento)"
        aria-label="Título da anotação"
        className="rounded-xl bg-card"
        autoFocus
      />
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="O que você observou?"
        aria-label="Texto da anotação"
        className="min-h-20 rounded-xl bg-card"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="cursor-pointer rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!texto.trim()}
          className="cursor-pointer rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}

function PerfilAluno() {
  const { id } = Route.useParams();
  const aluno = useAluno(id);
  const navigate = useNavigate();

  if (!aluno) {
    return (
      <div className="card-soft mx-auto max-w-md p-10 text-center">
        <p className="font-display text-lg font-semibold">Aluno não encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">Esse perfil pode ter sido excluído.</p>
        <Link
          to="/alunos"
          className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Ver todos os alunos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/alunos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Perfis dos alunos
      </Link>

      <section className="card-soft mb-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <FotoDoAluno
            nome={aluno.nome}
            foto={aluno.foto}
            className="h-14 w-14 rounded-full bg-sky-soft text-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-semibold">{aluno.nome}</h1>
              <span
                className={`rounded-md ${suporteTom[aluno.suporte]} px-2 py-0.5 text-xs font-semibold`}
              >
                Suporte {aluno.suporte.toLowerCase()}
              </span>
              {aluno.exemplo ? (
                <span className="rounded-md bg-sun-soft px-2 py-0.5 text-xs font-semibold">
                  Exemplo
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {aluno.serie} · {aluno.idade} anos · atualizado em {aluno.atualizado}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => abrirLumis(perguntaParaLumis(aluno))}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
            >
              <img src={iconeLumis} alt="" className="h-4 w-4 object-contain" /> Pedir ideias à
              Lumis
            </button>
            <AlunoFormDialog
              aluno={aluno}
              trigger={
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Excluir aluno"
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-coral-soft hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir o perfil de {aluno.nome}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todas as informações, anotações e registros de participação desse aluno serão
                    apagados. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      removerAluno(aluno.id)
                        .then(() => navigate({ to: "/alunos" }))
                        .catch((e: unknown) => {
                          console.error(e);
                          window.alert(
                            "Não foi possível excluir o aluno. Confira sua conexão e tente de novo.",
                          );
                        });
                    }}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-5 grid gap-5 border-t border-border pt-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="min-w-0 space-y-4">
            {aluno.resumo ? <p className="text-sm leading-relaxed">{aluno.resumo}</p> : null}
            {necessidadesDe(aluno).length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Necessidades observadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {necessidadesDe(aluno).map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {aluno.tags.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Diagnóstico informado
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aluno.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border px-2 py-0.5 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {!aluno.resumo && necessidadesDe(aluno).length === 0 && aluno.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Perfil recém-cadastrado. Use Editar para contar como esse aluno aprende.
              </p>
            ) : null}
          </div>
          <ResumoDaParticipacao aluno={aluno} />
        </div>
      </section>

      <Completude aluno={aluno} />

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Secao
          icon={<CheckCircle2 className="h-4 w-4 text-leaf" />}
          titulo="O que funciona"
          itens={aluno.funcionam}
          aluno={aluno}
          etapa={2}
        />
        <Secao
          icon={<XCircle className="h-4 w-4 text-coral" />}
          titulo="O que evitar"
          itens={aluno.naoFuncionam}
          aluno={aluno}
          etapa={2}
        />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Secao
          icon={<UserRound className="h-4 w-4" />}
          titulo="Características"
          itens={aluno.caracteristicas}
          aluno={aluno}
          etapa={3}
        />
        <Secao
          icon={<Heart className="h-4 w-4" />}
          titulo="Preferências"
          itens={aluno.preferencias}
          aluno={aluno}
          etapa={3}
        />
        <Secao
          icon={<Ear className="h-4 w-4" />}
          titulo="Sensorial"
          itens={aluno.sensorial}
          aluno={aluno}
          etapa={3}
        />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card-soft p-5">
          <h2 className="text-sm font-semibold">Participação nas aulas</h2>
          <p className="mb-6 mt-0.5 text-xs text-muted-foreground">
            % de atividades com participação ativa, por mês
          </p>
          {aluno.evolucao.length > 0 ? (
            <ParticipacaoChart
              titulo="Participação nas aulas"
              dados={aluno.evolucao.map((e) => ({ rotulo: e.mes, valor: e.participacao }))}
            />
          ) : (
            <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum registro ainda. Registre a participação do mês abaixo.
            </p>
          )}
          <RegistrarParticipacao id={aluno.id} />
        </section>

        <section className="card-soft p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
            <NotebookPen className="h-4 w-4" /> Histórico e anotações
          </h2>
          {aluno.historico.length > 0 ? (
            <div className="mt-3 space-y-3">
              {aluno.historico.map((h, i) => (
                <div key={`${h.titulo}-${i}`}>
                  <p className="text-sm font-semibold">{h.titulo}</p>
                  <p className="text-sm text-muted-foreground">{h.texto}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm italic text-muted-foreground">Nenhuma anotação ainda.</p>
          )}
          <NovaNota id={aluno.id} />
        </section>
      </div>

      <section className="card-soft p-5">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
          <Home className="h-4 w-4 text-tangerine" /> Relato da família
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {aluno.familia || "Nenhum relato registrado ainda."}
        </p>
      </section>
    </div>
  );
}

const PARTES: { nome: string; etapa: number; ok: (a: Aluno) => boolean }[] = [
  { nome: "necessidades", etapa: 1, ok: (a) => (a.necessidades ?? []).length > 0 },
  { nome: "o que funciona", etapa: 2, ok: (a) => a.funcionam.length > 0 },
  { nome: "o que evitar", etapa: 2, ok: (a) => a.naoFuncionam.length > 0 },
  { nome: "resumo", etapa: 3, ok: (a) => a.resumo.trim().length > 0 },
  { nome: "características", etapa: 3, ok: (a) => a.caracteristicas.length > 0 },
  { nome: "preferências", etapa: 3, ok: (a) => a.preferencias.length > 0 },
  { nome: "sensorial", etapa: 3, ok: (a) => a.sensorial.length > 0 },
];

function Completude({ aluno }: { aluno: Aluno }) {
  const faltam = PARTES.filter((p) => !p.ok(aluno));
  if (faltam.length === 0) return null;
  const pct = Math.round(((PARTES.length - faltam.length) / PARTES.length) * 100);
  return (
    <section className="card-soft mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">Perfil {pct}% completo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Falta: {faltam.map((f) => f.nome).join(", ")}. Quanto mais completo, melhor a Lumis
            adapta as aulas.
          </p>
        </div>
        <AlunoFormDialog
          aluno={aluno}
          etapaInicial={faltam[0]!.etapa}
          trigger={
            <button
              type="button"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Completar perfil
            </button>
          }
        />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
