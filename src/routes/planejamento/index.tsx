import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ChevronRight, FileText, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { AnexosDaAula } from "@/components/AnexosDaAula";
import { PageHeader } from "@/components/AppShell";
import { FrasesEmCiclo, LumisAnimada } from "@/components/Lumis";
import { Textarea } from "@/components/ui/textarea";
import { adaptarAula, obterStatusIA } from "@/lib/adaptar-aula";
import { estrategiaPorId } from "@/lib/biblioteca-estrategias";
import { useAcesso } from "@/lib/acesso";
import { creditosRestantes, situacaoDoPlano, type SituacaoPlano } from "@/lib/plano-escola";
import { Creditos } from "@/components/CreditosIA";
import { necessidadesDe, perfilAnonimoDe, useAlunos } from "@/lib/alunos-store";
import type { Aluno } from "@/lib/lume-data";
import type { Anexo, PerfilAnonimo, StatusIA } from "@/lib/plano-schema";
import { planosStore, removerPlano, salvarPlano } from "@/lib/planos-store";
import { XP_PLANO, registrarAtividade } from "@/lib/progresso-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planejamento/")({
  validateSearch: (busca: Record<string, unknown>): { estrategia?: string } =>
    typeof busca["estrategia"] === "string" ? { estrategia: busca["estrategia"] } : {},
  head: () => ({
    meta: [
      { title: "Planejamento inclusivo com IA | Lume" },
      {
        name: "description",
        content:
          "Cole seu plano de aula e receba adaptações inclusivas, recursos e estratégias para cada perfil de aluno.",
      },
      { property: "og:title", content: "Planejamento inclusivo com IA | Lume" },
      {
        property: "og:description",
        content: "Transforme qualquer plano de aula em uma experiência mais inclusiva.",
      },
    ],
  }),
  component: Planejamento,
});

const FRASES_PLANEJANDO = [
  "Lumis está pensando…",
  "Lendo seu plano de aula…",
  "Conhecendo cada aluno…",
  "Adaptando sua aula…",
  "Escolhendo estratégias inclusivas…",
  "Preparando recursos e materiais…",
  "Pensando na avaliação…",
  "Revisando os detalhes…",
] as const;

