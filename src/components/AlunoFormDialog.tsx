import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Lock, Plus, X } from "lucide-react";
import { FotoDoAluno } from "@/components/FotoDoAluno";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adicionarAluno, atualizarAluno, type AlunoDados } from "@/lib/alunos-store";
import { prepararFoto } from "@/lib/foto-aluno";
import type { Aluno } from "@/lib/lume-data";
import { useEstadoNuvem, useMinhasTurmas } from "@/lib/nuvem";
import { contasReais } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const SERIES = [
  "Educação Infantil",
  "1º ano",
  "2º ano",
  "3º ano",
  "4º ano",
  "5º ano",
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
  "Ensino Médio",
];

const NECESSIDADES = [
  "Apoio visual",
  "Instruções em etapas",
  "Rotina previsível",
  "Tempo extra",
  "Pausas frequentes",
  "Ambiente com menos ruído",
  "Apoio na leitura",
  "Apoio na escrita",
  "Comunicação alternativa",
  "Mais desafio",
];

const DIAGNOSTICOS = [
  "TEA",
  "TDAH",
  "Dislexia",
  "Discalculia",
  "Deficiência intelectual",
  "Deficiência auditiva",
  "Deficiência visual",
  "Deficiência física",
  "Altas habilidades",
];

const SUGESTOES = {
  funcionam: [
    "Instruções curtas e numeradas",
    "Apoio visual (imagens, esquemas)",
    "Aviso antes de mudanças na rotina",
    "Elogio logo depois da tarefa",
    "Trabalhar em dupla",
    "Material concreto para manipular",
    "Pausas curtas entre as atividades",
    "Sentar perto do professor",
  ],
  naoFuncionam: [
    "Pedidos longos só falados",
    "Responder em voz alta sem preparo",
    "Mudanças sem aviso",
    "Tirar o recreio como castigo",
    "Muito barulho na sala",
    "Tarefas longas sem pausa",
  ],
  caracteristicas: [
    "Comunicativo",
    "Tímido no começo",
    "Curioso",
    "Criativo",
    "Prefere rotina",
    "Gosta de ajudar os colegas",
  ],
  preferencias: [
    "Atividades com imagens e vídeos",
    "Responder por desenho ou áudio",
    "Atividades práticas",
    "Trabalhar sozinho",
    "Jogos e desafios",
  ],
  sensorial: [
    "Incomoda-se com barulho alto",
    "Sensível a luz forte",
    "Usa fone abafador",
    "Precisa se movimentar",
    "Evita toque",
    "Sensível a texturas",
  ],
};

const SUPORTES: { valor: Aluno["suporte"]; texto: string }[] = [
  { valor: "Leve", texto: "Pequenos ajustes, como tempo extra ou apoio visual." },
  { valor: "Médio", texto: "Adaptações frequentes nas atividades e na rotina." },
  { valor: "Alto", texto: "Apoio constante, muitas vezes de um profissional." },
];

const ETAPAS = ["Quem é", "Como aprende", "O que funciona", "Mais sobre o aluno"] as const;

type Valores = {
  turma: string;
  nome: string;
  serie: string;
  idade: string;
  suporte: Aluno["suporte"];
  necessidades: string[];
  tags: string[];
  resumo: string;
  funcionam: string[];
  naoFuncionam: string[];
  caracteristicas: string[];
  preferencias: string[];
  sensorial: string[];
  familia: string;
  foto: string | null;
};

function valoresIniciais(aluno: Aluno | undefined, turmaPadrao: string): Valores {
  return {
    turma: aluno?.turma ?? turmaPadrao,
    nome: aluno?.nome ?? "",
    serie: aluno?.serie ?? "4º ano",
    idade: aluno && aluno.idade ? String(aluno.idade) : "",
    suporte: aluno?.suporte ?? "Leve",
    necessidades: aluno?.necessidades ?? [],
    tags: aluno?.tags ?? [],
    resumo: aluno?.resumo ?? "",
    funcionam: aluno?.funcionam ?? [],
    naoFuncionam: aluno?.naoFuncionam ?? [],
    caracteristicas: aluno?.caracteristicas ?? [],
    preferencias: aluno?.preferencias ?? [],
    sensorial: aluno?.sensorial ?? [],
    familia: aluno?.familia ?? "",
    foto: aluno?.foto ?? null,
  };
}

