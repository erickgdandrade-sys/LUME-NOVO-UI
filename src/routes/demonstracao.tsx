import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Sparkles,
  Trophy,
  User,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import estrela from "@/assets/estrela-formulario.webp";
import { LumeLogo } from "@/components/AppShell";
import { ChatLumis } from "@/components/ChatLumis";
import { Aviso, botaoPrincipal } from "@/components/TelaAcesso";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CARGOS,
  ESTADOS,
  cidadesDoEstado,
  mascararTelefone,
  pedidoDemonstracao,
  type PedidoDemonstracao,
} from "@/lib/demonstracao";
import { enviarPedido } from "@/lib/demonstracao-envio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demonstracao")({
  head: () => ({
    meta: [
      { title: "Solicite uma demonstração | Lume" },
      {
        name: "description",
        content: "Agende uma demonstração da Lume, a plataforma de educação inclusiva.",
      },
    ],
  }),
  component: Demonstracao,
});

const EMAIL_DA_EQUIPE = "devgang777@gmail.com";

const destaques: { texto: string; icon: LucideIcon; tom: string; cor: string }[] = [
  {
    texto: "Demonstração personalizada para a sua realidade",
    icon: Sparkles,
    tom: "#dcecfb",
    cor: "#2f6fd6",
  },
  {
    texto: "Tire suas dúvidas ao vivo com o nosso time",
    icon: UsersRound,
    tom: "#dff1df",
    cor: "#2f8f4e",
  },
  {
    texto: "Veja na prática como a Lume funciona na sua escola",
    icon: BarChart3,
    tom: "#ece3fb",
    cor: "#7c4fd6",
  },
];

type Campos = Omit<PedidoDemonstracao, "consentimento" | "cargo" | "mensagem"> & {
  cargo: string;
  mensagem: string;
  consentimento: boolean;
};

const VAZIO: Campos = {
  nome: "",
  email: "",
  telefone: "",
  escola: "",
  cargo: "",
  estado: "SC",
  cidade: "",
  mensagem: "",
  consentimento: false,
};

const campo =
  "h-12 w-full rounded-full border-border bg-white pl-12 pr-4 text-sm shadow-none focus-visible:ring-2";
const rotulo = "text-sm font-semibold text-[#1b2744]";

