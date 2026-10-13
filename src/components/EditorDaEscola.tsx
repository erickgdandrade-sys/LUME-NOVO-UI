import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { CabecalhoEscola } from "@/components/CabecalhoEscola";
import { CabecalhoPronto } from "@/components/CabecalhoPronto";
import { Input } from "@/components/ui/input";
import { cabecalhoDaEscola, type DadosDaEscola } from "@/lib/escola-cabecalho";
import { prepararLogo, salvarDadosDaEscola, useDadosDaEscola } from "@/lib/escola-dados";
import { cn } from "@/lib/utils";

type Rascunho = Omit<DadosDaEscola, "id">;

const vazio: Rascunho = {
  nome: "",
  cidade: "",
  uf: "",
  endereco: "",
  telefone: "",
  email_contato: "",
  inep: "",
  linha_superior: "",
  logo_url: null,
  logo_secundario: null,
  cabecalho_modo: "campos",
  cabecalho_imagem: null,
};

const campo = "h-10 rounded-xl bg-card";

function Campo({
  id,
  rotulo,
  ajuda,
  children,
  className,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {rotulo}
      </label>
      {children}
      {ajuda ? <p className="mt-1 text-xs text-muted-foreground">{ajuda}</p> : null}
    </div>
  );
}

function EscolherLogo({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: string | null;
  onChange: (v: string | null) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  async function escolher(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (entrada.current) entrada.current.value = "";
    if (!arquivo) return;
    setErro("");
    if (!arquivo.type.startsWith("image/")) return setErro("Escolha uma imagem PNG ou JPG.");
    try {
      onChange(await prepararLogo(arquivo));
    } catch (e) {
      console.error(e);
      setErro("Não foi possível usar essa imagem. Tente uma menor ou em PNG.");
    }
  }
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-xs font-semibold text-muted-foreground">{rotulo}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid h-16 w-28 shrink-0 place-items-center rounded-xl bg-white">
          {valor ? (
            <img src={valor} alt="" className="max-h-14 max-w-24 object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-[#8a94ab]" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            <ImagePlus className="h-3.5 w-3.5" /> {valor ? "Trocar" : "Enviar"}
          </button>
          {valor ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-coral-soft"
            >
              <Trash2 className="h-3.5 w-3.5" /> Tirar
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label={rotulo}
        onChange={(e) => void escolher(e.target.files)}
      />
      {erro ? <p className="mt-1 text-xs text-destructive">{erro}</p> : null}
    </div>
  );
}

export function EditorDaEscola({ escolaId, onSalvo }: { escolaId: string; onSalvo?: () => void }) {
  const dados = useDadosDaEscola(escolaId);
  const [r, setR] = useState<Rascunho>(vazio);
  const [mexeu, setMexeu] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    if (dados && !mexeu) {
      const { id: _id, ...resto } = dados;
      setR({ ...vazio, ...resto });
    }
  }, [dados, mexeu]);

  const mudar = (parte: Partial<Rascunho>) => {
    setMexeu(true);
    setResultado(null);
    setR((x) => ({ ...x, ...parte }));
  };
  const texto = (chave: keyof Rascunho, max: number) => ({
    value: (r[chave] as string | null) ?? "",
    onChange: (e: { target: { value: string } }) =>
      mudar({ [chave]: e.target.value.slice(0, max) }),
  });

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (r.nome.trim().length < 2) {
      setResultado({ ok: false, texto: "Escreva o nome da escola." });
      return;
    }
    setSalvando(true);
    const res = await salvarDadosDaEscola(escolaId, r);
    setSalvando(false);
    if (!res.ok) return setResultado({ ok: false, texto: res.erro });
    setMexeu(false);
    setResultado({
      ok: true,
      texto: "Salvo. As próximas provas e folhas já saem com este cabeçalho.",
    });
    onSalvo?.();
  }

  if (!dados) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando a escola…
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void salvar(e)} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`e-nome-${escolaId}`} rotulo="Nome oficial da escola" className="sm:col-span-2">
          <Input id={`e-nome-${escolaId}`} className={campo} {...texto("nome", 160)} />
        </Campo>
        <Campo
          id={`e-sup-${escolaId}`}
          rotulo="Linha de cima (opcional)"
          ajuda="Ex.: Prefeitura de Campinas · Secretaria Municipal de Educação"
          className="sm:col-span-2"
        >
          <Input id={`e-sup-${escolaId}`} className={campo} {...texto("linha_superior", 160)} />
        </Campo>
        <Campo id={`e-end-${escolaId}`} rotulo="Endereço" className="sm:col-span-2">
          <Input
            id={`e-end-${escolaId}`}
            placeholder="Rua, número, bairro"
            className={campo}
            {...texto("endereco", 200)}
          />
        </Campo>
        <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-3">
          <Campo id={`e-cid-${escolaId}`} rotulo="Cidade">
            <Input id={`e-cid-${escolaId}`} className={campo} {...texto("cidade", 80)} />
          </Campo>
          <Campo id={`e-uf-${escolaId}`} rotulo="UF">
            <Input id={`e-uf-${escolaId}`} placeholder="SP" className={campo} {...texto("uf", 2)} />
          </Campo>
        </div>
        <Campo id={`e-tel-${escolaId}`} rotulo="Telefone">
          <Input
            id={`e-tel-${escolaId}`}
            type="tel"
            placeholder="(11) 3333-0000"
            className={campo}
            {...texto("telefone", 30)}
          />
        </Campo>
        <Campo id={`e-email-${escolaId}`} rotulo="E-mail de contato">
          <Input
            id={`e-email-${escolaId}`}
            type="email"
            className={campo}
            {...texto("email_contato", 120)}
          />
        </Campo>
        <Campo id={`e-inep-${escolaId}`} rotulo="Código INEP (opcional)">
          <Input
            id={`e-inep-${escolaId}`}
            inputMode="numeric"
            className={campo}
            {...texto("inep", 12)}
          />
        </Campo>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Cabeçalho das provas e folhas</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["campos", "Montar com os campos", "Logos e os dados acima, no padrão da Lume."],
              [
                "pronto",
                "Usar o cabeçalho pronto",
                "Envie o PDF ou a imagem do cabeçalho oficial.",
              ],
            ] as const
          ).map(([modo, titulo, ajuda]) => (
            <label
              key={modo}
              className={cn(
                "cursor-pointer rounded-2xl border p-3 transition-colors",
                r.cabecalho_modo === modo
                  ? "border-primary bg-sky-soft"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="radio"
                  name={`modo-${escolaId}`}
                  checked={r.cabecalho_modo === modo}
                  onChange={() => mudar({ cabecalho_modo: modo })}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {titulo}
              </span>
              <span className="mt-0.5 block pl-6 text-xs text-muted-foreground">{ajuda}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {r.cabecalho_modo === "pronto" ? (
        <CabecalhoPronto
          valor={r.cabecalho_imagem}
          onChange={(v) => mudar({ cabecalho_imagem: v })}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <EscolherLogo
            rotulo="Logo da escola (à esquerda)"
            valor={r.logo_url}
            onChange={(v) => mudar({ logo_url: v })}
          />
          <EscolherLogo
            rotulo="Segundo logo, opcional (à direita)"
            valor={r.logo_secundario}
            onChange={(v) => mudar({ logo_secundario: v })}
          />
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Prévia: como sai no topo das provas e folhas
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white p-4">
          <div className="min-w-[34rem]">
            <CabecalhoEscola escola={cabecalhoDaEscola({ id: escolaId, ...r })} />
          </div>
        </div>
      </div>

      {resultado ? (
        <p
          role={resultado.ok ? "status" : "alert"}
          className={cn(
            "flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
            resultado.ok ? "bg-leaf-soft" : "bg-coral-soft",
          )}
        >
          {resultado.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {resultado.texto}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={salvando || !mexeu}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {salvando ? "Salvando…" : mexeu ? "Salvar" : "Tudo salvo"}
      </button>
    </form>
  );
}