const chip = (ativo: boolean) =>
  cn(
    "inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
    ativo
      ? "bg-primary text-primary-foreground"
      : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
  );

function Escolhas({
  opcoes,
  selecionadas,
  onChange,
  rotulo,
}: {
  opcoes: string[];
  selecionadas: string[];
  onChange: (v: string[]) => void;
  rotulo: string;
}) {
  const [outro, setOutro] = useState("");
  const adicionar = () => {
    const t = outro.trim();
    if (t && !selecionadas.includes(t)) onChange([...selecionadas, t]);
    setOutro("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={rotulo}>
        {[...opcoes, ...selecionadas.filter((s) => !opcoes.includes(s))].map((o) => {
          const ativo = selecionadas.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={ativo}
              onClick={() =>
                onChange(ativo ? selecionadas.filter((s) => s !== o) : [...selecionadas, o])
              }
              className={chip(ativo)}
            >
              {ativo ? <Check className="h-3 w-3" /> : null}
              {o}
            </button>
          );
        })}
      </div>
      <CampoAdicionar valor={outro} onValor={setOutro} onAdicionar={adicionar} rotulo={rotulo} />
    </div>
  );
}

function CampoAdicionar({
  valor,
  onValor,
  onAdicionar,
  rotulo,
  exemplo = "Escreva outro e aperte Enter",
}: {
  valor: string;
  onValor: (v: string) => void;
  onAdicionar: () => void;
  rotulo: string;
  exemplo?: string;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <Input
        value={valor}
        onChange={(e) => onValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdicionar();
          }
        }}
        placeholder={exemplo}
        aria-label={`Adicionar: ${rotulo}`}
        className="h-10 rounded-lg bg-card px-4"
      />
      <button
        type="button"
        onClick={onAdicionar}
        disabled={!valor.trim()}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-4 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar
      </button>
    </div>
  );
}

