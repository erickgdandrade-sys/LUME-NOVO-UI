import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  FileCheck2,
  FileDown,
  HeartHandshake,
  Loader2,
  Pencil,
  Printer,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { obterStatusIA } from "@/lib/adaptar-aula";
import { necessidadesDe, perfilAnonimoDe, useAlunos } from "@/lib/alunos-store";
import type { Aluno } from "@/lib/lume-data";
import type { StatusIA } from "@/lib/plano-schema";
import { adaptarProva } from "@/lib/prova";
import {
  LETRAS,
  MAX_ALUNOS_POR_VEZ,
  assinaturaDaProva,
  paraVersao,
  type Prova,
  type QuestaoAdaptada,
  type VersaoAdaptada,
} from "@/lib/prova-schema";
import { cn } from "@/lib/utils";

type Acao = (modo: "prova" | "gabarito", versao: VersaoAdaptada) => void;

const botao =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";

function nomeDaVersao(v: VersaoAdaptada, alunos: Aluno[]) {
  return alunos.find((a) => a.id === v.alunoId)?.nome ?? "Aluno removido";
}

export function VersoesDaProva({
  prova,
  escola,
  onMudar,
  onImprimir,
  onWord,
}: {
  prova: Prova;
  escola: string | null;
  onMudar: (versoes: VersaoAdaptada[]) => void;
  onImprimir: Acao;
  onWord: Acao;
}) {
  const alunos = useAlunos();
  const versoes = prova.versoes ?? [];
  const [marcados, setMarcados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState<StatusIA | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const assinatura = assinaturaDaProva(prova.questoes);
  const semEnunciado = prova.questoes.some((q) => !q.enunciado.trim());

  useEffect(() => {
    obterStatusIA()
      .then(setStatus)
      .catch((e: unknown) => console.error(e));
  }, []);

  function alternar(id: string) {
    setMarcados((m) =>
      m.includes(id) ? m.filter((x) => x !== id) : m.length < MAX_ALUNOS_POR_VEZ ? [...m, id] : m,
    );
  }

  async function gerar(ids: string[]) {
    const escolhidos = ids
      .map((id) => alunos.find((a) => a.id === id))
      .filter((a): a is Aluno => !!a);
    if (!escolhidos.length || carregando || semEnunciado) return;
    setCarregando(true);
    setErro("");
    try {
      const rotulos = new Map(escolhidos.map((a, i) => [`Aluno ${i + 1}`, a.id]));
      const r = await adaptarProva(
        {
          titulo: prova.titulo.slice(0, 200),
          disciplina: prova.cabecalho.disciplina.slice(0, 60),
          serie: prova.cabecalho.serie.slice(0, 40),
          questoes: prova.questoes.slice(0, 30).map((q) => ({
            tipo: q.tipo,
            enunciado: q.enunciado.slice(0, 4000),
            alternativas: q.alternativas.slice(0, 6).map((a) => a.slice(0, 1000)),
            correta: q.correta,
            resposta: q.resposta.slice(0, 4000),
            dificuldade: q.dificuldade,
            habilidade: q.habilidade.slice(0, 300),
          })),
          alunos: escolhidos.map((a, i) => perfilAnonimoDe(a, `Aluno ${i + 1}`)),
        },
        escola,
      );
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      const novas = r.versoes.map((v) => ({
        ...paraVersao(v, prova.questoes, rotulos.get(v.aluno) ?? null),
        rotulo: "Aluno",
      }));
      const trocados = new Set(novas.map((v) => v.alunoId));
      onMudar([...versoes.filter((v) => !trocados.has(v.alunoId)), ...novas]);
      setMarcados([]);
    } finally {
      setCarregando(false);
    }
  }

  function mudarVersao(id: string, f: (v: VersaoAdaptada) => VersaoAdaptada) {
    onMudar(versoes.map((v) => (v.id === id ? f(v) : v)));
  }

  return (
    <section className="mt-10" aria-labelledby="titulo-versoes">
      <h2 id="titulo-versoes" className="font-display text-xl font-semibold">
        Versões adaptadas
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        A mesma prova, com os mesmos conteúdos, ajustada para cada aluno: enunciados mais diretos,
        apoio impresso junto da questão e orientações para você aplicar. Revise antes de imprimir.
      </p>

      {versoes.length ? (
        <ul className="mt-4 space-y-4">
          {versoes.map((v) => (
            <CartaoDaVersao
              key={v.id}
              v={v}
              prova={prova}
              nome={nomeDaVersao(v, alunos)}
              desatualizada={v.assinatura !== assinatura}
              aberta={aberta === v.id}
              ocupado={carregando}
              onAbrir={(sim) => setAberta(sim ? v.id : null)}
              onMudar={(f) => mudarVersao(v.id, f)}
              onRefazer={() => v.alunoId && void gerar([v.alunoId])}
              onRemover={() => {
                if (!window.confirm(`Remover a versão de ${nomeDaVersao(v, alunos)}?`)) return;
                onMudar(versoes.filter((x) => x.id !== v.id));
              }}
              onImprimir={(m) => onImprimir(m, v)}
              onWord={(m) => onWord(m, v)}
              podeRefazer={!!v.alunoId && alunos.some((a) => a.id === v.alunoId)}
            />
          ))}
        </ul>
      ) : null}

      <div className="card-soft mt-4 p-5">
        <p className="font-display text-sm font-bold">
          {versoes.length ? "Adaptar para mais alunos" : "Para quais alunos adaptar?"}
        </p>
        {alunos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre os alunos da turma para gerar versões adaptadas.{" "}
            <Link to="/alunos" className="font-semibold text-primary">
              Ir para Alunos
            </Link>
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha até {MAX_ALUNOS_POR_VEZ} por vez. Cada geração usa 1 crédito.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {alunos.map((a) => {
                const ativo = marcados.includes(a.id);
                const perfil = a.tags.length ? a.tags : necessidadesDe(a).slice(0, 2);
                const temVersao = versoes.some((v) => v.alunoId === a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={ativo}
                    disabled={carregando || (!ativo && marcados.length >= MAX_ALUNOS_POR_VEZ)}
                    onClick={() => alternar(a.id)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      ativo
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {ativo ? <Check className="mr-1 inline h-3 w-3" /> : null}
                    {a.nome.split(" ")[0]}
                    {perfil.length ? ` · ${perfil.join(", ")}` : ""}
                    {temVersao ? " · já tem versão" : ""}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Os nomes não são enviados à IA, só o
              perfil, de forma anônima.
            </p>
            {status?.gratuita &&
            marcados.some((id) => !alunos.find((a) => a.id === id)?.exemplo) ? (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>IA gratuita (Google Gemini):</strong> o Google pode usar o conteúdo
                  enviado. Use perfis fictícios até a escola ter a versão paga.
                </span>
              </div>
            ) : null}
            {semEnunciado ? (
              <p className="mt-3 text-sm font-medium text-destructive">
                Complete o enunciado de todas as questões antes de adaptar.
              </p>
            ) : null}
            {erro ? (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!marcados.length || carregando || semEnunciado}
              onClick={() => void gerar(marcados)}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {carregando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Adaptando… pode levar até 2 minutos
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {marcados.length
                    ? `Gerar ${marcados.length === 1 ? "versão adaptada" : `${marcados.length} versões adaptadas`}`
                    : "Gerar versões adaptadas"}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function CartaoDaVersao({
  v,
  prova,
  nome,
  desatualizada,
  aberta,
  ocupado,
  podeRefazer,
  onAbrir,
  onMudar,
  onRefazer,
  onRemover,
  onImprimir,
  onWord,
}: {
  v: VersaoAdaptada;
  prova: Prova;
  nome: string;
  desatualizada: boolean;
  aberta: boolean;
  ocupado: boolean;
  podeRefazer: boolean;
  onAbrir: (sim: boolean) => void;
  onMudar: (f: (v: VersaoAdaptada) => VersaoAdaptada) => void;
  onRefazer: () => void;
  onRemover: () => void;
  onImprimir: (m: "prova" | "gabarito") => void;
  onWord: (m: "prova" | "gabarito") => void;
}) {
  const mudarQuestao = (base: string, parte: Partial<QuestaoAdaptada>) =>
    onMudar((x) => ({
      ...x,
      questoes: x.questoes.map((q) => (q.base === base ? { ...q, ...parte } : q)),
    }));
  const adaptadas = new Map(v.questoes.map((q) => [q.base, q]));

  return (
    <li className="card-soft p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lilac-soft">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold">{nome}</p>
          {v.perfil ? <p className="text-xs text-muted-foreground">{v.perfil}</p> : null}
        </div>
        <button
          type="button"
          onClick={onRemover}
          aria-label={`Remover a versão de ${nome}`}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-coral-soft hover:text-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {desatualizada ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-sun-soft px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            A prova mudou depois que esta versão foi feita. Gere de novo para acompanhar.
          </span>
          {podeRefazer ? (
            <button type="button" className={botao} disabled={ocupado} onClick={onRefazer}>
              <Sparkles className="h-3.5 w-3.5" /> Gerar de novo
            </button>
          ) : null}
        </div>
      ) : null}

      {v.orientacoes.length ? (
        <div className="mt-3 rounded-2xl bg-secondary/60 px-4 py-3">
          <p className="text-xs font-bold">Como aplicar esta versão</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {v.orientacoes.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {aberta ? (
        <ol className="mt-4 space-y-4">
          {prova.questoes.map((base, i) => {
            const q = adaptadas.get(base.id);
            if (!q) return null;
            const id = `v${v.id}-q${i + 1}`;
            return (
              <li key={base.id} className="rounded-2xl border border-border p-4">
                <p className="text-xs font-bold text-muted-foreground">
                  Questão {i + 1} · {base.tipo === "objetiva" ? "Objetiva" : "Dissertativa"}
                </p>
                <label htmlFor={`${id}-e`} className="sr-only">
                  Enunciado da questão {i + 1}
                </label>
                <Textarea
                  id={`${id}-e`}
                  value={q.enunciado}
                  onChange={(e) =>
                    mudarQuestao(base.id, { enunciado: e.target.value.slice(0, 4000) })
                  }
                  className="mt-2 min-h-20 rounded-xl bg-card text-sm"
                />
                {base.tipo === "objetiva" ? (
                  <div className="mt-2 space-y-2">
                    {q.alternativas.map((a, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`${id}-c`}
                          checked={q.correta === j}
                          onChange={() => mudarQuestao(base.id, { correta: j })}
                          aria-label={`Alternativa ${LETRAS[j]} é a correta`}
                          className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                        />
                        <span className="w-5 shrink-0 text-sm font-semibold">{LETRAS[j]})</span>
                        <Input
                          value={a}
                          aria-label={`Alternativa ${LETRAS[j]} da questão ${i + 1}`}
                          onChange={(e) =>
                            mudarQuestao(base.id, {
                              alternativas: q.alternativas.map((x, k) =>
                                k === j ? e.target.value.slice(0, 1000) : x,
                              ),
                            })
                          }
                          className="h-9 rounded-xl bg-card"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <label
                  htmlFor={`${id}-a`}
                  className="mt-3 block text-xs font-semibold text-muted-foreground"
                >
                  Apoio impresso junto da questão (opcional)
                </label>
                <Textarea
                  id={`${id}-a`}
                  value={q.apoio}
                  onChange={(e) => mudarQuestao(base.id, { apoio: e.target.value.slice(0, 2000) })}
                  className="mt-1 min-h-16 rounded-xl bg-card text-sm"
                />
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            botao,
            aberta && "border-primary bg-primary text-primary-foreground hover:bg-primary",
          )}
          onClick={() => onAbrir(!aberta)}
        >
          {aberta ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {aberta ? "Pronto" : "Ver e editar"}
        </button>
        <button type="button" className={botao} onClick={() => onImprimir("prova")}>
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </button>
        <button type="button" className={botao} onClick={() => onImprimir("gabarito")}>
          <FileCheck2 className="h-3.5 w-3.5" /> Gabarito
        </button>
        <button type="button" className={botao} onClick={() => onWord("prova")}>
          <FileDown className="h-3.5 w-3.5" /> Word
        </button>
      </div>
    </li>
  );
}
