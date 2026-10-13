import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail, Trash2, UserCheck, UserX, X } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { ConvidarForm } from "@/components/ConvidarForm";
import { Input } from "@/components/ui/input";
import { useEscolaDoGestor } from "@/lib/acesso";
import { supabase } from "@/lib/supabase";
import { dataCurta, exigir, useDados } from "@/lib/usar-dados";
import { iniciais } from "@/lib/utils";

export const Route = createFileRoute("/gestor/professores")({
  head: () => ({ meta: [{ title: "Professores | Gestão | Lume" }] }),
  component: Professores,
});

type Vinculo = { id: string; usuario: string; ativo: boolean; teto_creditos: number | null };
type Uso = { usuario: string; creditos_usados: number };
type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  ultimo_acesso: string | null;
  foto: string | null;
  funcao: string | null;
  telefone: string | null;
  formacao: string | null;
};
type Convite = { id: string; email: string; criado_em: string };
type Ligacao = { professor: string; disciplina: string | null; turmas: { nome: string } | null };

function Professores() {
  const escola = useEscolaDoGestor();
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    if (!escola) return null;
    const sb = supabase();
    const [vinculos, convites, ligacoes, usos, turmasDaEscola] = await Promise.all([
      sb
        .from("vinculos")
        .select("id, usuario, ativo, teto_creditos")
        .eq("escola", escola.id)
        .eq("papel", "professor"),
      sb
        .from("convites")
        .select("id, email, criado_em")
        .eq("escola", escola.id)
        .eq("papel", "professor")
        .is("aceito_em", null),
      sb
        .from("turma_professores")
        .select("professor, disciplina, turmas!inner(nome, escola)")
        .eq("turmas.escola", escola.id),
      sb.rpc("uso_por_professor", { p_escola: escola.id }),
      sb.from("turmas").select("id, nome").eq("escola", escola.id).eq("ativa", true).order("nome"),
    ]);
    const lista = exigir(vinculos) as Vinculo[];
    const perfis = lista.length
      ? (exigir(
          await sb
            .from("perfis")
            .select("id, nome, email, ultimo_acesso, foto, funcao, telefone, formacao")
            .in(
              "id",
              lista.map((v) => v.usuario),
            ),
        ) as Perfil[])
      : [];
    return {
      vinculos: lista,
      perfis: new Map(perfis.map((p) => [p.id, p])),
      convites: exigir(convites) as Convite[],
      ligacoes: exigir(ligacoes) as unknown as Ligacao[],
      usos: new Map((exigir(usos) as Uso[]).map((u) => [u.usuario, Number(u.creditos_usados)])),
      turmas: exigir(turmasDaEscola) as { id: string; nome: string }[],
    };
  }, [escola?.id]);

  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function alternarAtivo(v: Vinculo) {
    setOcupado(v.id);
    const { error } = await supabase().from("vinculos").update({ ativo: !v.ativo }).eq("id", v.id);
    setOcupado(null);
    setAviso(
      error
        ? "Não foi possível alterar agora."
        : v.ativo
          ? "Professor desativado."
          : "Professor reativado.",
    );
    void recarregar();
  }

  async function excluir(v: Vinculo, nome: string) {
    if (
      !window.confirm(
        `Tirar ${nome} da escola? A pessoa perde o acesso e sai das turmas. Os alunos, planos e provas que ela criou continuam na escola.`,
      )
    )
      return;
    setOcupado(v.id);
    const sb = supabase();
    const ids = (dados?.turmas ?? []).map((t) => t.id);
    if (ids.length) {
      await sb.from("turma_professores").delete().eq("professor", v.usuario).in("turma", ids);
    }
    const { error } = await sb.from("vinculos").delete().eq("id", v.id);
    setOcupado(null);
    setAviso(error ? "Não foi possível tirar agora." : `${nome} saiu da escola.`);
    void recarregar();
  }

  async function cancelarConvite(id: string) {
    setOcupado(id);
    await supabase().from("convites").delete().eq("id", id);
    setOcupado(null);
    void recarregar();
  }

  const ordenados = [...(dados?.vinculos ?? [])].sort(
    (a, b) =>
      Number(b.ativo) - Number(a.ativo) ||
      (dados?.perfis.get(a.usuario)?.nome ?? "").localeCompare(
        dados?.perfis.get(b.usuario)?.nome ?? "",
      ),
  );

  return (
    <div>
      <PageHeader
        title="Professores"
        subtitle={`Quem trabalha com a Lume em ${escola?.nome ?? "sua escola"}.`}
      />

      {escola ? (
        <section className="card-soft mb-6 p-5">
          <h2 className="mb-1 font-display text-base font-semibold">Convidar professor</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            O professor recebe um e-mail para criar a senha. Se quiser, já marque as turmas dele: ao
            entrar, ele já estará nelas.
          </p>
          <ConvidarForm
            escola={escola.id}
            papel="professor"
            turmas={dados?.turmas ?? []}
            onConvidado={() => void recarregar()}
          />
        </section>
      ) : null}

      {aviso ? (
        <p role="status" className="mb-4 rounded-2xl bg-leaf-soft px-4 py-3 text-sm">
          {aviso}
        </p>
      ) : null}
      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando professores…
        </p>
      ) : null}

      <div className="space-y-3">
        {ordenados.map((v) => {
          const p = dados?.perfis.get(v.usuario);
          const turmas = (dados?.ligacoes ?? []).filter((l) => l.professor === v.usuario);
          return (
            <div
              key={v.id}
              className={`card-soft grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${v.ativo ? "" : "opacity-60"}`}
            >
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-sky-soft font-display text-sm font-semibold">
                {p?.foto ? (
                  <img src={p.foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  iniciais(p?.nome || p?.email || "?")
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">
                  {p?.nome || "Sem nome"} {v.ativo ? "" : "· desativado"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[p?.funcao, p?.email, p?.telefone].filter(Boolean).join(" · ")}
                </p>
                {p?.formacao ? (
                  <p className="truncate text-xs text-muted-foreground">{p.formacao}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {turmas.length
                    ? turmas
                        .map(
                          (t) =>
                            `${t.turmas?.nome ?? ""}${t.disciplina ? ` (${t.disciplina})` : ""}`,
                        )
                        .join(", ")
                    : "Sem turma"}{" "}
                  ·{" "}
                  {p?.ultimo_acesso
                    ? `último acesso: ${dataCurta(p.ultimo_acesso)}`
                    : "convite enviado, ainda não entrou"}
                </p>
                <TetoDeCreditos
                  vinculo={v}
                  usados={dados?.usos.get(v.usuario) ?? 0}
                  onSalvo={() => void recarregar()}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={ocupado === v.id}
                  onClick={() => void alternarAtivo(v)}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                >
                  {v.ativo ? (
                    <UserX className="h-3.5 w-3.5" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  {v.ativo ? "Desativar" : "Reativar"}
                </button>
                <button
                  type="button"
                  disabled={ocupado === v.id}
                  onClick={() => void excluir(v, p?.nome || p?.email || "este professor")}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-coral-soft disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {dados && dados.vinculos.length === 0 && dados.convites.length === 0 ? (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Nenhum professor ainda. Convide o primeiro no campo acima.
        </p>
      ) : null}

      {dados && dados.convites.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-sm font-bold">Convites aguardando</h2>
          <ul className="space-y-2">
            {dados.convites.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-2.5 text-sm"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{c.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    enviado em {dataCurta(c.criado_em)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void cancelarConvite(c.id)}
                  disabled={ocupado === c.id}
                  aria-label={`Cancelar convite de ${c.email}`}
                  className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-coral-soft"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TetoDeCreditos({
  vinculo,
  usados,
  onSalvo,
}: {
  vinculo: Vinculo;
  usados: number;
  onSalvo: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(vinculo.teto_creditos?.toString() ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setSalvando(true);
    setErro("");
    const teto = valor.trim() === "" ? null : Math.max(0, Math.floor(Number(valor)));
    const { error } = await supabase()
      .from("vinculos")
      .update({ teto_creditos: teto })
      .eq("id", vinculo.id);
    setSalvando(false);
    if (error) return setErro("Não foi possível salvar.");
    setEditando(false);
    onSalvo();
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>
        Lumis neste mês: <strong className="text-foreground">{usados}</strong>
        {vinculo.teto_creditos !== null
          ? ` de ${vinculo.teto_creditos} (limite deste professor)`
          : " créditos · sem limite individual"}
      </span>
      {editando ? (
        <span className="inline-flex items-center gap-1.5">
          <Input
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))}
            placeholder="sem limite"
            aria-label="Limite de créditos por mês deste professor"
            className="h-8 w-24 rounded-full bg-card px-3 text-xs"
          />
          <button
            type="button"
            disabled={salvando}
            onClick={() => void salvar()}
            className="cursor-pointer rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="cursor-pointer font-semibold hover:underline"
          >
            Cancelar
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="cursor-pointer font-semibold text-primary hover:underline"
        >
          {vinculo.teto_creditos !== null ? "Mudar limite" : "Definir limite"}
        </button>
      )}
      {erro ? <span className="text-destructive">{erro}</span> : null}
    </div>
  );
}
