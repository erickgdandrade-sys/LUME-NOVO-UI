import { useRef, useState } from "react";
import { AlertTriangle, Check, FileUp, Loader2, Trash2 } from "lucide-react";

const VERSAO_PDFJS = "4.10.38";
const PDFJS = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSAO_PDFJS}/build/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSAO_PDFJS}/build/pdf.worker.min.mjs`;
const LARGURA_ALVO = 2000;
const LARGURA_MINIMA_NITIDA = 1100;
const TAMANHO_MAXIMO = 1_400_000;

type PaginaPdf = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
    promise: Promise<void>;
  };
};
type BibliotecaPdf = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: { data: Uint8Array }) => {
    promise: Promise<{ getPage: (n: number) => Promise<PaginaPdf> }>;
  };
};

let biblioteca: Promise<BibliotecaPdf> | null = null;

function carregarPdfjs() {
  biblioteca ??= (import(/* @vite-ignore */ PDFJS) as Promise<BibliotecaPdf>).then((m) => {
    m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return m;
  });
  return biblioteca;
}

function telaBranca(largura: number, altura: number) {
  const tela = document.createElement("canvas");
  tela.width = Math.max(1, Math.round(largura));
  tela.height = Math.max(1, Math.round(altura));
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tela.width, tela.height);
  return { tela, ctx };
}

async function paginaDoPdf(arquivo: File) {
  const pdfjs = await carregarPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
    .promise;
  const pagina = await doc.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: LARGURA_ALVO / base.width });
  const { tela, ctx } = telaBranca(viewport.width, viewport.height);
  await pagina.render({ canvasContext: ctx, viewport }).promise;
  return { tela, original: LARGURA_ALVO };
}

async function imagemNaTela(arquivo: File) {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LARGURA_ALVO / bitmap.width);
  const { tela, ctx } = telaBranca(bitmap.width * escala, bitmap.height * escala);
  ctx.drawImage(bitmap, 0, 0, tela.width, tela.height);
  return { tela, original: bitmap.width };
}

function recortar(fonte: HTMLCanvasElement, inicio: number, fim: number) {
  const y = Math.round((fonte.height * inicio) / 100);
  const altura = Math.max(1, Math.round((fonte.height * (fim - inicio)) / 100));
  let largura = fonte.width;
  for (;;) {
    const escala = largura / fonte.width;
    const { tela, ctx } = telaBranca(largura, altura * escala);
    ctx.drawImage(fonte, 0, y, fonte.width, altura, 0, 0, tela.width, tela.height);
    const png = tela.toDataURL("image/png");
    if (png.length <= TAMANHO_MAXIMO || largura < 800) return png;
    largura = Math.round(largura * 0.8);
  }
}

export function CabecalhoPronto({
  valor,
  onChange,
}: {
  valor: string | null;
  onChange: (v: string | null) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [fonte, setFonte] = useState<{ tela: HTMLCanvasElement; miniatura: string } | null>(null);
  const [inicio, setInicio] = useState(0);
  const [fim, setFim] = useState(18);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function abrir(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (entrada.current) entrada.current.value = "";
    if (!arquivo) return;
    setErro("");
    setAviso("");
    const ehPdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
    if (!ehPdf && !arquivo.type.startsWith("image/")) {
      setErro("Envie um PDF ou uma imagem (PNG ou JPG).");
      return;
    }
    setLendo(true);
    try {
      const { tela, original } = ehPdf ? await paginaDoPdf(arquivo) : await imagemNaTela(arquivo);
      if (original < LARGURA_MINIMA_NITIDA) {
        setAviso(
          "Essa imagem é pequena e pode sair pouco nítida no papel. Se tiver o PDF do cabeçalho, prefira ele.",
        );
      }
      setInicio(0);
      setFim(ehPdf ? 18 : 100);
      setFonte({ tela, miniatura: tela.toDataURL("image/jpeg", 0.75) });
    } catch (e) {
      console.error(e);
      setErro(
        ehPdf
          ? "Não foi possível abrir esse PDF. Confira se ele não tem senha e tente de novo."
          : "Não foi possível abrir essa imagem. Tente outra.",
      );
    } finally {
      setLendo(false);
    }
  }

  function usarRecorte() {
    if (!fonte) return;
    onChange(recortar(fonte.tela, inicio, fim));
    setFonte(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={lendo}
          onClick={() => entrada.current?.click()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50"
        >
          {lendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {valor ? "Trocar cabeçalho" : "Enviar PDF ou imagem"}
        </button>
        {valor && !fonte ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-coral-soft"
          >
            <Trash2 className="h-4 w-4" /> Tirar
          </button>
        ) : null}
        <input
          ref={entrada}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,.pdf"
          className="hidden"
          aria-label="Arquivo do cabeçalho"
          onChange={(e) => void abrir(e.target.files)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        <strong>Recomendado: PDF.</strong> Se o cabeçalho oficial estiver num Word, use “Salvar como
        PDF” e envie aqui. Também aceita foto ou escaneamento, bem reto e nítido.
      </p>
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
      {aviso ? (
        <p className="flex items-start gap-2 rounded-xl bg-sun-soft px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {aviso}
        </p>
      ) : null}

      {fonte ? (
        <div className="rounded-2xl border border-border p-3">
          <p className="text-sm font-semibold">Marque só a faixa do cabeçalho</p>
          <p className="text-xs text-muted-foreground">
            Ajuste o começo e o fim. A parte fora da faixa fica escura e não entra.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div className="relative overflow-hidden rounded-lg border border-border bg-white">
              <img src={fonte.miniatura} alt="Página enviada" className="block w-full" />
              <div
                className="absolute inset-x-0 top-0 bg-black/55"
                style={{ height: `${inicio}%` }}
              />
              <div
                className="absolute inset-x-0 bottom-0 bg-black/55"
                style={{ height: `${100 - fim}%` }}
              />
              <div
                className="absolute inset-x-0 border-y-2 border-[#1f6fe0]"
                style={{ top: `${inicio}%`, height: `${fim - inicio}%` }}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-muted-foreground">
                Começo da faixa: {inicio}%
                <input
                  type="range"
                  min={0}
                  max={95}
                  value={inicio}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setInicio(Math.min(v, fim - 2));
                  }}
                  className="mt-1 block w-full accent-[var(--primary)]"
                />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                Fim da faixa: {fim}%
                <input
                  type="range"
                  min={3}
                  max={100}
                  value={fim}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFim(Math.max(v, inicio + 2));
                  }}
                  className="mt-1 block w-full accent-[var(--primary)]"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={usarRecorte}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Check className="h-4 w-4" /> Usar esta faixa
                </button>
                <button
                  type="button"
                  onClick={() => setFonte(null)}
                  className="cursor-pointer rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