function Demonstracao() {
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [site, setSite] = useState("");

  const mudar = <K extends keyof Campos>(chave: K, valor: Campos[K]) => {
    setCampos((c) => ({ ...c, [chave]: valor }));
    setErros((e) => ({ ...e, [chave]: undefined }));
  };

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErroEnvio(null);
    const resultado = pedidoDemonstracao.safeParse({
      ...campos,
      mensagem: campos.mensagem || undefined,
    });
    if (!resultado.success) {
      const novos: typeof erros = {};
      for (const problema of resultado.error.issues) {
        const chave = problema.path[0] as keyof Campos;
        novos[chave] ??= problema.message;
      }
      setErros(novos);
      document.getElementById(`campo-${Object.keys(novos)[0]}`)?.focus();
      return;
    }
    setEnviando(true);
    const resposta = await enviarPedido(resultado.data, site);
    setEnviando(false);
    if (!resposta.ok) {
      setErroEnvio(resposta.erro);
      return;
    }
    setEnviado(true);
    setCampos(VAZIO);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-[#0e273a]">
      <div className="relative isolate mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 items-center gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(33rem,1.05fr)] lg:gap-6 lg:py-10 xl:px-12">
        <Apresentacao />

        <main className="claro-fixo relative w-full rounded-[2.5rem] bg-white px-6 py-9 shadow-[0_30px_80px_-30px_rgba(27,39,68,0.35)] sm:px-11 sm:py-11 lg:px-9 2xl:px-11">
          <img
            src={estrela}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute top-[30%] -left-36 -z-10 hidden w-52 -rotate-6 drop-shadow-[0_18px_24px_rgba(27,39,68,0.18)] select-none lg:block xl:-left-44 xl:w-60 2xl:-left-52 2xl:w-72"
          />
          {enviado ? (
            <Enviado voltar={() => setEnviado(false)} />
          ) : (
            <>
              <p className="text-xs font-bold tracking-[0.12em] text-[#1f6fe0] uppercase">
                Demonstração da plataforma
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-[#1b2744] sm:text-[2.35rem] sm:leading-tight">
                Solicite uma demonstração
              </h1>
              <p className="mt-2 max-w-md text-[15px] text-muted-foreground">
                Preencha seus dados e nossa equipe entrará em contato para agendar um horário, sem
                compromisso.
              </p>

              <form
                onSubmit={enviar}
                noValidate
                className="mt-7 grid gap-x-5 gap-y-4 sm:grid-cols-2"
              >
                <Campo nome="nome" rotulo="Nome completo" erro={erros.nome} largo>
                  <Icone icon={User} />
                  <Input
                    id="campo-nome"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    className={campo}
                    value={campos.nome}
                    onChange={(e) => mudar("nome", e.target.value)}
                    aria-invalid={Boolean(erros.nome)}
                  />
                </Campo>

                <Campo nome="email" rotulo="E-mail" erro={erros.email}>
                  <Icone icon={Mail} />
                  <Input
                    id="campo-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className={campo}
                    value={campos.email}
                    onChange={(e) => mudar("email", e.target.value)}
                    aria-invalid={Boolean(erros.email)}
                  />
                </Campo>

                <Campo nome="telefone" rotulo="Telefone" erro={erros.telefone}>
                  <Icone icon={Phone} />
                  <Input
                    id="campo-telefone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="(00) 00000-0000"
                    className={campo}
                    value={campos.telefone}
                    onChange={(e) => mudar("telefone", mascararTelefone(e.target.value))}
                    aria-invalid={Boolean(erros.telefone)}
                  />
                </Campo>

                <Campo
                  nome="escola"
                  rotulo="Nome da escola ou instituição"
                  erro={erros.escola}
                  largo
                >
                  <Icone icon={Building2} />
                  <Input
                    id="campo-escola"
                    autoComplete="organization"
                    placeholder="Nome da escola ou instituição"
                    className={campo}
                    value={campos.escola}
                    onChange={(e) => mudar("escola", e.target.value)}
                    aria-invalid={Boolean(erros.escola)}
                  />
                </Campo>

                <Campo nome="cargo" rotulo="Cargo" erro={erros.cargo}>
                  <Icone icon={Briefcase} />
                  <Select value={campos.cargo} onValueChange={(v) => mudar("cargo", v)}>
                    <SelectTrigger
                      id="campo-cargo"
                      className={cn(campo, "data-[placeholder]:text-muted-foreground")}
                      aria-invalid={Boolean(erros.cargo)}
                    >
                      <SelectValue placeholder="Selecione o seu cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARGOS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>

                <Campo nome="cidade" rotulo="Sua cidade" erro={erros.cidade ?? erros.estado}>
                  <div className="flex gap-2">
                    <Select
                      value={campos.estado}
                      onValueChange={(uf) => {
                        mudar("estado", uf);
                        mudar("cidade", "");
                      }}
                    >
                      <SelectTrigger
                        aria-label="Estado"
                        className="h-12 w-[5.5rem] shrink-0 rounded-xl border-border bg-white px-4 text-sm shadow-none"
                      >
                        <SelectValue>{campos.estado}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map(([uf, nome]) => (
                          <SelectItem key={uf} value={uf}>
                            {uf} · {nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <EscolherCidade
                      uf={campos.estado}
                      valor={campos.cidade}
                      mudar={(c) => mudar("cidade", c)}
                      invalido={Boolean(erros.cidade)}
                    />
                  </div>
                </Campo>

                <Campo
                  nome="mensagem"
                  rotulo="Como podemos ajudar? (opcional)"
                  erro={erros.mensagem}
                  largo
                >
                  <MessageSquareText
                    aria-hidden="true"
                    className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-muted-foreground"
                  />
                  <Textarea
                    id="campo-mensagem"
                    rows={3}
                    maxLength={1500}
                    placeholder="Conte um pouco sobre a sua realidade ou dúvidas"
                    className="min-h-[5.5rem] resize-none rounded-3xl border-border bg-white py-3 pr-4 pl-12 text-sm shadow-none"
                    value={campos.mensagem}
                    onChange={(e) => mudar("mensagem", e.target.value)}
                  />
                </Campo>

                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-[#2b3550]">
                    <Checkbox
                      id="campo-consentimento"
                      className="mt-0.5"
                      checked={campos.consentimento}
                      onCheckedChange={(v) => mudar("consentimento", v === true)}
                      aria-invalid={Boolean(erros.consentimento)}
                    />
                    <span>
                      Autorizo a Lume a usar estes dados apenas para entrar em contato sobre a
                      demonstração.
                    </span>
                  </label>
                  {erros.consentimento && (
                    <p className="mt-1.5 pl-7 text-xs font-medium text-destructive">
                      {erros.consentimento}
                    </p>
                  )}
                </div>

                <input
                  type="text"
                  name="site"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                />
                {erroEnvio && (
                  <div className="sm:col-span-2">
                    <Aviso tipo="erro">
                      {erroEnvio} Se preferir, escreva para <strong>{EMAIL_DA_EQUIPE}</strong>.
                    </Aviso>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={enviando}
                    className={cn(botaoPrincipal, "h-14 text-lg")}
                  >
                    {enviando ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Solicitar demonstração <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                  <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0" /> Seus dados estão seguros e serão
                    usados apenas para contato.
                  </p>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
      <ChatLumis modo="visitante" />
    </div>
  );
}

function Apresentacao() {
  return (
    <section className="relative lg:pr-4">
      <Link
        to="/entrar"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2f6fd6] hover:underline dark:text-[#6e9bf0]"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para o login
      </Link>
      <LumeLogo className="h-12 w-auto sm:h-14" />

      <div className="relative">
        <h2 className="mt-7 max-w-[26rem] font-display text-[2.4rem] leading-[1.08] font-bold text-[#1b2744] sm:text-5xl xl:max-w-[27rem] xl:text-[3.1rem] dark:text-white">
          Conheça a Lume na prática.{" "}
          <em className="block text-[#2f6fd6] dark:text-[#5b94f2]">Agende uma demonstração.</em>
        </h2>
      </div>

      <p className="mt-6 max-w-[27rem] text-[15.5px] leading-relaxed text-[#4a5470] dark:text-[#c9d1df]">
        Veja como a Lume pode transformar suas aulas em experiências mais inclusivas, com
        planejamento inteligente, recursos práticos e acompanhamento do desenvolvimento de todos os
        alunos.
      </p>

      <ul className="mt-7 space-y-4">
        {destaques.map((d) => (
          <li key={d.texto} className="flex items-center gap-4">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
              style={{ background: d.tom }}
            >
              <d.icon className="h-5 w-5" style={{ color: d.cor }} />
            </span>
            <span className="max-w-[15rem] text-[15px] leading-snug text-[#2b3550] dark:text-[#dfe5ef]">
              {d.texto}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 inline-flex max-w-md items-center gap-3 rounded-2xl bg-[#fdf1d6] px-5 py-3.5 text-[13px] leading-snug text-[#5b4a22] dark:bg-[#37321c] dark:text-[#f1e3b8]">
        <Trophy className="h-5 w-5 shrink-0 text-[#d9822b]" />
        Projeto premiado, criado para apoiar professores na inclusão de todos os alunos.
      </div>
    </section>
  );
}

function Campo({
  nome,
  rotulo: texto,
  erro,
  largo,
  children,
}: {
  nome: string;
  rotulo: string;
  erro?: string | undefined;
  largo?: boolean;
  children: ReactNode;
}) {
  const opcional = texto.includes("(opcional)");
  return (
    <div className={cn("space-y-1.5", largo && "sm:col-span-2")}>
      <Label htmlFor={`campo-${nome}`} className={rotulo}>
        {texto}
        {!opcional && <span className="ml-0.5 text-[#1f6fe0]">*</span>}
      </Label>
      <div className="relative">{children}</div>
      {erro && <p className="pl-4 text-xs font-medium text-destructive">{erro}</p>}
    </div>
  );
}

function Icone({ icon: I }: { icon: LucideIcon }) {
  return (
    <I
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground"
    />
  );
}

function EscolherCidade({
  uf,
  valor,
  mudar,
  invalido,
}: {
  uf: string;
  valor: string;
  mudar: (cidade: string) => void;
  invalido: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [cidades, setCidades] = useState<string[] | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCidades(null);
    setFalhou(false);
    cidadesDoEstado(uf)
      .then((lista) => ativo && setCidades(lista))
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
    };
  }, [uf]);

  if (falhou) {
    return (
      <div className="relative min-w-0 flex-1">
        <Icone icon={MapPin} />
        <Input
          id="campo-cidade"
          placeholder="Sua cidade"
          className={campo}
          value={valor}
          onChange={(e) => mudar(e.target.value)}
          aria-invalid={invalido}
        />
      </div>
    );
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          id="campo-cidade"
          type="button"
          role="combobox"
          aria-expanded={aberto}
          aria-invalid={invalido}
          className={cn(
            campo,
            "relative flex min-w-0 flex-1 items-center border text-left aria-[invalid=true]:border-destructive",
            !valor && "text-muted-foreground",
          )}
        >
          <Icone icon={MapPin} />
          <span className="truncate">{valor || "Sua cidade"}</span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar cidade…" />
          <CommandList>
            {cidades ? (
              <>
                <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                <CommandGroup>
                  {cidades.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => {
                        mudar(c);
                        setAberto(false);
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", c === valor ? "opacity-100" : "opacity-0")}
                      />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando cidades…
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Enviado({ voltar }: { voltar: () => void }) {
  return (
    <div className="py-10 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dff1df]">
        <Check className="h-8 w-8 text-[#2f8f4e]" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold text-[#1b2744]">Pedido recebido!</h1>
      <p className="mx-auto mt-3 max-w-sm text-[15px] text-muted-foreground">
        Obrigado pelo interesse na Lume. Nossa equipe vai entrar em contato em breve para combinar
        um horário para a demonstração.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold">
        <Link to="/entrar" className="text-[#1f6fe0] hover:underline">
          Voltar para o login
        </Link>
        <button type="button" onClick={voltar} className="text-muted-foreground hover:underline">
          Enviar outro pedido
        </button>
      </div>
    </div>
  );
}
