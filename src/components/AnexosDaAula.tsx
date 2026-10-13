import { useRef, useState } from "react";
import { FileImage, FileText, Loader2, Paperclip, X } from "lucide-react";
import { ehOfficeAntigo, formatoOffice, textoDoOffice, textoParaBase64 } from "@/lib/ler-office";
import { TIPOS_DE_ANEXO, type Anexo } from "@/lib/plano-schema";

const MAX_ARQUIVOS = 3;
const MAX_TOTAL = 4 * 1024 * 1024;
const LADO_MAXIMO = 1600;

const tamanho = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const tamanhoDoBase64 = (b64: string) => Math.floor((b64.length * 3) / 4);

function lerComoBase64(arquivo: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result).split(",")[1] ?? "");
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

async function reduzirImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  if (escala === 1 && arquivo.size < 800 * 1024) return arquivo;
  const tela = document.createElement("canvas");
  tela.width = Math.round(bitmap.width * escala);
  tela.height = Math.round(bitmap.height * escala);
  tela.getContext("2d")!.drawImage(bitmap, 0, 0, tela.width, tela.height);
  return new Promise((resolver) => tela.toBlob((b) => resolver(b ?? arquivo), "image/jpeg", 0.85));
}

export function AnexosDaAula({
  anexos,
  onChange,
  desativado,
  ajuda = "A Lumis lê o plano, uma atividade, uma prova ou uma foto do caderno e adapta. Não envie arquivos com nomes ou dados de alunos.",
}: {
  anexos: Anexo[];
  onChange: (anexos: Anexo[]) => void;
  desativado?: boolean;
  ajuda?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const total = anexos.reduce((s, a) => s + tamanhoDoBase64(a.dados), 0);

  async function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    setErro("");
    setLendo(true);
    const novos: Anexo[] = [];
    let soma = total;
    try {
      for (const arquivo of Array.from(lista)) {
        if (anexos.length + novos.length >= MAX_ARQUIVOS) {
          setErro(`Dá para anexar até ${MAX_ARQUIVOS} arquivos por vez.`);
          break;
        }
        const office = formatoOffice(arquivo.name, arquivo.type);
        if (office) {
          let texto = "";
          try {
            texto = await textoDoOffice(new Uint8Array(await arquivo.arrayBuffer()), office);
          } catch (e) {
            console.error(e);
          }
          if (!texto.trim()) {
            setErro(`Não foi possível ler o texto de "${arquivo.name}". Tente salvar como PDF.`);
            continue;
          }
          const dados = textoParaBase64(texto);
          const bytes = tamanhoDoBase64(dados);
          if (soma + bytes > MAX_TOTAL) {
            setErro(`"${arquivo.name}" é grande demais. O total dos anexos pode ter até 4 MB.`);
            continue;
          }
          soma += bytes;
          novos.push({ nome: arquivo.name.slice(0, 200), tipo: "text/plain", dados });
          continue;
        }
        const tipo = arquivo.type as (typeof TIPOS_DE_ANEXO)[number];
        if (!TIPOS_DE_ANEXO.includes(tipo)) {
          setErro(
            ehOfficeAntigo(arquivo.name)
              ? `"${arquivo.name}" está no formato antigo do PowerPoint. Salve como .pptx ou PDF.`
              : `"${arquivo.name}" não é aceito. Envie PDF, Word, PowerPoint, foto (JPG, PNG) ou texto.`,
          );
          continue;
        }
        const ehImagem = tipo.startsWith("image/");
        const conteudo = ehImagem ? await reduzirImagem(arquivo) : arquivo;
        const dados = await lerComoBase64(conteudo);
        const bytes = tamanhoDoBase64(dados);
        if (soma + bytes > MAX_TOTAL) {
          setErro(`"${arquivo.name}" é grande demais. O total dos anexos pode ter até 4 MB.`);
          continue;
        }
        soma += bytes;
        novos.push({
          nome: arquivo.name.slice(0, 200),
          tipo: ehImagem && conteudo !== arquivo ? "image/jpeg" : tipo,
          dados,
        });
      }
      if (novos.length) onChange([...anexos, ...novos]);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível ler esse arquivo. Tente outro.");
    } finally {
      setLendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={desativado || lendo || anexos.length >= MAX_ARQUIVOS}
          onClick={() => entrada.current?.click()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {lendo ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          Anexar arquivo
        </button>
        {anexos.map((a, i) => (
          <span
            key={`${a.nome}-${i}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
          >
            {a.tipo.startsWith("image/") ? (
              <FileImage className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{a.nome}</span>
            <span className="shrink-0 text-muted-foreground">
              {tamanho(tamanhoDoBase64(a.dados))}
            </span>
            <button
              type="button"
              disabled={desativado}
              onClick={() => onChange(anexos.filter((_, j) => j !== i))}
              aria-label={`Tirar ${a.nome}`}
              className="cursor-pointer rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        ref={entrada}
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg,image/webp,text/plain,.pdf,.txt,.doc,.docx,.pptx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        aria-label="Arquivos da aula"
        onChange={(e) => void adicionar(e.target.files)}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">PDF, Word, PowerPoint ou foto. {ajuda}</p>
      {erro ? <p className="mt-1.5 text-xs font-medium text-destructive">{erro}</p> : null}
    </div>
  );
}
