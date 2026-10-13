import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  Download,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { exigir, useDados } from "@/lib/usar-dados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/demonstracoes")({
  head: () => ({ meta: [{ title: "Pedidos de demonstração | Admin Lume" }] }),
  component: PedidosDemonstracao,
});

type Pedido = {
  id: string;
  criado_em: string;
  nome: string;
  email: string;
  telefone: string;
  escola: string;
  cargo: string;
  estado: string;
  cidade: string;
  mensagem: string | null;
  situacao: Situacao;
  observacao: string | null;
};

const SITUACOES = {
  novo: { rotulo: "Novo", cor: "bg-sky-soft text-[#1f5fbf] dark:text-[#8db5f5]" },
  contatado: { rotulo: "Contatado", cor: "bg-sun-soft text-[#8a5a00] dark:text-[#f1d98a]" },
  agendado: { rotulo: "Agendado", cor: "bg-lilac-soft text-[#6a3fc0] dark:text-[#c7aef5]" },
  realizado: {
    rotulo: "Demonstração feita",
    cor: "bg-leaf-soft text-[#2f7a45] dark:text-[#9fd8ae]",
  },
  descartado: { rotulo: "Descartado", cor: "bg-secondary text-muted-foreground" },
} as const;
type Situacao = keyof typeof SITUACOES;

const CHAVE_EMAILS = "emails_pedidos_demonstracao";

