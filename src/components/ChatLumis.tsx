import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Headset, Loader2, Lock, RotateCcw, Send, X } from "lucide-react";
import iconeLumis from "@/assets/lumis-icone.webp";
import { useAcesso } from "@/lib/acesso";
import { abrirChamado } from "@/lib/atendimento";
import { aoAbrirLumis, perguntarALumis, type MensagemChat } from "@/lib/lumis-chat";
import { cn } from "@/lib/utils";

const SUGESTOES_VISITANTE = [
  "O que é a Lume?",
  "Como minha escola pode começar a usar?",
  "Os dados dos alunos ficam seguros?",
  "Esqueci minha senha. E agora?",
];

const SUGESTOES = [
  "Como adapto uma prova para um aluno com dislexia?",
  "O que é o DUA, em poucas palavras?",
  "Como cadastro um aluno na Lume?",
  "Ideias para incluir um aluno com TEA no trabalho em grupo",
];

function lerConversa(chave: string): MensagemChat[] {
  try {
    const bruto = window.sessionStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as MensagemChat[]) : [];
  } catch {
    return [];
  }
}

function negrito(linha: string): ReactNode[] {
  return linha
    .split(/(\*\*[^*]+\*\*)/g)
    .map((parte, i) =>
      parte.startsWith("**") && parte.endsWith("**") ? (
        <strong key={i}>{parte.slice(2, -2)}</strong>
      ) : (
        parte
      ),
    );
}

