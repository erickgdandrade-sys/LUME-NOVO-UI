import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, TrendingUp, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { AlunoFormDialog } from "@/components/AlunoFormDialog";
import { Input } from "@/components/ui/input";
import { AvisoImportar } from "@/components/AvisoImportar";
import { carregarExemplosNaNuvem, necessidadesDe, useAlunos } from "@/lib/alunos-store";
import { useEstadoNuvem, useMinhasTurmas } from "@/lib/nuvem";
import { suporteTom } from "@/lib/lume-data";
import { FotoDoAluno } from "@/components/FotoDoAluno";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alunos/")({
  head: () => ({
    meta: [
      { title: "Perfis dos alunos | Lume" },
      {
        name: "description",
        content:
          "Conheça as necessidades, preferências e estratégias que funcionam para cada estudante.",
      },
      { property: "og:title", content: "Perfis dos alunos | Lume" },
      {
        property: "og:description",
        content: "Necessidades e estratégias de cada estudante em um só lugar.",
      },
    ],
  }),
  component: Alunos,
});

const avatarTons = ["bg-sky-soft", "bg-lilac-soft", "bg-tangerine-soft", "bg-leaf-soft"];

function Alunos() {
  const alunos = useAlunos();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [turma, setTurma] = useState("todas");
  const turmas = useMinhasTurmas();
  const nuvem = useEstadoNuvem();
  const [carregandoExemplos, setCarregandoExemplos] = useState(false);
  const nomeDaTurma = (id: string | null | undefined) =>
    id ? (turmas.find((t) => t.id === id)?.nome ?? "Outra turma") : "Sem turma";

  const marcadores = (a: (typeof alunos)[number]) => [...necessidadesDe(a), ...a.tags];
  const filtros = ["Todos", ...Array.from(new Set(alunos.flatMap(marcadores))).slice(0, 6)];

  const lista = alunos.filter(
    (a) =>
      (filtro === "Todos" || marcadores(a).includes(filtro)) &&
      (turma === "todas" || (turma === "sem" ? !a.turma : a.turma === turma)) &&
      a.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  const botaoCadastrar = (
    <AlunoFormDialog
      turmaPadrao={turma !== "todas" && turma !== "sem" ? turma : (turmas[0]?.id ?? "")}
      onSalvo={(novo) => navigate({ to: "/alunos/$id", params: { id: novo.id } })}
      trigger={
        <button
          type="button"
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Cadastrar aluno</span>
          <span className="sm:hidden">Novo</span>
        </button>
      }
    />
  );

  return (
    <div>
      <PageHeader
        title="Perfis dos alunos"
        subtitle={`${alunos.length} ${alunos.length === 1 ? "aluno acompanhado" : "alunos acompanhados"} · necessidades, preferências e o que funciona.`}
        action={botaoCadastrar}
      />

      <AvisoImportar />

      {nuvem.situacao === "erro" ? (
        <p role="alert" className="mb-4 rounded-2xl bg-coral-soft px-4 py-3 text-sm">
          Não foi possível carregar seus alunos. Recarregue a página para tentar de novo.
        </p>
      ) : null}

      {nuvem.situacao !== "parada" && turmas.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por turma">
          {[
            { id: "todas", nome: "Todas as turmas" },
            ...turmas.map((t) => ({ id: t.id, nome: t.nome })),
            { id: "sem", nome: "Sem turma" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={turma === t.id}
              onClick={() => setTurma(t.id)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                turma === t.id
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t.nome}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno pelo nome"
            aria-label="Buscar aluno"
            className="h-10 rounded-lg bg-card pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por perfil">
          {filtros.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                filtro === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((a, i) => {
          const primeira = a.evolucao[0]?.participacao;
          const ultima = a.evolucao[a.evolucao.length - 1]?.participacao;
          return (
            <Link
              key={a.id}
              to="/alunos/$id"
              params={{ id: a.id }}
              className="card-soft group flex flex-col p-4 transition-colors hover:border-primary/40"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <FotoDoAluno
                  nome={a.nome}
                  foto={a.foto}
                  className={`h-11 w-11 rounded-full ${avatarTons[i % avatarTons.length]} text-sm`}
                />
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">{a.nome}</span>
                    {a.exemplo ? (
                      <span className="shrink-0 rounded-full bg-sun-soft px-2 py-0.5 text-[10px] font-semibold">
                        Exemplo
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {nuvem.situacao !== "parada" ? `${nomeDaTurma(a.turma)} · ` : ""}
                    {a.serie} · {a.idade} anos · atualizado em {a.atualizado}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                  title="Participação no último registro"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {ultima === undefined
                    ? "—"
                    : primeira !== undefined && a.evolucao.length > 1
                      ? `${ultima}% (${ultima - primeira >= 0 ? "+" : ""}${ultima - primeira})`
                      : `${ultima}%`}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {a.resumo || "Perfil recém-cadastrado — complete as informações do aluno."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full ${suporteTom[a.suporte]} px-2.5 py-0.5 text-xs font-medium`}
                >
                  Suporte {a.suporte.toLowerCase()}
                </span>
                {[...necessidadesDe(a), ...a.tags].map((t, n) => (
                  <span
                    key={`${n}-${t}`}
                    className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {nuvem.situacao === "carregando" ? (
        <p className="card-soft mt-2 p-10 text-center text-sm text-muted-foreground">
          Carregando seus alunos…
        </p>
      ) : lista.length === 0 ? (
        <div className="card-soft mt-2 p-10 text-center">
          <p className="font-display text-base font-bold">
            {alunos.length === 0 ? "Nenhum aluno cadastrado ainda" : "Nenhum aluno encontrado"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {alunos.length === 0
              ? "Cadastre o primeiro aluno para começar a acompanhar as estratégias."
              : "Tente outro nome ou filtro."}
          </p>
          {alunos.length === 0 ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {botaoCadastrar}
              {nuvem.situacao === "pronta" ? (
                <button
                  type="button"
                  disabled={carregandoExemplos}
                  onClick={() => {
                    setCarregandoExemplos(true);
                    carregarExemplosNaNuvem()
                      .catch((e: unknown) => {
                        console.error(e);
                        window.alert("Não foi possível carregar os exemplos agora.");
                      })
                      .finally(() => setCarregandoExemplos(false));
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
                >
                  {carregandoExemplos ? "Carregando…" : "Ver alunos de exemplo"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
