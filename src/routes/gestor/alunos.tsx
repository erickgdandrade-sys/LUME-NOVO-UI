import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Loader2, Lock, School, Search, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { useEscolaDoGestor } from "@/lib/acesso";
import { suporteTom } from "@/lib/lume-data";
import { supabase } from "@/lib/supabase";
import { dataCurta, exigir, useDados } from "@/lib/usar-dados";
import { cn, iniciais } from "@/lib/utils";

export const Route = createFileRoute("/gestor/alunos")({
  head: () => ({ meta: [{ title: "Alunos | Gestão da escola | Lume" }] }),
  component: AlunosDaEscola,
});

type AlunoResumo = {
  id: string;
  nome: string;
  idade: number | null;
  serie: string | null;
  turma: string;
  turma_nome: string;
  suporte: "Leve" | "Médio" | "Alto";
  perfil_completo: boolean;
  participacao_mes: number | null;
  atualizado_em: string;
  exemplo: boolean;
};
type Turma = { id: string; nome: string; serie: string | null };
type Ligacao = { turma: string; professor: string; disciplina: string | null };
type Perfil = { id: string; nome: string | null; email: string | null };

function AlunosDaEscola() {
  const escola = useEscolaDoGestor();
  const [busca, setBusca] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("todas");

  const { dados, erro, carregando } = useDados(async () => {
    if (!escola) return null;
    const sb = supabase();
    const [alunos, semTurma, turmas, ligacoes] = await Promise.all([
      sb.rpc("alunos_da_escola", { p_escola: escola.id }),
      sb.rpc("alunos_sem_turma", { p_escola: escola.id }),
      sb
        .from("turmas")
        .select("id, nome, serie")
        .eq("escola", escola.id)
        .eq("ativa", true)
        .order("nome"),
      sb
        .from("turma_professores")
        .select("turma, professor, disciplina, turmas!inner(escola)")
        .eq("turmas.escola", escola.id),
    ]);
    const lig = exigir(ligacoes) as unknown as Ligacao[];
    const ids = [...new Set(lig.map((l) => l.professor))];
    const perfis = ids.length
      ? (exigir(await sb.from("perfis").select("id, nome, email").in("id", ids)) as Perfil[])
      : [];
    return {
      alunos: exigir(alunos) as AlunoResumo[],
      semTurma: exigir(semTurma) as number,
      turmas: exigir(turmas) as Turma[],
      ligacoes: lig,
      perfis: new Map(perfis.map((p) => [p.id, p])),
    };
  }, [escola?.id]);

  const termo = busca.trim().toLowerCase();
  const visiveis = (dados?.alunos ?? []).filter(
    (a) =>
      (turmaFiltro === "todas" || a.turma === turmaFiltro) &&
      (!termo || a.nome.toLowerCase().includes(termo)),
  );
  const turmasMostradas = (dados?.turmas ?? []).filter(
    (t) => turmaFiltro === "todas" || t.id === turmaFiltro,
  );
  const total = dados?.alunos.length ?? 0;
  const semRegistro = (dados?.alunos ?? []).filter((a) => a.participacao_mes === null).length;
  const incompletos = (dados?.alunos ?? []).filter((a) => !a.perfil_completo).length;

  return (
    <div>
      <PageHeader
        title="Alunos"
        subtitle="Todos os alunos cadastrados pelos professores, separados por turma."
      />

      <p className="mb-6 flex items-start gap-2 rounded-2xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Para proteger as crianças (LGPD), aqui aparecem só os dados de acompanhamento. Diagnósticos,
        necessidades, anotações e o relato da família ficam visíveis apenas para os professores da
        turma.
      </p>

      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando alunos…
        </p>
      ) : null}

      {dados ? (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Numero valor={total} rotulo="Alunos em turmas" />
            <Numero
              valor={semRegistro}
              rotulo="Sem participação registrada neste mês"
              destaque={semRegistro > 0}
            />
            <Numero valor={incompletos} rotulo="Com perfil incompleto" destaque={incompletos > 0} />
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar aluno pelo nome"
                aria-label="Buscar aluno"
                className="h-10 rounded-lg bg-card pl-11"
              />
            </div>
            <select
              value={turmaFiltro}
              onChange={(e) => setTurmaFiltro(e.target.value)}
              aria-label="Filtrar por turma"
              className="h-11 cursor-pointer rounded-xl border border-border bg-card px-4 text-sm"
            >
              <option value="todas">Todas as turmas</option>
              {dados.turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-6">
            {turmasMostradas.map((t) => {
              const daTurma = visiveis.filter((a) => a.turma === t.id);
              if (termo && daTurma.length === 0) return null;
              const professores = dados.ligacoes
                .filter((l) => l.turma === t.id)
                .map((l) => {
                  const p = dados.perfis.get(l.professor);
                  const nome = p?.nome || p?.email || "Professor";
                  return l.disciplina ? `${nome} (${l.disciplina})` : nome;
                });
              return (
                <section key={t.id} className="card-soft overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-leaf-soft">
                        <School className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="font-display text-base font-semibold">{t.nome}</h2>
                        <p className="text-xs text-muted-foreground">
                          {professores.length
                            ? professores.join(", ")
                            : "Nenhum professor vinculado"}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                      <UsersRound className="h-3.5 w-3.5" /> {daTurma.length}{" "}
                      {daTurma.length === 1 ? "aluno" : "alunos"}
                    </span>
                  </div>
                  {daTurma.length === 0 ? (
                    <p className="p-5 text-sm text-muted-foreground">
                      Nenhum aluno cadastrado nesta turma ainda.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {daTurma.map((a) => (
                        <li
                          key={a.id}
                          className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-soft font-display text-xs font-semibold">
                            {iniciais(a.nome)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">{a.nome}</span>
                              {a.exemplo ? (
                                <span className="rounded-full bg-sun-soft px-2 py-0.5 text-[10px] font-bold">
                                  Exemplo
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {[a.serie, a.idade ? `${a.idade} anos` : null]
                                .filter(Boolean)
                                .join(" · ")}{" "}
                              · atualizado em {dataCurta(a.atualizado_em)}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "col-start-2 justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:col-start-auto",
                              suporteTom[a.suporte],
                            )}
                          >
                            Suporte {a.suporte.toLowerCase()}
                          </span>
                          <Situacao
                            ok={a.participacao_mes !== null}
                            sim={`Participação: ${a.participacao_mes ?? 0}%`}
                            nao="Sem registro no mês"
                          />
                          <Situacao
                            ok={a.perfil_completo}
                            sim="Perfil completo"
                            nao="Perfil incompleto"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          {dados.turmas.length === 0 ? (
            <div className="card-soft p-8 text-center text-sm text-muted-foreground">
              Nenhuma turma ativa ainda.{" "}
              <Link to="/gestor/turmas" className="font-semibold text-primary">
                Criar turmas
              </Link>
            </div>
          ) : null}

          {dados.semTurma > 0 ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Há também {dados.semTurma} {dados.semTurma === 1 ? "aluno" : "alunos"} sem turma,
              cadastrados pelos professores só para eles. Vincule os professores às turmas para que
              os alunos apareçam aqui.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Numero({
  valor,
  rotulo,
  destaque,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
}) {
  return (
    <div className={cn("card-soft p-4", destaque && "ring-2 ring-sun")}>
      <p className="font-display text-2xl font-semibold">{valor.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{rotulo}</p>
    </div>
  );
}

function Situacao({ ok, sim, nao }: { ok: boolean; sim: string; nao: string }) {
  return (
    <span
      className={cn(
        "col-start-2 inline-flex items-center gap-1 justify-self-start text-xs font-semibold sm:col-start-auto",
        ok ? "text-[#2f7a45] dark:text-[#9fd8ae]" : "text-muted-foreground",
      )}
    >
      {ok ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-sun" />
      )}
      {ok ? sim : nao}
    </span>
  );
}