function TextoDaLumis({ texto }: { texto: string }) {
  const blocos: ReactNode[] = [];
  let itens: string[] = [];
  const fecharLista = () => {
    if (!itens.length) return;
    blocos.push(
      <ul key={`l${blocos.length}`} className="list-disc space-y-1 pl-4">
        {itens.map((t, i) => (
          <li key={i}>{negrito(t)}</li>
        ))}
      </ul>,
    );
    itens = [];
  };
  for (const linha of texto.split("\n")) {
    const item = linha.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      itens.push(item[1] ?? "");
      continue;
    }
    fecharLista();
    if (linha.trim())
      blocos.push(<p key={`p${blocos.length}`}>{negrito(linha.replace(/^#+\s*/, ""))}</p>);
  }
  fecharLista();
  return <div className="space-y-2">{blocos}</div>;
}

export function ChatLumis({ modo = "conta" }: { modo?: "conta" | "visitante" }) {
  const visitante = modo === "visitante";
  const chave = `lume:chat-lumis:${modo}:v1`;
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState("");
  const [restantes, setRestantes] = useState<number | null>(null);
  const [sugerirEquipe, setSugerirEquipe] = useState(false);
  const [falando, setFalando] = useState(false);
  const { visao } = useAcesso();
  const escola = visao && "escola" in visao ? visao.escola : null;
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setMensagens(lerConversa(chave)), [chave]);
  useEffect(
    () =>
      aoAbrirLumis((pergunta) => {
        setAberto(true);
        if (pergunta) setTexto(pergunta);
      }),
    [],
  );
  useEffect(() => {
    try {
      window.sessionStorage.setItem(chave, JSON.stringify(mensagens.slice(-30)));
    } catch {}
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens, pensando, chave, falando]);
  useEffect(() => {
    if (aberto) setTimeout(() => campo.current?.focus(), 50);
  }, [aberto]);

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim();
    if (limpa.length < 2 || pensando) return;
    setErro("");
    setTexto("");
    const historico = mensagens;
    setMensagens([...historico, { autor: "professor", texto: limpa }]);
    setPensando(true);
    const r = await perguntarALumis(limpa, historico, modo);
    setPensando(false);
    if (!r.ok) {
      setErro(r.erro);
      setMensagens(historico);
      setTexto(limpa);
      return;
    }
    setRestantes(r.restantes);
    const marca = "[FALAR_COM_EQUIPE]";
    if (r.texto.includes(marca)) setSugerirEquipe(true);
    setMensagens([
      ...historico,
      { autor: "professor", texto: limpa },
      { autor: "lumis", texto: r.texto.split(marca).join("").trim() },
    ]);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void perguntar(texto);
  }

  return (
    <div className="print:hidden">
      {aberto ? (
        <section
          role="dialog"
          aria-label="Conversa com a Lumis"
          className={cn(
            "fixed right-3 z-40 flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-20px_rgba(27,39,68,0.45)] lg:right-6",
            visitante ? "bottom-24" : "bottom-20 lg:bottom-6",
          )}
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <img src={iconeLumis} alt="" className="h-9 w-9 object-contain" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold">Lumis</p>
              <p className="text-xs text-muted-foreground">
                {visitante
                  ? "Tire suas dúvidas sobre a Lume"
                  : "Tire dúvidas sobre inclusão e a Lume"}
              </p>
            </div>
            {mensagens.length ? (
              <button
                type="button"
                onClick={() => {
                  setMensagens([]);
                  setErro("");
                  setSugerirEquipe(false);
                  setFalando(false);
                }}
                aria-label="Começar uma conversa nova"
                title="Começar de novo"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-secondary"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar conversa"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {mensagens.length === 0 ? (
              <div>
                <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5">
                  {visitante
                    ? "Oi! Eu sou a Lumis, a assistente da Lume. Posso explicar como a Lume funciona, como a sua escola pode usar e ajudar se você tiver problemas para entrar."
                    : "Oi! Eu sou a Lumis. Posso ajudar com estratégias de inclusão, adaptação de atividades e com o uso da Lume. Como posso ajudar?"}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {(visitante ? SUGESTOES_VISITANTE : SUGESTOES).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void perguntar(s)}
                      className="cursor-pointer rounded-2xl border border-border px-3 py-2 text-left text-xs font-semibold hover:border-primary hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {mensagens.map((m, i) =>
              m.autor === "professor" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 whitespace-pre-wrap text-primary-foreground">
                    {m.texto}
                  </p>
                </div>
              ) : (
                <div
                  key={i}
                  className="max-w-[92%] rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2.5"
                >
                  <TextoDaLumis texto={m.texto} />
                </div>
              ),
            )}
            {pensando ? (
              <p className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-3.5 py-2.5 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> A Lumis está pensando…
              </p>
            ) : null}
            {erro ? (
              <p role="alert" className="rounded-2xl bg-coral-soft px-3.5 py-2.5">
                {erro}
              </p>
            ) : null}
            {falando ? (
              <FalarComEquipe
                visitante={visitante}
                escola={escola}
                conversa={mensagens}
                onCancelar={() => setFalando(false)}
                onEnviado={(texto) => {
                  setFalando(false);
                  setSugerirEquipe(false);
                  setMensagens((m) => [...m, { autor: "lumis", texto }]);
                }}
              />
            ) : mensagens.length || erro ? (
              <button
                type="button"
                onClick={() => setFalando(true)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  sugerirEquipe
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Headset className="h-3.5 w-3.5" /> Não resolveu? Falar com a equipe
              </button>
            ) : null}
            <div ref={fim} />
          </div>

          <form onSubmit={enviar} className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={campo}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void perguntar(texto);
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Escreva sua dúvida…"
                aria-label="Sua pergunta para a Lumis"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={pensando || texto.trim().length < 2}
                aria-label="Enviar pergunta"
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" />{" "}
              {visitante
                ? "Não escreva senhas nem dados pessoais. A conversa não fica salva."
                : "Não escreva nomes de alunos. A conversa não fica salva."}
              {restantes !== null
                ? ` · ${restantes} ${restantes === 1 ? "pergunta" : "perguntas"} hoje`
                : ""}
            </p>
          </form>
        </section>
      ) : null}

      {/* Dentro da plataforma a Lumis abre pelo botão do topo; o botão flutuante fica só na capa. */}
      {visitante ? (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? "Fechar a Lumis" : "Abrir a Lumis para tirar dúvidas"}
          aria-expanded={aberto}
          className={cn(
            "fixed right-3 bottom-6 z-40 grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-card shadow-[0_12px_30px_-10px_rgba(27,39,68,0.55)] ring-1 ring-border transition-transform hover:scale-105 lg:right-6",
            aberto && "hidden lg:grid",
          )}
        >
          {aberto ? (
            <X className="h-6 w-6" />
          ) : (
            <img src={iconeLumis} alt="" className="h-10 w-10 object-contain" />
          )}
        </button>
      ) : null}
    </div>
  );
}

function FalarComEquipe({
  visitante,
  escola,
  conversa,
  onCancelar,
  onEnviado,
}: {
  visitante: boolean;
  escola: string | null;
  conversa: MensagemChat[];
  onCancelar: () => void;
  onEnviado: (texto: string) => void;
}) {
  const ultima = [...conversa].reverse().find((m) => m.autor === "professor")?.texto ?? "";
  const [mensagem, setMensagem] = useState(ultima);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (mensagem.trim().length < 5) return setErro("Conte em poucas palavras o que você precisa.");
    if (visitante && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      return setErro("Digite seu e-mail para a equipe poder responder.");
    }
    setEnviando(true);
    setErro("");
    const r = await abrirChamado({
      modo: visitante ? "visitante" : "conta",
      escola,
      mensagem: mensagem.trim(),
      conversa,
      ...(visitante ? { nome: nome.trim(), email: email.trim() } : {}),
    });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    onEnviado(
      visitante
        ? `Pronto! A equipe da Lume recebeu sua mensagem e vai responder em ${email.trim()}.`
        : "Pronto! A equipe da Lume recebeu sua mensagem e vai responder no e-mail da sua conta.",
    );
  }

  return (
    <form
      onSubmit={(e) => void enviar(e)}
      className="space-y-2 rounded-2xl border border-border p-3"
      noValidate
    >
      <p className="text-xs font-bold">Falar com a equipe da Lume</p>
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value.slice(0, 2000))}
        rows={3}
        placeholder="O que você precisa?"
        aria-label="Mensagem para a equipe"
        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm"
      />
      {visitante ? (
        <>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value.slice(0, 120))}
            placeholder="Seu nome (opcional)"
            aria-label="Seu nome"
            className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 200))}
            placeholder="Seu e-mail, para a resposta"
            aria-label="Seu e-mail"
            className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
        </>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        A conversa com a Lumis vai junto, para a equipe entender o caso. Não inclua nomes de alunos.
      </p>
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {enviando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-xs font-semibold"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
