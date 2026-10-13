import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { useAcesso } from "@/lib/acesso";
import {
  prepararFoto,
  sairDeTodosOsAparelhos,
  salvarMeuPerfil,
  trocarEmail,
  trocarSenha,
  type Resultado,
} from "@/lib/meu-perfil";
import { usePerfil, type Perfil } from "@/lib/perfil-store";
import { sair, useSessao } from "@/lib/sessao-store";
import { contasReais } from "@/lib/supabase";
import { cn, iniciais } from "@/lib/utils";

type Busca = { email?: string };

export const Route = createFileRoute("/perfil")({
  validateSearch: (s: Record<string, unknown>): Busca =>
    s["email"] === "confirmado" ? { email: "confirmado" } : {},
  head: () => ({ meta: [{ title: "Meu perfil | Lume" }] }),
  component: MeuPerfil,
});

const FUNCOES = [
  "Professora",
  "Professor",
  "Professor(a) de AEE",
  "Mediador(a)",
  "Coordenação",
  "Direção",
];

const campo = "h-10 rounded-xl bg-card";
const botao =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50";

function Aviso({ r }: { r: Resultado | null }) {
  if (!r) return null;
  return (
    <p
      role={r.ok ? "status" : "alert"}
      className={cn(
        "mt-3 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
        r.ok ? "bg-leaf-soft" : "bg-coral-soft",
      )}
    >
      {r.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      {r.ok ? (r.aviso ?? "Salvo.") : r.erro}
    </p>
  );
}

function Campo({
  id,
  rotulo,
  ajuda,
  children,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {rotulo}
      </label>
      {children}
      {ajuda ? <p className="mt-1 text-xs text-muted-foreground">{ajuda}</p> : null}
    </div>
  );
}

function Etiquetas({
  id,
  valores,
  onChange,
  sugestao,
}: {
  id: string;
  valores: string[];
  onChange: (v: string[]) => void;
  sugestao: string;
}) {
  const [texto, setTexto] = useState("");
  function adicionar() {
    const novo = texto.trim().slice(0, 60);
    if (novo && !valores.includes(novo) && valores.length < 15) onChange([...valores, novo]);
    setTexto("");
  }
  return (
    <div>
      {valores.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {valores.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(valores.filter((x) => x !== v))}
                aria-label={`Tirar ${v}`}
                className="cursor-pointer rounded-full p-0.5 hover:bg-black/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={id}
          value={texto}
          placeholder={sugestao}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              adicionar();
            }
          }}
          className={campo}
        />
        <button
          type="button"
          onClick={adicionar}
          aria-label="Adicionar"
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MeuPerfil() {
  const perfil = usePerfil();
  const sessao = useSessao();
  const { visao } = useAcesso();
  const { email: emailConfirmado } = Route.useSearch();
  const [rascunho, setRascunho] = useState<Perfil>(perfil);
  const [mexeu, setMexeu] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erroFoto, setErroFoto] = useState("");
  const entradaFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mexeu) setRascunho(perfil);
  }, [perfil, mexeu]);

  const mudar = (parte: Partial<Perfil>) => {
    setMexeu(true);
    setResultado(null);
    setRascunho((r) => ({ ...r, ...parte }));
  };

  async function escolherFoto(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (entradaFoto.current) entradaFoto.current.value = "";
    if (!arquivo) return;
    setErroFoto("");
    if (!arquivo.type.startsWith("image/")) {
      setErroFoto("Escolha uma imagem (JPG, PNG ou WEBP).");
      return;
    }
    try {
      mudar({ foto: await prepararFoto(arquivo) });
    } catch (e) {
      console.error(e);
      setErroFoto("Não foi possível ler essa imagem. Tente outra.");
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (rascunho.nome.trim().length < 2) {
      setResultado({ ok: false, erro: "Escreva seu nome com pelo menos 2 letras." });
      return;
    }
    setSalvando(true);
    const r = await salvarMeuPerfil({
      ...rascunho,
      nome: rascunho.nome.trim().slice(0, 120),
      apelido: (rascunho.apelido ?? "").trim().slice(0, 40),
      telefone: (rascunho.telefone ?? "").trim().slice(0, 30),
      formacao: (rascunho.formacao ?? "").trim().slice(0, 300),
    });
    setSalvando(false);
    setResultado(r);
    if (r.ok) setMexeu(false);
  }

  const ehProfessor = visao?.tipo === "professor" || visao?.tipo === "demo";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Meu perfil" subtitle="Suas informações e a segurança da sua conta." />

      {emailConfirmado ? (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-2xl bg-leaf-soft px-4 py-3 text-sm"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Link confirmado. Se também chegou um link no outro e-mail, clique nele para concluir a
          troca.
        </p>
      ) : null}

      <form onSubmit={salvar} className="card-soft p-5 sm:p-6" noValidate>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            {rascunho.foto ? (
              <img
                src={rascunho.foto}
                alt="Sua foto"
                className="h-24 w-24 rounded-full object-cover ring-4 ring-tangerine-soft"
              />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full bg-tangerine-soft font-display text-2xl font-semibold">
                {iniciais(rascunho.nome) || "?"}
              </span>
            )}
          </div>
          <div>
            <p className="font-display text-lg font-semibold">{rascunho.nome || "Seu nome"}</p>
            <p className="text-sm text-muted-foreground">{rascunho.funcao}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => entradaFoto.current?.click()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
              >
                <Camera className="h-3.5 w-3.5" /> {rascunho.foto ? "Trocar foto" : "Pôr foto"}
              </button>
              {rascunho.foto ? (
                <button
                  type="button"
                  onClick={() => mudar({ foto: null })}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-coral-soft"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Tirar foto
                </button>
              ) : null}
            </div>
            <input
              ref={entradaFoto}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-label="Escolher foto"
              onChange={(e) => void escolherFoto(e.target.files)}
            />
            {erroFoto ? <p className="mt-1 text-xs text-destructive">{erroFoto}</p> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Campo id="p-nome" rotulo="Nome completo" ajuda="Aparece para a gestão e nas provas.">
            <Input
              id="p-nome"
              value={rascunho.nome}
              onChange={(e) => mudar({ nome: e.target.value })}
              className={campo}
              autoComplete="name"
            />
          </Campo>
          <Campo id="p-apelido" rotulo="Como quer ser chamado(a)" ajuda="Usado na saudação.">
            <Input
              id="p-apelido"
              value={rascunho.apelido ?? ""}
              placeholder="Ex.: Ju"
              onChange={(e) => mudar({ apelido: e.target.value })}
              className={campo}
            />
          </Campo>
          <Campo id="p-funcao" rotulo="Função">
            <select
              id="p-funcao"
              value={rascunho.funcao}
              onChange={(e) => mudar({ funcao: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-xl border border-input bg-card px-3 text-sm"
            >
              {Array.from(new Set([rascunho.funcao, ...FUNCOES])).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Campo>
          <Campo
            id="p-telefone"
            rotulo="Telefone ou WhatsApp (opcional)"
            ajuda="Só a gestão da escola vê."
          >
            <Input
              id="p-telefone"
              type="tel"
              inputMode="tel"
              value={rascunho.telefone ?? ""}
              placeholder="(11) 99999-0000"
              onChange={(e) => mudar({ telefone: e.target.value })}
              className={campo}
              autoComplete="tel"
            />
          </Campo>
        </div>

        {ehProfessor ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo
              id="p-disciplinas"
              rotulo="Disciplinas que você ensina"
              ajuda="Já vêm preenchidas nas provas e nos planos."
            >
              <Etiquetas
                id="p-disciplinas"
                valores={rascunho.disciplinas ?? []}
                onChange={(v) => mudar({ disciplinas: v })}
                sugestao="Ex.: Matemática"
              />
            </Campo>
            <Campo id="p-series" rotulo="Séries ou anos">
              <Etiquetas
                id="p-series"
                valores={rascunho.series ?? []}
                onChange={(v) => mudar({ series: v })}
                sugestao="Ex.: 5º ano"
              />
            </Campo>
          </div>
        ) : null}

        <div className="mt-4">
          <Campo id="p-formacao" rotulo="Formação ou especialização (opcional)">
            <Input
              id="p-formacao"
              value={rascunho.formacao ?? ""}
              placeholder="Ex.: Pedagogia, especialização em AEE, Libras"
              onChange={(e) => mudar({ formacao: e.target.value })}
              className={campo}
            />
          </Campo>
        </div>

        <Aviso r={resultado} />
        <button
          type="submit"
          disabled={salvando || !mexeu}
          className={cn(
            botao,
            "mt-5 w-full bg-primary text-primary-foreground shadow-soft hover:opacity-90 sm:w-auto",
          )}
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {salvando ? "Salvando…" : mexeu ? "Salvar alterações" : "Tudo salvo"}
        </button>
      </form>

      <h2 className="mt-10 mb-4 inline-flex items-center gap-2 font-display text-xl font-semibold">
        <ShieldCheck className="h-5 w-5" /> Conta e segurança
      </h2>
      {!contasReais ? (
        <p className="card-soft p-5 text-sm text-muted-foreground">
          No modo de demonstração não há conta de verdade para trocar e-mail ou senha.
        </p>
      ) : (
        <div className="space-y-4">
          <TrocarEmail atual={sessao?.email ?? ""} />
          <TrocarSenha />
          <SairDeTodos />
        </div>
      )}
    </div>
  );
}

function TrocarEmail({ atual }: { atual: string }) {
  const [novo, setNovo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [r, setR] = useState<Resultado | null>(null);
  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo.trim());

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || novo.trim().toLowerCase() === atual.toLowerCase()) {
      setR({ ok: false, erro: "Digite um e-mail válido e diferente do atual." });
      return;
    }
    setOcupado(true);
    setR(await trocarEmail(novo));
    setOcupado(false);
  }

  return (
    <form onSubmit={enviar} className="card-soft p-5" noValidate>
      <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
        <Mail className="h-4 w-4" /> E-mail
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Atual: <strong className="text-foreground">{atual}</strong>
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="novo-email" className="sr-only">
          Novo e-mail
        </label>
        <Input
          id="novo-email"
          type="email"
          value={novo}
          placeholder="Novo e-mail"
          onChange={(e) => setNovo(e.target.value)}
          className={campo}
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={ocupado || !novo.trim()}
          className={cn(botao, "shrink-0 border border-border bg-card hover:bg-accent")}
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Trocar e-mail
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Por segurança, a troca só vale depois que você clicar no link que vamos enviar.
      </p>
      <Aviso r={r} />
    </form>
  );
}

function TrocarSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [r, setR] = useState<Resultado | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (nova.length < 8)
      return setR({ ok: false, erro: "A senha nova precisa ter pelo menos 8 caracteres." });
    if (nova !== repetir) return setR({ ok: false, erro: "As duas senhas novas não são iguais." });
    if (nova === atual)
      return setR({ ok: false, erro: "A senha nova precisa ser diferente da atual." });
    setOcupado(true);
    const res = await trocarSenha(atual, nova);
    setOcupado(false);
    setR(res);
    if (res.ok) {
      setAtual("");
      setNova("");
      setRepetir("");
    }
  }

  return (
    <form onSubmit={enviar} className="card-soft p-5" noValidate>
      <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
        <KeyRound className="h-4 w-4" /> Senha
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Campo id="senha-atual" rotulo="Senha atual">
          <Input
            id="senha-atual"
            type="password"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            className={campo}
            autoComplete="current-password"
          />
        </Campo>
        <Campo id="senha-nova" rotulo="Senha nova">
          <Input
            id="senha-nova"
            type="password"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            className={campo}
            autoComplete="new-password"
          />
        </Campo>
        <Campo id="senha-repetir" rotulo="Repita a senha nova">
          <Input
            id="senha-repetir"
            type="password"
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            className={campo}
            autoComplete="new-password"
          />
        </Campo>
      </div>
      <button
        type="submit"
        disabled={ocupado || !atual || !nova || !repetir}
        className={cn(botao, "mt-3 border border-border bg-card hover:bg-accent")}
      >
        {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Trocar senha
      </button>
      <Aviso r={r} />
    </form>
  );
}

function SairDeTodos() {
  const [ocupado, setOcupado] = useState(false);
  const [r, setR] = useState<Resultado | null>(null);
  return (
    <div className="card-soft p-5">
      <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
        <LogOut className="h-4 w-4" /> Sair de todos os aparelhos
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use se você entrou num computador da escola e esqueceu de sair. Você também sai deste
        aparelho e entra de novo com a sua senha.
      </p>
      <button
        type="button"
        disabled={ocupado}
        onClick={() => {
          if (!window.confirm("Sair da Lume em todos os aparelhos, inclusive neste?")) return;
          setOcupado(true);
          void sairDeTodosOsAparelhos().then(async (res) => {
            setOcupado(false);
            if (!res.ok) return setR(res);
            await sair();
          });
        }}
        className={cn(botao, "mt-3 border border-border bg-card hover:bg-coral-soft")}
      >
        {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sair de todos
      </button>
      <Aviso r={r} />
    </div>
  );
}
