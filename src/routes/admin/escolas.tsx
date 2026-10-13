import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, Loader2, Mail, Plus, Users } from "lucide-react";
import { AcoesDaEscola, CancelarConvite, RemoverGestor } from "@/components/AcoesDaEscola";
import { PageHeader } from "@/components/AppShell";
import { ConvidarForm } from "@/components/ConvidarForm";
import { Input } from "@/components/ui/input";
import {
  listarPlanos,
  situacaoDoPlano,
  textoLimite,
  type Plano,
  type SituacaoPlano,
} from "@/lib/plano-escola";
import { supabase } from "@/lib/supabase";
import { dataCurta, exigir, useDados } from "@/lib/usar-dados";

export const Route = createFileRoute("/admin/escolas")({
  head: () => ({ meta: [{ title: "Escolas | Admin Lume" }] }),
  component: PainelAdmin,
});

type Escola = {
  id: string;
  nome: string;
  cidade: string | null;
  ativa: boolean;
  criada_em: string;
  plano: string;
  max_turmas_proprio: number | null;
  creditos_mes_proprio: number | null;
};
type Vinculo = { escola: string; usuario: string; papel: "gestor" | "professor"; ativo: boolean };
type Convite = { id: string; escola: string; email: string; papel: string; criado_em: string };
type Perfil = { id: string; nome: string | null; email: string | null };

async function carregar() {
  const sb = supabase();
  const [escolas, vinculos, convites] = await Promise.all([
    sb
      .from("escolas")
      .select("id, nome, cidade, ativa, criada_em, plano, max_turmas_proprio, creditos_mes_proprio")
      .order("nome"),
    sb.from("vinculos").select("escola, usuario, papel, ativo"),
    sb.from("convites").select("id, escola, email, papel, criado_em").is("aceito_em", null),
  ]);
  const listaVinculos = exigir(vinculos) as Vinculo[];
  const idsGestores = [
    ...new Set(listaVinculos.filter((v) => v.papel === "gestor").map((v) => v.usuario)),
  ];
  const perfis = idsGestores.length
    ? (exigir(await sb.from("perfis").select("id, nome, email").in("id", idsGestores)) as Perfil[])
    : [];
  return {
    planos: await listarPlanos(),
    escolas: exigir(escolas) as Escola[],
    vinculos: listaVinculos,
    convites: exigir(convites) as Convite[],
    perfis: new Map(perfis.map((p) => [p.id, p])),
  };
}