function Lista({
  titulo,
  dica,
  itens,
  sugestoes,
  onChange,
  tom = "bg-leaf-soft",
}: {
  titulo: string;
  dica: string;
  itens: string[];
  sugestoes: string[];
  onChange: (v: string[]) => void;
  tom?: string;
}) {
  const [novo, setNovo] = useState("");
  const adicionar = (t: string) => {
    const limpo = t.trim();
    if (limpo && !itens.includes(limpo)) onChange([...itens, limpo]);
    setNovo("");
  };
  const restantes = sugestoes.filter((s) => !itens.includes(s));
  return (
    <fieldset className="rounded-2xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{titulo}</legend>
      <p className="text-xs text-muted-foreground">{dica}</p>
      {itens.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {itens.map((i) => (
            <li
              key={i}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                tom,
              )}
            >
              {i}
              <button
                type="button"
                onClick={() => onChange(itens.filter((x) => x !== i))}
                aria-label={`Tirar ${i}`}
                className="cursor-pointer rounded-full p-0.5 hover:bg-black/10"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {restantes.length ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Sugestões
          </p>
          <div className="flex flex-wrap gap-2">
            {restantes.map((s) => (
              <button key={s} type="button" onClick={() => adicionar(s)} className={chip(false)}>
                <Plus className="h-3 w-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <CampoAdicionar
        valor={novo}
        onValor={setNovo}
        onAdicionar={() => adicionar(novo)}
        rotulo={titulo}
      />
    </fieldset>
  );
}

function CampoFoto({
  nome,
  foto,
  onChange,
}: {
  nome: string;
  foto: string | null;
  onChange: (foto: string | null) => void;
}) {
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro("");
    if (!arquivo.type.startsWith("image/")) return setErro("Escolha uma imagem (JPG ou PNG).");
    setLendo(true);
    try {
      onChange(await prepararFoto(arquivo));
    } catch (e) {
      console.error(e);
      setErro("Não foi possível usar essa imagem. Tente outra.");
    } finally {
      setLendo(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <FotoDoAluno
        nome={nome || "?"}
        foto={foto}
        className="h-16 w-16 rounded-3xl bg-sky-soft text-lg"
      />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            {lendo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {foto ? "Trocar foto" : "Adicionar foto"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void escolher(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {foto ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Tirar foto
            </button>
          ) : null}
        </div>
        {erro ? (
          <p className="text-xs text-destructive">{erro}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Opcional. Ajuda a reconhecer o aluno; use só com autorização da família.
          </p>
        )}
      </div>
    </div>
  );
}

const campoClasse = "rounded-xl bg-card";

export function AlunoFormDialog({
  aluno,
  trigger,
  onSalvo,
  turmaPadrao = "",
  etapaInicial = 0,
}: {
  aluno?: Aluno;
  trigger: ReactNode;
  onSalvo?: (aluno: Aluno) => void;
  turmaPadrao?: string;
  etapaInicial?: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [v, setV] = useState<Valores>(() => valoresIniciais(aluno, turmaPadrao));
  const [erros, setErros] = useState<Partial<Record<"nome" | "idade", string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const [comLaudo, setComLaudo] = useState(Boolean(aluno?.tags.length));
  const turmas = useMinhasTurmas();
  const nuvem = useEstadoNuvem().situacao === "pronta";

  const editando = Boolean(aluno);
  const ultima = etapa === ETAPAS.length - 1;
  const set = <K extends keyof Valores>(campo: K, valor: Valores[K]) =>
    setV((atual) => ({ ...atual, [campo]: valor }));

  function abrirOuFechar(abrir: boolean) {
    if (abrir) {
      setV(valoresIniciais(aluno, turmaPadrao));
      setErros({});
      setErroSalvar("");
      setEtapa(etapaInicial);
      setComLaudo(Boolean(aluno?.tags.length));
    }
    setAberto(abrir);
  }

  function validarBasico() {
    const idade = Number(v.idade);
    const novos: typeof erros = {};
    if (v.nome.trim().length < 2) novos.nome = "Informe um nome, apelido ou iniciais.";
    if (!Number.isInteger(idade) || idade < 2 || idade > 20)
      novos.idade = "Informe uma idade entre 2 e 20 anos.";
    setErros(novos);
    if (Object.keys(novos).length) {
      setEtapa(0);
      return false;
    }
    return true;
  }

  function irPara(n: number) {
    if (n > 0 && !validarBasico()) return;
    setEtapa(n);
  }

  async function salvar() {
    if (!validarBasico()) return;
    const dados: AlunoDados = {
      turma: v.turma || null,
      nome: v.nome.trim(),
      serie: v.serie,
      idade: Number(v.idade),
      suporte: v.suporte,
      necessidades: v.necessidades,
      tags: comLaudo ? v.tags : [],
      resumo: v.resumo.trim(),
      funcionam: v.funcionam,
      naoFuncionam: v.naoFuncionam,
      caracteristicas: v.caracteristicas,
      preferencias: v.preferencias,
      sensorial: v.sensorial,
      familia: v.familia.trim(),
      foto: v.foto,
    };
    setSalvando(true);
    setErroSalvar("");
    try {
      if (aluno) {
        await atualizarAluno(aluno.id, dados);
        onSalvo?.({ ...aluno, ...dados });
      } else {
        onSalvo?.(await adicionarAluno(dados));
      }
      setAberto(false);
    } catch (erro) {
      console.error(erro);
      setErroSalvar("Não foi possível salvar o aluno. Confira sua conexão e tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (ultima) void salvar();
    else irPara(etapa + 1);
  }

  return (
    <Dialog open={aberto} onOpenChange={abrirOuFechar}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 pt-6 pb-4 text-left">
          <DialogTitle className="font-display text-xl font-semibold">
            {editando ? `Editar perfil de ${aluno?.nome}` : "Cadastrar aluno"}
          </DialogTitle>
          <DialogDescription>
            {contasReais
              ? "Fica salvo na sua conta, visível só para os professores da turma."
              : "Fica salvo apenas neste navegador."}
          </DialogDescription>
          <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Etapas do cadastro">
            {ETAPAS.map((nome, i) => (
              <li key={nome}>
                <button
                  type="button"
                  onClick={() => irPara(i)}
                  aria-current={i === etapa ? "step" : undefined}
                  className="group w-full cursor-pointer text-left"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-colors",
                      i <= etapa ? "bg-primary" : "bg-secondary",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-1.5 block truncate text-[11px] font-semibold",
                      i === etapa
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {i + 1}. {nome}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {etapa === 0 ? (
              <>
                <CampoFoto nome={v.nome} foto={v.foto} onChange={(f) => set("foto", f)} />
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome ou apelido *</Label>
                  <Input
                    id="nome"
                    value={v.nome}
                    onChange={(e) => set("nome", e.target.value)}
                    placeholder="Ex.: Ana B. ou Aninha"
                    aria-invalid={Boolean(erros.nome)}
                    className={cn(campoClasse, "h-11")}
                    autoFocus
                  />
                  {erros.nome ? (
                    <p className="text-xs text-destructive">{erros.nome}</p>
                  ) : (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> Para proteger a criança, prefira iniciais ou
                      apelido.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="idade">Idade *</Label>
                    <Input
                      id="idade"
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={20}
                      value={v.idade}
                      onChange={(e) => set("idade", e.target.value)}
                      placeholder="9"
                      aria-invalid={Boolean(erros.idade)}
                      className={cn(campoClasse, "h-11")}
                    />
                    {erros.idade ? <p className="text-xs text-destructive">{erros.idade}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="serie">Série</Label>
                    <select
                      id="serie"
                      value={v.serie}
                      onChange={(e) => set("serie", e.target.value)}
                      className="flex h-11 w-full cursor-pointer rounded-xl border border-input bg-card px-3 text-sm"
                    >
                      {SERIES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {nuvem ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="turma">Turma</Label>
                    <select
                      id="turma"
                      value={v.turma}
                      onChange={(e) => set("turma", e.target.value)}
                      className="flex h-11 w-full cursor-pointer rounded-xl border border-input bg-card px-3 text-sm"
                    >
                      <option value="">Sem turma (só eu vejo)</option>
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                          {t.disciplina ? ` · ${t.disciplina}` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {turmas.length
                        ? "Os professores da mesma turma veem e atualizam o perfil juntos."
                        : "Você ainda não tem turmas: a coordenação vincula você a elas."}
                    </p>
                  </div>
                ) : null}
                <p className="rounded-2xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
                  Só estes campos são obrigatórios. Você pode salvar agora e completar o resto
                  depois.
                </p>
              </>
            ) : null}

            {etapa === 1 ? (
              <>
                <fieldset>
                  <legend className="text-sm font-semibold">Nível de suporte</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {SUPORTES.map((s) => (
                      <button
                        key={s.valor}
                        type="button"
                        aria-pressed={v.suporte === s.valor}
                        onClick={() => set("suporte", s.valor)}
                        className={cn(
                          "cursor-pointer rounded-2xl border-2 p-3 text-left transition-colors",
                          v.suporte === s.valor
                            ? "border-primary bg-accent"
                            : "border-border bg-card hover:border-primary/50",
                        )}
                      >
                        <span className="block text-sm font-bold">{s.valor}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {s.texto}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-semibold">Necessidades observadas</legend>
                  <p className="mb-2 text-xs text-muted-foreground">
                    O que você percebe em sala. Não é preciso ter laudo.
                  </p>
                  <Escolhas
                    opcoes={NECESSIDADES}
                    selecionadas={v.necessidades}
                    onChange={(x) => set("necessidades", x)}
                    rotulo="Necessidades observadas"
                  />
                </fieldset>
                <fieldset className="rounded-2xl border border-border p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-semibold">Tem laudo ou diagnóstico?</span>
                      <span className="text-xs text-muted-foreground">
                        Só com informação da família ou da escola. É opcional.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={comLaudo}
                      onChange={(e) => setComLaudo(e.target.checked)}
                      className="h-5 w-5 cursor-pointer accent-[var(--color-primary)]"
                    />
                  </label>
                  {comLaudo ? (
                    <div className="mt-3">
                      <Escolhas
                        opcoes={DIAGNOSTICOS}
                        selecionadas={v.tags}
                        onChange={(x) => set("tags", x)}
                        rotulo="Diagnósticos"
                      />
                    </div>
                  ) : null}
                </fieldset>
              </>
            ) : null}

            {etapa === 2 ? (
              <>
                <p className="rounded-2xl bg-sky-soft px-4 py-3 text-xs">
                  Isso é o que mais ajuda a Lumis a adaptar suas aulas. Clique nas sugestões ou
                  escreva com suas palavras. Evite nomes de pessoas.
                </p>
                <Lista
                  titulo="O que funciona com este aluno"
                  dica="Estratégias que dão certo em sala."
                  itens={v.funcionam}
                  sugestoes={SUGESTOES.funcionam}
                  onChange={(x) => set("funcionam", x)}
                />
                <Lista
                  titulo="O que evitar"
                  dica="O que costuma atrapalhar ou desregular o aluno."
                  itens={v.naoFuncionam}
                  sugestoes={SUGESTOES.naoFuncionam}
                  onChange={(x) => set("naoFuncionam", x)}
                  tom="bg-coral-soft"
                />
              </>
            ) : null}

            {etapa === 3 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Tudo aqui é opcional, mas deixa o perfil mais completo.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="resumo">Resumo</Label>
                  <Textarea
                    id="resumo"
                    value={v.resumo}
                    onChange={(e) => set("resumo", e.target.value)}
                    placeholder="Em uma frase: como esse aluno aprende melhor?"
                    className={cn(campoClasse, "min-h-16 resize-y")}
                  />
                </div>
                <Lista
                  titulo="Características"
                  dica="Como o aluno é no dia a dia."
                  itens={v.caracteristicas}
                  sugestoes={SUGESTOES.caracteristicas}
                  onChange={(x) => set("caracteristicas", x)}
                  tom="bg-lilac-soft"
                />
                <Lista
                  titulo="Preferências"
                  dica="Do que gosta e como prefere trabalhar."
                  itens={v.preferencias}
                  sugestoes={SUGESTOES.preferencias}
                  onChange={(x) => set("preferencias", x)}
                  tom="bg-sun-soft"
                />
                <Lista
                  titulo="Aspectos sensoriais"
                  dica="Sons, luz, toque e movimento."
                  itens={v.sensorial}
                  sugestoes={SUGESTOES.sensorial}
                  onChange={(x) => set("sensorial", x)}
                  tom="bg-sky-soft"
                />
                <div className="space-y-1.5">
                  <Label htmlFor="familia">Relato da família</Label>
                  <Textarea
                    id="familia"
                    value={v.familia}
                    onChange={(e) => set("familia", e.target.value)}
                    placeholder="O que a família compartilhou sobre a rotina em casa"
                    className={cn(campoClasse, "min-h-20 resize-y")}
                  />
                  <p className="text-xs text-muted-foreground">
                    O relato da família nunca é enviado para a IA.
                  </p>
                </div>
              </>
            ) : null}

            {erroSalvar ? (
              <p role="alert" className="rounded-2xl bg-coral-soft px-4 py-3 text-sm">
                {erroSalvar}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
            {etapa > 0 ? (
              <button
                type="button"
                onClick={() => setEtapa(etapa - 1)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {!ultima ? (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void salvar()}
                  className="cursor-pointer rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  {salvando ? "Salvando…" : editando ? "Salvar" : "Salvar e completar depois"}
                </button>
              ) : null}
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {ultima ? (
                  salvando ? (
                    "Salvando…"
                  ) : editando ? (
                    "Salvar alterações"
                  ) : (
                    "Cadastrar aluno"
                  )
                ) : (
                  <>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
