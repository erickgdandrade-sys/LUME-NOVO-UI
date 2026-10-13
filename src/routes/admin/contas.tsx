import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Search,
  Send,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import {
  corrigirEmail,
  definirBloqueio,
  linkDeNovaSenha,
  listarContas,
  reenviarAcesso,
  type Conta,
} from "@/lib/contas";
import { dataCurta, useDados } from "@/lib/usar-dados";
import { cn, iniciais } from "@/lib/utils";

export const Route = createFileRoute("/admin/contas")({
  head: () => ({ meta: [{ title: "Contas | Admin Lume" }] }),
  component: Contas,
});

type Filtro = "todas" | "admins" | "gestores" | "professores" | "nunca" | "bloqueadas" | "convites";

const FILTROS: { valor: Filtro; nome: string }[] = [
  { valor: "todas", nome: "Todas" },
  { valor: "admins", nome: "Equipe Lume" },
  { valor: "gestores", nome: "Gestores" },
  { valor: "professores", nome: "Professores" },
  { valor: "nunca", nome: "Nunca entraram" },
  { valor: "bloqueadas", nome: "Bloqueadas" },
  { valor: "convites", nome: "Convites pendentes" },
];

function passa(c: Conta, f: Filtro) {
  if (f === "admins") return c.admin;
  if (f === "gestores") return c.papeis.some((p) => p.papel === "gestor" && p.ativo);
  if (f === "professores") return c.papeis.some((p) => p.papel === "professor" && p.ativo);
  if (f === "nunca") return c.id !== null && !c.ultimoAcesso;
  if (f === "bloqueadas") return c.bloqueada;
  if (f === "convites") return c.id === null;
  return true;
}

type Aviso = { ok: boolean; texto: string } | null;

function Contas() {
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const r = await listarContas();
    if (!r.ok) throw new Error(r.erro);
    return r;
  }, []);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [aviso, setAviso] = useState<Aviso>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (dados?.contas ?? []).filter(
      (c) =>
        passa(c, filtro) &&
        (!termo ||
          c.email.toLowerCase().includes(termo) ||
          c.nome.toLowerCase().includes(termo) ||
          c.papeis.some((p) => p.escolaNome.toLowerCase().includes(termo))),
    );
  }, [dados, busca, filtro]);

  const aoTerminar = (r: { ok: true; mensagem: string } | { ok: false; erro: string }) => {
    setAviso(r.ok ? { ok: true, texto: r.mensagem } : { ok: false, texto: r.erro });
    if (r.ok) void recarregar();
  };

  return (
    <div>
      <PageHeader
        title="Contas"
        subtitle="Todas as pessoas com acesso à Lume. Ajude quem não consegue entrar, sem nunca ver a senha de ninguém."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou escola"
            aria-label="Buscar contas"
            className="h-10 rounded-lg bg-card pl-10"
          />
        </div>
        {dados ? (
          <p className="shrink-0 text-xs text-muted-foreground">
            {lista.length} de {dados.contas.length}
          </p>
        ) : null}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              filtro === f.valor
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.nome}
          </button>
        ))}
      </div>

      {aviso ? (
        <p
          role={aviso.ok ? "status" : "alert"}
          className={cn(
            "mb-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
            aviso.ok ? "bg-leaf-soft" : "bg-coral-soft",
          )}
        >
          {aviso.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {aviso.texto}
        </p>
      ) : null}
      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando contas…
        </p>
      ) : null}

      <ul className="space-y-3">
        {lista.map((c) => (
          <CartaoConta
            key={c.id ?? `convite-${c.email}`}
            conta={c}
            souEu={c.id === dados?.eu}
            onResultado={aoTerminar}
          />
        ))}
      </ul>
      {dados && lista.length === 0 ? (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Nenhuma conta com esse filtro.
        </p>
      ) : null}
    </div>
  );
}

const botao =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";