function PainelAdmin() {
  const { dados, erro, carregando, recarregar } = useDados(carregar, []);
  const [criando, setCriando] = useState(false);

  return (
    <div>
      <PageHeader
        title="Escolas"
        subtitle="Crie escolas e convide o gestor de cada uma. Os gestores convidam os professores."
        action={
          <button
            type="button"
            onClick={() => setCriando((v) => !v)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova escola
          </button>
        }
      />

      {criando ? (
        <NovaEscola
          onCriada={() => {
            setCriando(false);
            void recarregar();
          }}
        />
      ) : null}

      {erro ? <p className="rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {dados ? <LimitesDosPlanos planos={dados.planos} onMudou={() => void recarregar()} /> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando escolas…
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {dados?.escolas.map((escola) => {
          const daEscola = dados.vinculos.filter((v) => v.escola === escola.id && v.ativo);
          const gestores = daEscola.filter((v) => v.papel === "gestor");
          const professores = daEscola.filter((v) => v.papel === "professor");
          const pendentes = dados.convites.filter((c) => c.escola === escola.id);
          return (
            <section key={escola.id} className="card-soft p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-soft">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className={`min-w-0 flex-1 ${escola.ativa ? "" : "opacity-60"}`}>
                  <h2 className="truncate font-display text-lg font-semibold">{escola.nome}</h2>
                  <p className="text-xs text-muted-foreground">
                    {escola.cidade ? `${escola.cidade} · ` : ""}criada em{" "}
                    {dataCurta(escola.criada_em)}
                    {escola.ativa ? "" : " · inativa"}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                  <Users className="h-3.5 w-3.5" /> {professores.length} prof.
                </span>
              </div>

              <Link
                to="/admin/escola/$id"
                params={{ id: escola.id }}
                className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
              >
                Ver painel da escola →
              </Link>
              <AcoesDaEscola escola={escola} onMudou={() => void recarregar()} />

              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground">Gestores</p>
                {gestores.length === 0 ? (
                  <p className="mt-1 text-sm italic text-muted-foreground">Nenhum gestor ainda.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {gestores.map((g) => {
                      const p = dados.perfis.get(g.usuario);
                      return (
                        <li key={g.usuario} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{p?.nome || "Sem nome"}</span>{" "}
                            <span className="text-muted-foreground">{p?.email}</span>
                          </span>
                          <RemoverGestor
                            escola={escola.id}
                            usuario={g.usuario}
                            nome={p?.nome || p?.email || "este gestor"}
                            onRemovido={() => void recarregar()}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
                {pendentes.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {pendentes.map((c) => (
                      <li key={c.id} className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          Convite pendente: {c.email} ({c.papel})
                        </span>
                        <CancelarConvite
                          id={c.id}
                          email={c.email}
                          onCancelado={() => void recarregar()}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <PlanoDaEscola
                escola={escola}
                planos={dados.planos}
                onMudou={() => void recarregar()}
              />

              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Convidar gestor</p>
                <ConvidarForm
                  escola={escola.id}
                  papel="gestor"
                  onConvidado={() => void recarregar()}
                />
              </div>
            </section>
          );
        })}
      </div>

      {dados && dados.escolas.length === 0 ? (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Nenhuma escola ainda. Clique em “Nova escola” para começar.
        </p>
      ) : null}
    </div>
  );
}

function NovaEscola({ onCriada }: { onCriada: () => void }) {
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) return setErro("Digite o nome da escola.");
    setSalvando(true);
    const { error } = await supabase()
      .from("escolas")
      .insert({ nome: nome.trim(), cidade: cidade.trim() || null });
    setSalvando(false);
    if (error) return setErro("Não foi possível criar a escola.");
    onCriada();
  }

  return (
    <form
      onSubmit={(e) => void salvar(e)}
      className="card-soft mb-6 grid gap-3 p-5 sm:grid-cols-[2fr_1fr_auto]"
      noValidate
    >
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da escola"
        aria-label="Nome da escola"
        className="h-10 rounded-lg bg-card px-4"
        autoFocus
      />
      <Input
        value={cidade}
        onChange={(e) => setCidade(e.target.value)}
        placeholder="Cidade (opcional)"
        aria-label="Cidade"
        className="h-10 rounded-lg bg-card px-4"
      />
      <button
        type="submit"
        disabled={salvando}
        className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Criar escola
      </button>
      {erro ? <p className="text-xs text-destructive sm:col-span-3">{erro}</p> : null}
    </form>
  );
}

const numeroOuNulo = (t: string) => (t.trim() === "" ? null : Math.max(0, Math.floor(Number(t))));
const soNumeros = (t: string) => t.replace(/\D/g, "");

function PlanoDaEscola({
  escola,
  planos,
  onMudou,
}: {
  escola: Escola;
  planos: Plano[];
  onMudou: () => void;
}) {
  const [plano, setPlano] = useState(escola.plano);
  const [turmas, setTurmas] = useState(escola.max_turmas_proprio?.toString() ?? "");
  const [creditos, setCreditos] = useState(escola.creditos_mes_proprio?.toString() ?? "");
  const [situacao, setSituacao] = useState<SituacaoPlano | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const padrao = planos.find((p) => p.id === plano);

  useEffect(() => {
    situacaoDoPlano(escola.id)
      .then(setSituacao)
      .catch(() => setSituacao(null));
  }, [escola.id, escola.plano, escola.max_turmas_proprio, escola.creditos_mes_proprio]);

  const mudou =
    plano !== escola.plano ||
    numeroOuNulo(turmas) !== escola.max_turmas_proprio ||
    numeroOuNulo(creditos) !== escola.creditos_mes_proprio;

  async function salvar() {
    setSalvando(true);
    setAviso("");
    const { error } = await supabase().rpc("definir_plano_escola", {
      p_escola: escola.id,
      p_plano: plano,
      p_max_turmas: numeroOuNulo(turmas),
      p_creditos_mes: numeroOuNulo(creditos),
    });
    setSalvando(false);
    if (error) return setAviso("Não foi possível salvar o plano.");
    setAviso("Plano salvo.");
    onMudou();
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Plano</p>
      {situacao ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Turmas ativas: <strong>{situacao.turmas_ativas}</strong> de{" "}
          {textoLimite(situacao.max_turmas)} · Créditos de IA no mês:{" "}
          <strong>{situacao.creditos_usados}</strong> de {textoLimite(situacao.creditos_mes)}
          {situacao.creditos_extra_usados > 0 ? (
            <>
              {" "}
              ·{" "}
              <strong className="text-foreground">
                {situacao.creditos_extra_usados} créditos extras a cobrar
              </strong>
            </>
          ) : null}
          {situacao.extra_liberado ? " · uso extra liberado" : ""}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
        <select
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          aria-label="Plano da escola"
          className="h-10 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm"
        >
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <Input
          inputMode="numeric"
          value={turmas}
          onChange={(e) => setTurmas(soNumeros(e.target.value))}
          placeholder={`Turmas: ${textoLimite(padrao?.max_turmas ?? null)}`}
          aria-label="Limite de turmas próprio desta escola"
          className="h-10 rounded-lg bg-card px-4"
        />
        <Input
          inputMode="numeric"
          value={creditos}
          onChange={(e) => setCreditos(soNumeros(e.target.value))}
          placeholder={`Créditos: ${textoLimite(padrao?.creditos_mes ?? null)}`}
          aria-label="Créditos de IA por mês próprios desta escola"
          className="h-10 rounded-lg bg-card px-4"
        />
        <button
          type="button"
          disabled={!mudou || salvando}
          onClick={() => void salvar()}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Deixe turmas e créditos em branco para usar o padrão do plano.
      </p>
      {aviso ? <p className="mt-1 text-xs font-medium">{aviso}</p> : null}
    </div>
  );
}

function LimitesDosPlanos({ planos, onMudou }: { planos: Plano[]; onMudou: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState(() =>
    Object.fromEntries(
      planos.map((p) => [
        p.id,
        { turmas: p.max_turmas?.toString() ?? "", creditos: p.creditos_mes?.toString() ?? "" },
      ]),
    ),
  );
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");

  const mudar = (id: string, campo: "turmas" | "creditos", texto: string) =>
    setValores((v) => ({ ...v, [id]: { ...v[id]!, [campo]: soNumeros(texto) } }));

  async function salvar() {
    setSalvando(true);
    setAviso("");
    const sb = supabase();
    const erros = await Promise.all(
      planos.map(async (p) => {
        const v = valores[p.id]!;
        const { error } = await sb
          .from("planos")
          .update({ max_turmas: numeroOuNulo(v.turmas), creditos_mes: numeroOuNulo(v.creditos) })
          .eq("id", p.id);
        return error;
      }),
    );
    setSalvando(false);
    if (erros.some(Boolean)) return setAviso("Não foi possível salvar todos os planos.");
    setAviso("Limites salvos. Valem para todas as escolas de cada plano.");
    onMudou();
  }

  return (
    <section className="card-soft mb-6 p-5">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block font-display text-base font-semibold">Limites dos planos</span>
          <span className="text-xs text-muted-foreground">
            {planos
              .map(
                (p) =>
                  `${p.nome}: ${textoLimite(p.max_turmas)} turmas, ${textoLimite(p.creditos_mes)} créditos`,
              )
              .join(" · ")}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-primary">
          {aberto ? "Fechar" : "Editar"}
        </span>
      </button>
      {aberto ? (
        <div className="mt-4 space-y-2">
          {planos.map((p) => (
            <div key={p.id} className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2">
              <span className="text-sm font-semibold">{p.nome}</span>
              <Input
                inputMode="numeric"
                value={valores[p.id]?.turmas ?? ""}
                onChange={(e) => mudar(p.id, "turmas", e.target.value)}
                placeholder="Turmas (vazio = sem limite)"
                aria-label={`Turmas do plano ${p.nome}`}
                className="h-10 rounded-lg bg-card px-4"
              />
              <Input
                inputMode="numeric"
                value={valores[p.id]?.creditos ?? ""}
                onChange={(e) => mudar(p.id, "creditos", e.target.value)}
                placeholder="Créditos/mês (vazio = sem limite)"
                aria-label={`Créditos por mês do plano ${p.nome}`}
                className="h-10 rounded-lg bg-card px-4"
              />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={salvando}
              onClick={() => void salvar()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar limites
            </button>
            {aviso ? <span className="text-xs font-medium">{aviso}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
