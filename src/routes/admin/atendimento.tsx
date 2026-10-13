import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Coins,
  Loader2,
  Mail,
  MessageCircleQuestion,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { exigir, useDados } from "@/lib/usar-dados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/atendimento")({
  head: () => ({ meta: [{ title: "Atendimento | Admin Lume" }] }),
  component: Atendimento,
});

type Situacao = "aberto" | "respondido" | "resolvido";
type Chamado = {
  id: string;
  criado_em: string;
  atualizado_em: string;
  tipo: "duvida" | "creditos";
  origem: "chat" | "chat-visitante" | "gestor";
  situacao: Situacao;
  nome: string | null;
  email: string;
  escola_nome: string | null;
  papel: string | null;
  assunto: string;
  mensagem: string | null;
  conversa: { autor: string; texto: string }[];
  observacao: string | null;
};

const SITUACOES: { valor: Situacao | "todos"; nome: string }[] = [
  { valor: "aberto", nome: "Abertos" },
  { valor: "respondido", nome: "Respondidos" },
  { valor: "resolvido", nome: "Resolvidos" },
  { valor: "todos", nome: "Todos" },
];

const NOME_SITUACAO: Record<Situacao, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  resolvido: "Resolvido",
};

const TOM_SITUACAO: Record<Situacao, string> = {
  aberto: "bg-sun-soft",
  respondido: "bg-sky-soft",
  resolvido: "bg-leaf-soft",
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function Atendimento() {
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const r = await supabase()
      .from("tickets")
      .select(
        "id, criado_em, atualizado_em, tipo, origem, situacao, nome, email, escola_nome, papel, assunto, mensagem, conversa, observacao",
      )
      .order("criado_em", { ascending: false })
      .limit(500);
    return exigir(r) as Chamado[];
  }, []);
  const [situacao, setSituacao] = useState<Situacao | "todos">("aberto");
  const [tipo, setTipo] = useState<"todos" | "duvida" | "creditos">("todos");

  const lista = (dados ?? []).filter(
    (c) =>
      (situacao === "todos" || c.situacao === situacao) && (tipo === "todos" || c.tipo === tipo),
  );
  const contar = (s: Situacao) => (dados ?? []).filter((c) => c.situacao === s).length;

  return (
    <div>
      <PageHeader
        title="Atendimento"
        subtitle="Dúvidas que a Lumis não resolveu e pedidos de créditos dos gestores. Só a equipe da Lume vê esta página."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {SITUACOES.map((s) => (
          <button
            key={s.valor}
            type="button"
            aria-pressed={situacao === s.valor}
            onClick={() => setSituacao(s.valor)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              situacao === s.valor
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s.nome}
            {s.valor !== "todos" && dados ? ` (${contar(s.valor)})` : ""}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["todos", "Todos os tipos"],
            ["duvida", "Dúvidas"],
            ["creditos", "Pedidos de créditos"],
          ] as const
        ).map(([valor, nome]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={tipo === valor}
            onClick={() => setTipo(valor)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              tipo === valor
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {nome}
          </button>
        ))}
      </div>

      {erro ? <p className="mb-4 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando chamados…
        </p>
      ) : null}

      <ul className="space-y-3">
        {lista.map((c) => (
          <CartaoChamado key={c.id} chamado={c} onMudou={() => void recarregar()} />
        ))}
      </ul>
      {dados && lista.length === 0 ? (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          {situacao === "aberto"
            ? "Nenhum chamado aberto. Tudo em dia! 🎉"
            : "Nenhum chamado aqui."}
        </p>
      ) : null}
    </div>
  );
}

const botao =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