function CartaoConta({
  conta: c,
  souEu,
  onResultado,
}: {
  conta: Conta;
  souEu: boolean;
  onResultado: (r: { ok: true; mensagem: string } | { ok: false; erro: string }) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [novoEmail, setNovoEmail] = useState(c.email);

  async function fazer(
    f: () => Promise<{ ok: true; mensagem: string } | { ok: false; erro: string }>,
  ) {
    setOcupado(true);
    const r = await f();
    setOcupado(false);
    onResultado(r);
    return r.ok;
  }

  async function salvarEmail(e: FormEvent) {
    e.preventDefault();
    if (!c.id) return;
    const email = novoEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email === c.email) {
      onResultado({ ok: false, erro: "Digite um e-mail válido e diferente do atual." });
      return;
    }
    if (
      !window.confirm(
        `Trocar o e-mail de ${c.nome || c.email} para ${email}? A troca vale na hora e a pessoa passa a entrar com o e-mail novo.`,
      )
    )
      return;
    const id = c.id;
    if (await fazer(() => corrigirEmail(id, email))) setEditando(false);
  }

  const papeis = [
    ...(c.admin ? ["Equipe Lume"] : []),
    ...c.papeis
      .filter((p) => p.ativo)
      .map((p) => `${p.papel === "gestor" ? "Gestão" : "Professor(a)"} · ${p.escolaNome}`),
  ];
  const inativos = c.papeis.filter((p) => !p.ativo);

  return (
    <li className={cn("card-soft p-4", c.bloqueada && "ring-2 ring-coral")}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-sky-soft font-display text-sm font-semibold">
          {c.foto ? (
            <img src={c.foto} alt="" className="h-full w-full object-cover" />
          ) : c.id ? (
            iniciais(c.nome || c.email) || "?"
          ) : (
            <Mail className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">
            {c.nome || (c.id ? "Sem nome" : "Convite pendente")}
            {souEu ? (
              <span className="ml-1.5 text-xs font-semibold text-muted-foreground">(você)</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">{c.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {c.bloqueada ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2.5 py-0.5 text-[11px] font-semibold">
                <Lock className="h-3 w-3" /> Bloqueada
              </span>
            ) : null}
            {c.convitePendente ? (
              <span className="rounded-full bg-sun-soft px-2.5 py-0.5 text-[11px] font-semibold">
                Convidado: {c.convitePendente}
              </span>
            ) : null}
            {papeis.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold"
              >
                {p === "Equipe Lume" ? <ShieldCheck className="h-3 w-3" /> : null}
                {p}
              </span>
            ))}
            {inativos.length ? (
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {inativos.length}{" "}
                {inativos.length === 1 ? "vínculo desativado" : "vínculos desativados"}
              </span>
            ) : null}
          </div>
          {c.id ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {c.ultimoAcesso ? `Último acesso: ${dataCurta(c.ultimoAcesso)}` : "Ainda não entrou"}
              {c.criadaEm ? ` · conta criada em ${dataCurta(c.criadaEm)}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {editando && c.id ? (
        <form
          onSubmit={(e) => void salvarEmail(e)}
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          noValidate
        >
          <Input
            type="email"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            aria-label="Novo e-mail"
            className="h-9 rounded-full bg-card px-4"
            autoFocus
          />
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            Trocar e-mail
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="h-9 shrink-0 cursor-pointer rounded-full border border-border bg-card px-4 text-xs font-semibold"
          >
            Cancelar
          </button>
        </form>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {c.id ? (
          <>
            <button
              type="button"
              className={botao}
              disabled={ocupado || c.bloqueada}
              onClick={() => {
                const id = c.id;
                if (id) void fazer(() => reenviarAcesso({ usuario: id }));
              }}
              title="Para quem não recebeu ou perdeu o convite"
            >
              <Send className="h-3.5 w-3.5" /> Reenviar acesso
            </button>
            <button
              type="button"
              className={botao}
              disabled={ocupado || c.bloqueada}
              onClick={() => {
                const id = c.id;
                if (id) void fazer(() => linkDeNovaSenha(id));
              }}
            >
              <KeyRound className="h-3.5 w-3.5" /> Link de nova senha
            </button>
            <button
              type="button"
              className={botao}
              disabled={ocupado}
              onClick={() => {
                setNovoEmail(c.email);
                setEditando((v) => !v);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Corrigir e-mail
            </button>
            {souEu ? null : (
              <button
                type="button"
                className={cn(botao, c.bloqueada ? "" : "hover:bg-coral-soft")}
                disabled={ocupado}
                onClick={() => {
                  const id = c.id;
                  if (!id) return;
                  const texto = c.bloqueada
                    ? `Desbloquear ${c.nome || c.email}? A pessoa volta a poder entrar.`
                    : `Bloquear ${c.nome || c.email}? A pessoa não consegue mais entrar em nenhuma escola. Os dados continuam guardados e dá para desbloquear depois.`;
                  if (window.confirm(texto)) void fazer(() => definirBloqueio(id, !c.bloqueada));
                }}
              >
                {c.bloqueada ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {c.bloqueada ? "Desbloquear" : "Bloquear"}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className={botao}
            disabled={ocupado}
            onClick={() => void fazer(() => reenviarAcesso({ email: c.email }))}
          >
            <Send className="h-3.5 w-3.5" /> Reenviar convite
          </button>
        )}
        {ocupado ? (
          <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
        ) : null}
      </div>
    </li>
  );
}