async function carregar() {
  const sb = supabase();
  const [pedidos, config] = await Promise.all([
    sb
      .from("pedidos_demonstracao")
      .select(
        "id, criado_em, nome, email, telefone, escola, cargo, estado, cidade, mensagem, situacao, observacao",
      )
      .order("criado_em", { ascending: false }),
    sb.from("configuracoes").select("valor").eq("chave", CHAVE_EMAILS).maybeSingle(),
  ]);
  return {
    pedidos: exigir(pedidos) as Pedido[],
    emails: (exigir(config) as { valor: string[] } | null)?.valor ?? [],
  };
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function baixarPlanilha(pedidos: Pedido[]) {
  const celula = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const cabecalho = [
    "Data",
    "Nome",
    "E-mail",
    "Telefone",
    "Escola",
    "Cargo",
    "Cidade",
    "Estado",
    "Mensagem",
    "Situação",
    "Observação",
  ];
  const linhas = pedidos.map((p) =>
    [
      dataHora(p.criado_em),
      p.nome,
      p.email,
      p.telefone,
      p.escola,
      p.cargo,
      p.cidade,
      p.estado,
      p.mensagem,
      SITUACOES[p.situacao].rotulo,
      p.observacao,
    ]
      .map(celula)
      .join(";"),
  );
  const conteudo = "﻿" + [cabecalho.map(celula).join(";"), ...linhas].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  link.download = `pedidos-demonstracao-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function PedidosDemonstracao() {
  const { dados, erro, carregando, recarregar } = useDados(carregar, []);
  const [filtro, setFiltro] = useState<Situacao | "todos">("todos");

  const pedidos = dados?.pedidos ?? [];
  const visiveis = filtro === "todos" ? pedidos : pedidos.filter((p) => p.situacao === filtro);
  const novos = pedidos.filter((p) => p.situacao === "novo").length;

  return (
    <div>
      <PageHeader
        title="Pedidos de demonstração"
        subtitle="Quem preencheu o formulário “Agende uma demonstração”. Só o Admin Lume vê esta página."
        action={
          <button
            type="button"
            disabled={!pedidos.length}
            onClick={() => baixarPlanilha(visiveis)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Baixar planilha
          </button>
        }
      />

      {dados ? <EmailsDoAviso inicial={dados.emails} /> : null}

      {erro ? <p className="rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando pedidos…
        </p>
      ) : null}

      {dados ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {(["todos", ...Object.keys(SITUACOES)] as const).map((s) => {
            const qtd =
              s === "todos" ? pedidos.length : pedidos.filter((p) => p.situacao === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFiltro(s as Situacao | "todos")}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  filtro === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                {s === "todos" ? "Todos" : SITUACOES[s as Situacao].rotulo} · {qtd}
              </button>
            );
          })}
          {novos > 0 ? (
            <span className="self-center text-sm text-muted-foreground">
              {novos === 1
                ? "1 pedido novo esperando contato"
                : `${novos} pedidos novos esperando contato`}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {visiveis.map((p) => (
          <CartaoPedido key={p.id} pedido={p} onMudou={() => void recarregar()} />
        ))}
      </div>

      {dados && visiveis.length === 0 ? (
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          {pedidos.length === 0
            ? "Nenhum pedido ainda. Eles aparecem aqui assim que alguém preencher o formulário."
            : "Nenhum pedido nesta situação."}
        </p>
      ) : null}
    </div>
  );
}

function CartaoPedido({ pedido: p, onMudou }: { pedido: Pedido; onMudou: () => void }) {
  const [observacao, setObservacao] = useState(p.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const digitos = p.telefone.replace(/\D/g, "");

  async function atualizar(campos: Partial<Pick<Pedido, "situacao" | "observacao">>) {
    setSalvando(true);
    setErro("");
    const { error } = await supabase().from("pedidos_demonstracao").update(campos).eq("id", p.id);
    setSalvando(false);
    if (error) return setErro("Não foi possível salvar. Tente de novo.");
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
    onMudou();
  }

  async function excluir() {
    setSalvando(true);
    setErro("");
    const { data, error } = await supabase()
      .from("pedidos_demonstracao")
      .delete()
      .eq("id", p.id)
      .select("id");
    setSalvando(false);
    if (error || !data?.length) return setErro("Não foi possível excluir. Tente de novo.");
    onMudou();
  }

  return (
    <section className="card-soft p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-soft">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-tight font-semibold">{p.escola}</h2>
          <p className="text-sm">
            <span className="font-semibold">{p.nome}</span>{" "}
            <span className="text-muted-foreground">· {p.cargo}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Pedido em {dataHora(p.criado_em)}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            SITUACOES[p.situacao].cor,
          )}
        >
          {SITUACOES[p.situacao].rotulo}
        </span>
      </div>

      <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
        <li className="flex min-w-0 items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <a href={`mailto:${p.email}`} className="truncate text-primary hover:underline">
            {p.email}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
          <a href={`tel:+55${digitos}`} className="hover:underline">
            {p.telefone}
          </a>
          <a
            href={`https://wa.me/55${digitos}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-2 py-0.5 text-xs font-semibold text-[#2f7a45] hover:opacity-80 dark:text-[#9fd8ae]"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          {p.cidade} - {p.estado}
        </li>
      </ul>

      {p.mensagem ? (
        <p className="mt-3 rounded-2xl bg-secondary p-3 text-sm whitespace-pre-wrap">
          {p.mensagem}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 border-t border-border pt-4">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-muted-foreground">Situação</span>
          <select
            value={p.situacao}
            disabled={salvando}
            onChange={(e) => void atualizar({ situacao: e.target.value as Situacao })}
            className="h-9 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm"
          >
            {Object.entries(SITUACOES).map(([valor, s]) => (
              <option key={valor} value={valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          {salvo ? (
            <span className="inline-flex items-center gap-1 text-xs text-[#2f7a45] dark:text-[#9fd8ae]">
              <Check className="h-3.5 w-3.5" /> Salvo
            </span>
          ) : null}
        </label>
        <div className="flex gap-2">
          <Textarea
            value={observacao}
            maxLength={2000}
            rows={2}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Anotações da equipe (ex.: liguei dia 3, demo marcada para sexta às 14h)"
            aria-label="Anotações da equipe"
            className="min-h-0 resize-none rounded-2xl bg-card text-sm"
          />
          <button
            type="button"
            disabled={salvando || observacao === (p.observacao ?? "")}
            onClick={() => void atualizar({ observacao: observacao.trim() || null })}
            className="shrink-0 cursor-pointer self-end rounded-xl bg-secondary px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
        {erro ? <p className="text-xs font-medium text-destructive">{erro}</p> : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={salvando}
              className="inline-flex cursor-pointer items-center gap-1.5 justify-self-start rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-coral-soft hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir pedido
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir este pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                O pedido de {p.nome} ({p.escola}) será apagado de vez, sem como desfazer. Se só quer
                tirar da lista, use a situação “Descartado”.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void excluir()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}

function EmailsDoAviso({ inicial }: { inicial: string[] }) {
  const [emails, setEmails] = useState(inicial);
  const [novo, setNovo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function gravar(lista: string[], ok: string) {
    setSalvando(true);
    const { error } = await supabase()
      .from("configuracoes")
      .update({ valor: lista })
      .eq("chave", CHAVE_EMAILS);
    setSalvando(false);
    if (error) {
      setMensagem({ tipo: "erro", texto: "Não foi possível salvar. Tente de novo." });
      return false;
    }
    setEmails(lista);
    setMensagem({ tipo: "ok", texto: ok });
    return true;
  }

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const email = novo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return setMensagem({ tipo: "erro", texto: "Digite um e-mail válido." });
    }
    if (emails.includes(email)) {
      return setMensagem({ tipo: "erro", texto: "Esse e-mail já está na lista." });
    }
    if (await gravar([...emails, email], `${email} vai receber os próximos pedidos.`)) setNovo("");
  }

  function remover(email: string) {
    if (emails.length <= 1) {
      setMensagem({ tipo: "erro", texto: "Precisa ficar pelo menos um e-mail na lista." });
      return;
    }
    if (!window.confirm(`Parar de enviar os pedidos para ${email}?`)) return;
    void gravar(
      emails.filter((m) => m !== email),
      `${email} não recebe mais os pedidos.`,
    );
  }

  return (
    <section className="card-soft mb-6 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Settings className="h-4 w-4 text-muted-foreground" /> Quem recebe o aviso de cada pedido
      </p>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
        {emails.map((email) => (
          <li key={email} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{email}</span>
            <button
              type="button"
              disabled={salvando}
              onClick={() => remover(email)}
              aria-label={`Tirar ${email} da lista`}
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-coral-soft hover:text-foreground disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {emails.length === 0 ? (
          <li className="px-4 py-2.5 text-sm italic text-muted-foreground">Nenhum e-mail ainda.</li>
        ) : null}
      </ul>
      <form
        onSubmit={(e) => void adicionar(e)}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        noValidate
      >
        <Input
          type="email"
          value={novo}
          onChange={(e) => {
            setNovo(e.target.value);
            setMensagem(null);
          }}
          placeholder="novo@exemplo.com"
          aria-label="Novo e-mail para receber os pedidos"
          className="h-10 rounded-lg bg-card px-4"
        />
        <button
          type="submit"
          disabled={salvando || !novo.trim()}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar
        </button>
      </form>
      {mensagem ? (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            mensagem.tipo === "ok" ? "text-[#2f7a45] dark:text-[#9fd8ae]" : "text-destructive",
          )}
        >
          {mensagem.texto}
        </p>
      ) : null}
    </section>
  );
}