function CartaoChamado({ chamado: c, onMudou }: { chamado: Chamado; onMudou: () => void }) {
  const [aberto, setAberto] = useState(c.situacao === "aberto");
  const [observacao, setObservacao] = useState(c.observacao ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function atualizar(parte: { situacao?: Situacao; observacao?: string | null }) {
    setOcupado(true);
    setErro("");
    const { error } = await supabase().from("tickets").update(parte).eq("id", c.id);
    setOcupado(false);
    if (error) return setErro("Não foi possível salvar. Tente de novo.");
    onMudou();
  }

  async function apagar() {
    if (!window.confirm("Apagar este chamado? Não tem volta.")) return;
    setOcupado(true);
    const { error } = await supabase().from("tickets").delete().eq("id", c.id);
    setOcupado(false);
    if (error) return setErro("Não foi possível apagar.");
    onMudou();
  }

  const resposta = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(`Re: ${c.assunto}`)}`;
  const Icone = c.tipo === "creditos" ? Coins : MessageCircleQuestion;
  const origem =
    c.origem === "gestor"
      ? "Painel do gestor"
      : c.origem === "chat"
        ? "Chat da Lumis"
        : "Chat da página inicial";

  return (
    <li className="card-soft p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full cursor-pointer items-start gap-3 text-left"
      >
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
            c.tipo === "creditos" ? "bg-lilac-soft" : "bg-sky-soft",
          )}
        >
          <Icone className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                TOM_SITUACAO[c.situacao],
              )}
            >
              {NOME_SITUACAO[c.situacao]}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {dataHora(c.criado_em)} · {origem}
            </span>
          </span>
          <span className="mt-1 block truncate font-display text-sm font-bold">{c.assunto}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {[c.nome, c.email, c.escola_nome ? `${c.papel ?? ""} · ${c.escola_nome}` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            !aberto && "-rotate-90",
          )}
        />
      </button>

      {aberto ? (
        <div className="mt-4 space-y-4">
          {c.mensagem ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Mensagem</p>
              <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-secondary px-4 py-3 text-sm">
                {c.mensagem}
              </p>
            </div>
          ) : null}

          {c.conversa.length ? (
            <details className="rounded-2xl border border-border p-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                Conversa com a Lumis ({c.conversa.length} mensagens)
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                {c.conversa.map((m, i) => (
                  <p
                    key={i}
                    className={cn(
                      "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2",
                      m.autor === "lumis" ? "bg-secondary" : "ml-auto bg-sky-soft",
                    )}
                  >
                    <span className="block text-[10px] font-semibold text-muted-foreground">
                      {m.autor === "lumis" ? "Lumis" : "Pessoa"}
                    </span>
                    {m.texto}
                  </p>
                ))}
              </div>
            </details>
          ) : null}

          <div>
            <label htmlFor={`obs-${c.id}`} className="text-xs font-semibold text-muted-foreground">
              Anotações da equipe (só a equipe vê)
            </label>
            <Textarea
              id={`obs-${c.id}`}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value.slice(0, 4000))}
              rows={2}
              placeholder="Ex.: respondi por e-mail, liberei 200 créditos…"
              className="mt-1 resize-y rounded-2xl bg-card text-sm"
            />
            {observacao !== (c.observacao ?? "") ? (
              <button
                type="button"
                className={cn(botao, "mt-2")}
                disabled={ocupado}
                onClick={() => void atualizar({ observacao: observacao.trim() || null })}
              >
                Salvar anotação
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={resposta} className={botao}>
              <Mail className="h-3.5 w-3.5" /> Responder por e-mail
            </a>
            {c.situacao !== "respondido" ? (
              <button
                type="button"
                className={botao}
                disabled={ocupado}
                onClick={() => void atualizar({ situacao: "respondido" })}
              >
                <Mail className="h-3.5 w-3.5" /> Marcar como respondido
              </button>
            ) : null}
            {c.situacao !== "resolvido" ? (
              <button
                type="button"
                className={botao}
                disabled={ocupado}
                onClick={() => void atualizar({ situacao: "resolvido" })}
              >
                <Check className="h-3.5 w-3.5" /> Resolvido
              </button>
            ) : (
              <button
                type="button"
                className={botao}
                disabled={ocupado}
                onClick={() => void atualizar({ situacao: "aberto" })}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir
              </button>
            )}
            <button
              type="button"
              className={cn(botao, "hover:bg-coral-soft")}
              disabled={ocupado}
              onClick={() => void apagar()}
            >
              <Trash2 className="h-3.5 w-3.5" /> Apagar
            </button>
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin self-center" /> : null}
          </div>
          {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
