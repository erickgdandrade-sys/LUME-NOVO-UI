import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Pencil,
  Plus,
  School,
  UserPlus,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { useEscolaDoGestor } from "@/lib/acesso";
import { definirRecolhidas, useRecolhida } from "@/lib/secoes-recolhidas";
import { supabase } from "@/lib/supabase";
import { exigir, useDados } from "@/lib/usar-dados";

export const Route = createFileRoute("/gestor/turmas")({
  head: () => ({ meta: [{ title: "Turmas | Gestão | Lume" }] }),
  component: Turmas,
});

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
  "1ª série (EM)",
  "2ª série (EM)",
  "3ª série (EM)",
];
const TURNOS = ["Manhã", "Tarde", "Noite", "Integral"];

type Turma = {
  id: string;
  nome: string;
  serie: string | null;
  turno: string | null;
  ano_letivo: number;
  ativa: boolean;
};
type Ligacao = { turma: string; professor: string; disciplina: string | null };
type Professor = { id: string; nome: string };

const seletor =
  "h-10 w-full cursor-pointer rounded-xl border border-input bg-card px-4 text-sm shadow-sm";

function Turmas() {
  const escola = useEscolaDoGestor();
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    if (!escola) return null;
    const sb = supabase();
    const [turmas, vinculos] = await Promise.all([
      sb
        .from("turmas")
        .select("id, nome, serie, turno, ano_letivo, ativa")
        .eq("escola", escola.id)
        .order("ativa", { ascending: false })
        .order("nome"),
      sb
        .from("vinculos")
        .select("usuario")
        .eq("escola", escola.id)
        .eq("papel", "professor")
        .eq("ativo", true),
    ]);
    const listaTurmas = exigir(turmas) as Turma[];
    const ids = (exigir(vinculos) as { usuario: string }[]).map((v) => v.usuario);
    const [ligacoes, perfis] = await Promise.all([
      listaTurmas.length
        ? sb
            .from("turma_professores")
            .select("turma, professor, disciplina")
            .in(
              "turma",
              listaTurmas.map((t) => t.id),
            )
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? sb.from("perfis").select("id, nome, email").in("id", ids)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const professores = (
      exigir(perfis) as { id: string; nome: string | null; email: string | null }[]
    ).map((p) => ({ id: p.id, nome: p.nome || p.email || "Sem nome" }));
    return {
      turmas: listaTurmas,
      ligacoes: exigir(ligacoes) as Ligacao[],
      professores: professores.sort((a, b) => a.nome.localeCompare(b.nome)),
    };
  }, [escola?.id]);

  const [criando, setCriando] = useState(false);

  return (
    <div>
      <PageHeader
        title="Turmas"
        subtitle="Crie as turmas da escola e vincule os professores de cada uma."
        action={
          <button
            type="button"
            onClick={() => setCriando((v) => !v)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova turma
          </button>
        }
      />

      {criando && escola ? (
        <FormTurma
          escola={escola.id}
          onSalvo={() => {
            setCriando(false);
            void recarregar();
          }}
          onCancelar={() => setCriando(false)}
        />
      ) : null}

      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando turmas…
        </p>
      ) : null}

      {dados && dados.turmas.length > 1 ? (
        <div className="mb-3 flex justify-end gap-2">
          {(
            [
              [true, "Abrir todas"],
              [false, "Fechar todas"],
            ] as const
          ).map(([abrir, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              onClick={() =>
                definirRecolhidas(
                  dados.turmas.map((t) => `turma-aberta-${t.id}`),
                  abrir,
                )
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" /> {rotulo}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {dados?.turmas.map((t) => (
          <CartaoTurma
            key={t.id}
            turma={t}
            escola={escola?.id ?? ""}
            ligacoes={dados.ligacoes.filter((l) => l.turma === t.id)}
            professores={dados.professores}
            onMudou={() => void recarregar()}
          />
        ))}
      </div>

      {dados && dados.turmas.length === 0 ? (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Nenhuma turma ainda. Clique em “Nova turma” para criar a primeira.
        </p>
      ) : null}
    </div>
  );
}

function FormTurma({
  escola,
  turma,
  onSalvo,
  onCancelar,
}: {
  escola: string;
  turma?: Turma;
  onSalvo: () => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(turma?.nome ?? "");
  const [serie, setSerie] = useState(turma?.serie ?? "");
  const [turno, setTurno] = useState(turma?.turno ?? "");
  const [ano, setAno] = useState(String(turma?.ano_letivo ?? new Date().getFullYear()));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome para a turma, como “6º Ano A”.");
    const anoLetivo = Number(ano);
    if (!Number.isInteger(anoLetivo) || anoLetivo < 2000 || anoLetivo > 2100) {
      return setErro("Ano letivo inválido.");
    }
    setSalvando(true);
    const valores = {
      nome: nome.trim(),
      serie: serie || null,
      turno: turno || null,
      ano_letivo: anoLetivo,
    };
    const sb = supabase().from("turmas");
    const { error } = turma
      ? await sb.update(valores).eq("id", turma.id)
      : await sb.insert({ ...valores, escola });
    setSalvando(false);
    if (error) return setErro(mensagemDaTurma(error.message));
    onSalvo();
  }

  return (
    <form
      onSubmit={(e) => void salvar(e)}
      className="card-soft mb-6 grid gap-3 p-5 sm:grid-cols-2"
      noValidate
    >
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da turma (ex.: 6º Ano A)"
        aria-label="Nome da turma"
        className="h-10 rounded-lg bg-card px-4 sm:col-span-2"
        autoFocus
      />
      <select
        value={serie}
        onChange={(e) => setSerie(e.target.value)}
        aria-label="Série"
        className={seletor}
      >
        <option value="">Série (opcional)</option>
        {SERIES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={turno}
          onChange={(e) => setTurno(e.target.value)}
          aria-label="Turno"
          className={seletor}
        >
          <option value="">Turno</option>
          {TURNOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Input
          value={ano}
          onChange={(e) => setAno(e.target.value)}
          inputMode="numeric"
          aria-label="Ano letivo"
          className="h-10 rounded-lg bg-card px-4"
        />
      </div>
      {erro ? <p className="text-xs text-destructive sm:col-span-2">{erro}</p> : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={onCancelar}
          className="h-10 cursor-pointer rounded-xl border border-border bg-card px-5 text-sm font-semibold hover:bg-accent"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {turma ? "Salvar" : "Criar turma"}
        </button>
      </div>
    </form>
  );
}

function CartaoTurma({
  turma,
  escola,
  ligacoes,
  professores,
  onMudou,
}: {
  turma: Turma;
  escola: string;
  ligacoes: Ligacao[];
  professores: Professor[];
  onMudou: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [fechada, alternar] = useRecolhida(`turma-aberta-${turma.id}`, true);
  const [professor, setProfessor] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [erro, setErro] = useState("");
  const nomeDe = (id: string) =>
    professores.find((p) => p.id === id)?.nome ?? "Professor desativado";
  const disponiveis = professores.filter((p) => !ligacoes.some((l) => l.professor === p.id));

  async function vincular(e: FormEvent) {
    e.preventDefault();
    if (!professor) return setErro("Escolha um professor.");
    const { error } = await supabase()
      .from("turma_professores")
      .insert({ turma: turma.id, professor, disciplina: disciplina.trim() || null });
    if (error) return setErro("Não foi possível vincular.");
    setProfessor("");
    setDisciplina("");
    setErro("");
    onMudou();
  }

  async function desvincular(id: string) {
    await supabase().from("turma_professores").delete().eq("turma", turma.id).eq("professor", id);
    onMudou();
  }

  async function alternarAtiva() {
    const { error } = await supabase()
      .from("turmas")
      .update({ ativa: !turma.ativa })
      .eq("id", turma.id);
    if (error) return setErro(mensagemDaTurma(error.message));
    onMudou();
  }

  if (editando) {
    return (
      <FormTurma
        escola={escola}
        turma={turma}
        onSalvo={() => {
          setEditando(false);
          onMudou();
        }}
        onCancelar={() => setEditando(false)}
      />
    );
  }

  return (
    <section className={`card-soft p-5 ${turma.ativa ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!fechada}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-leaf-soft">
            <School className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${fechada ? "-rotate-90" : ""}`}
              />
              <span className="truncate font-display text-lg font-semibold">{turma.nome}</span>
            </span>
            <span className="block text-xs text-muted-foreground">
              {[turma.serie, turma.turno, turma.ano_letivo].filter(Boolean).join(" · ")}
              {turma.ativa ? "" : " · inativa"}
              {fechada
                ? ` · ${ligacoes.length} ${ligacoes.length === 1 ? "professor" : "professores"}`
                : ""}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Editar ${turma.nome}`}
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card hover:bg-accent"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      {fechada ? null : (
        <>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">Professores</p>
          {ligacoes.length === 0 ? (
            <p className="mt-1 text-sm italic text-muted-foreground">Nenhum professor vinculado.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {ligacoes.map((l) => (
                <li key={l.professor} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className="font-medium">{nomeDe(l.professor)}</span>
                    {l.disciplina ? (
                      <span className="text-muted-foreground"> · {l.disciplina}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => void desvincular(l.professor)}
                    aria-label={`Tirar ${nomeDe(l.professor)} da turma`}
                    className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-coral-soft"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {turma.ativa ? (
            disponiveis.length > 0 ? (
              <form
                onSubmit={(e) => void vincular(e)}
                className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_auto]"
                noValidate
              >
                <select
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  aria-label="Professor"
                  className={seletor}
                >
                  <option value="">Professor…</option>
                  {disponiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <Input
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Disciplina (opcional)"
                  aria-label="Disciplina"
                  className="h-10 rounded-lg bg-card px-4"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  <UserPlus className="h-4 w-4" /> Vincular
                </button>
                {erro ? <p className="text-xs text-destructive sm:col-span-3">{erro}</p> : null}
              </form>
            ) : professores.length === 0 ? (
              <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                Convide professores em “Professores” para vinculá-los às turmas.
              </p>
            ) : null
          ) : null}

          <button
            type="button"
            onClick={() => void alternarAtiva()}
            className="mt-4 cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            {turma.ativa ? "Desativar turma" : "Reativar turma"}
          </button>
        </>
      )}
    </section>
  );
}

function mensagemDaTurma(erro: string) {
  if (erro.includes("permite até")) {
    return `${erro} Desative uma turma antiga ou peça para ampliar o plano no painel da escola.`;
  }
  return "Não foi possível salvar a turma.";
}