function LumisPlanejando() {
  const [progresso, setProgresso] = useState(6);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  useEffect(() => {
    // Progresso só visual: aproxima-se de 92% sem nunca chegar, até a resposta voltar.
    const id = window.setInterval(() => setProgresso((p) => p + (92 - p) * 0.08), 1500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      role="status"
      aria-label="Adaptando sua aula"
      className="card-soft flex flex-col items-center px-6 py-14 text-center"
    >
      <LumisAnimada className="h-28 w-28" />
      <FrasesEmCiclo frases={FRASES_PLANEJANDO} className="mt-8 w-full max-w-sm" />
      <div className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-[1500ms] ease-out"
          style={{ width: `${progresso}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Pode levar até 2 minutos. Não feche esta página.
      </p>
    </section>
  );
}

function Planejamento() {
  const navigate = useNavigate();
  const alunos = useAlunos();
  const planos = planosStore.use();
  const { estrategia } = Route.useSearch();
  const [texto, setTexto] = useState(() => {
    const e = estrategia ? estrategiaPorId(estrategia) : undefined;
    return e
      ? `Quero usar a estratégia "${e.titulo}" (${e.resumo}) nesta aula.

Série: 
Conteúdo: 
Objetivo: 
`
      : "";
  });
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [alternados, setAlternados] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusIA | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const { visao } = useAcesso();
  const escola = visao?.tipo === "professor" ? visao.escola : null;
  const [situacao, setSituacao] = useState<SituacaoPlano | null>(null);

  useEffect(() => {
    if (!escola) return;
    situacaoDoPlano(escola)
      .then(setSituacao)
      .catch((e: unknown) => console.error(e));
  }, [escola, carregando]);

  const restante = situacao ? creditosRestantes(situacao) : null;
  const semCreditos = restante !== null && restante <= 0;

  useEffect(() => {
    obterStatusIA()
      .then(setStatus)
      .catch((e: unknown) => console.error(e));
  }, []);

  const incluidoPorPadrao = (a: Aluno) => !(status?.gratuita && !a.exemplo);
  const incluido = (a: Aluno) => incluidoPorPadrao(a) !== alternados.includes(a.id);
  const turma = alunos.filter(incluido);
  const curto = texto.trim().length < 15 && anexos.length === 0;

  function alternarAluno(id: string) {
    setAlternados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  async function enviar() {
    if (curto || carregando || semCreditos) return;
    setCarregando(true);
    setErro("");

    const nomes: Record<string, string> = {};
    const perfis: PerfilAnonimo[] = turma.map((a, i) => {
      const rotulo = `Aluno ${i + 1}`;
      nomes[rotulo] = a.nome;
      return perfilAnonimoDe(a, rotulo);
    });

    try {
      const resposta = await adaptarAula(texto.trim(), perfis, escola, anexos);
      if (!resposta.ok) {
        setErro(resposta.erro);
        return;
      }
      const salvo = await salvarPlano({
        original:
          texto.trim() || `Plano a partir dos anexos: ${anexos.map((a) => a.nome).join(", ")}`,
        resultado: resposta.plano,
        nomes,
        alunosIds: turma.map((a) => a.id),
      });
      registrarAtividade(XP_PLANO);
      navigate({ to: "/planejamento/resultado", search: { id: salvo.id } });
    } catch (e) {
      console.error(e);
      setErro(
        "Não foi possível falar com o servidor. Verifique se o app está rodando e tente de novo.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Planejamento de aula"
        subtitle="Cole seu planejamento e deixe a IA tornar sua aula mais inclusiva para a sua turma."
      />

      {carregando ? <LumisPlanejando /> : null}

      <form
        className={cn("card-soft p-5 sm:p-6", carregando && "hidden")}
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <label htmlFor="plano" className="mb-2 block text-sm font-semibold">
          Seu plano de aula
        </label>
        <Textarea
          id="plano"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={carregando}
          placeholder="Cole aqui seu plano de aula (série, objetivo, etapas, materiais e avaliação) ou anexe o arquivo abaixo. Se anexar uma atividade, conte aqui o que quer: ex.: “adaptar esta prova de ciências do 5º ano”."
          className="min-h-44 resize-y rounded-xl bg-card text-sm"
        />
        <div className="mt-2 flex justify-end text-xs text-muted-foreground">
          {texto.length} caracteres
        </div>
        <AnexosDaAula anexos={anexos} onChange={setAnexos} desativado={carregando} />

        {alunos.length > 0 ? (
          <fieldset className="mt-3">
            <legend className="mb-2 text-xs font-semibold text-muted-foreground">
              Alunos desta turma ({turma.length} de {alunos.length}) — clique para incluir ou tirar
            </legend>
            <div className="flex flex-wrap gap-2">
              {alunos.map((a) => {
                const ativo = incluido(a);
                const perfil = a.tags.length ? a.tags : necessidadesDe(a).slice(0, 2);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={ativo}
                    disabled={carregando}
                    onClick={() => alternarAluno(a.id)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      ativo
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground line-through",
                    )}
                  >
                    {a.nome.split(" ")[0]}
                    {perfil.length ? ` · ${perfil.join(", ")}` : ""}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Os nomes dos alunos não são enviados à IA — só
              o perfil, de forma anônima.{" "}
              <Link to="/dados" className="font-semibold text-primary">
                Saiba mais
              </Link>
            </p>
          </fieldset>
        ) : null}

        {status?.gratuita ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Versão com IA gratuita (Google Gemini).</strong> Nesse plano, o Google pode
              usar e revisar o conteúdo enviado. Por isso, só os alunos de exemplo entram por
              padrão: use perfis fictícios e não cole dados reais de crianças.{" "}
              <Link to="/dados" className="font-semibold text-primary">
                Saiba mais
              </Link>
            </span>
          </div>
        ) : null}

        {status && !status.configurada ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              A IA ainda não foi configurada neste servidor. Cadastre a chave GEMINI_API_KEY na
              hospedagem para ativar a adaptação.
            </span>
          </div>
        ) : null}

        {erro ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        {situacao ? <Creditos situacao={situacao} restante={restante} /> : null}

        <button
          type="submit"
          disabled={curto || carregando || semCreditos}
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" /> Adaptar aula com IA
        </button>
      </form>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Meus planejamentos</h2>
      {planos.length === 0 ? (
        <div className="card-soft p-6 text-center">
          <p className="text-sm text-muted-foreground">Seus planos adaptados vão aparecer aqui.</p>
          <Link
            to="/planejamento/resultado"
            className="mt-3 inline-flex text-sm font-semibold text-primary"
          >
            Ver um exemplo de plano adaptado →
          </Link>
        </div>
      ) : (
        <div className="card-soft divide-y divide-border overflow-hidden">
          {planos.map((p) => (
            <div key={p.id} className="flex items-center gap-2 pr-3">
              <Link
                to="/planejamento/resultado"
                search={{ id: p.id }}
                className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.resultado.titulo}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {p.resultado.serie} ·{" "}
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
                onClick={() =>
                  void removerPlano(p.id).catch((e: unknown) => {
                    console.error(e);
                    window.alert(
                      "Não foi possível excluir o plano. Confira sua conexão e tente de novo.",
                    );
                  })
                }
                aria-label={`Excluir ${p.resultado.titulo}`}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-coral-soft hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
