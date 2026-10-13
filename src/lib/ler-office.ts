const TIPO_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TIPO_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const LIMITE_DE_TEXTO = 60_000;

export type FormatoOffice = "docx" | "pptx" | "doc";

export function formatoOffice(nome: string, tipo: string): FormatoOffice | null {
  const n = nome.toLowerCase();
  if (tipo === TIPO_DOCX || n.endsWith(".docx")) return "docx";
  if (tipo === TIPO_PPTX || n.endsWith(".pptx")) return "pptx";
  if (tipo === "application/msword" || n.endsWith(".doc")) return "doc";
  return null;
}

export const ehOfficeAntigo = (nome: string) => /\.ppt$/i.test(nome);

/* Word 97-2003 (.doc): um "arquivo composto" (CFB) com o fluxo WordDocument e a tabela de pedaços
   de texto (piece table) no fluxo 0Table ou 1Table. */
const FIM_DA_CADEIA = 0xfffffffa;

function fluxosDoArquivoComposto(bytes: Uint8Array) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0xe011cfd0 || dv.getUint32(4, true) !== 0xe11ab1a1) {
    throw new Error("não é um arquivo do Word antigo");
  }
  const tamSetor = 1 << dv.getUint16(0x1e, true);
  const tamMini = 1 << dv.getUint16(0x20, true);
  const limiteMini = dv.getUint32(0x38, true);
  const porSetor = tamSetor / 4;
  const inicioDoSetor = (s: number) => (s + 1) * tamSetor;
  const u32 = (pos: number) => (pos + 4 <= bytes.length ? dv.getUint32(pos, true) : FIM_DA_CADEIA);

  const setoresDaFat: number[] = [];
  for (let i = 0; i < 109; i++) {
    const s = u32(0x4c + i * 4);
    if (s >= FIM_DA_CADEIA) break;
    setoresDaFat.push(s);
  }
  let difat = u32(0x44);
  for (let voltas = 0; difat < FIM_DA_CADEIA && voltas < 10_000; voltas++) {
    const base = inicioDoSetor(difat);
    for (let i = 0; i < porSetor - 1; i++) {
      const s = u32(base + i * 4);
      if (s < FIM_DA_CADEIA) setoresDaFat.push(s);
    }
    difat = u32(base + (porSetor - 1) * 4);
  }
  const fat: number[] = [];
  for (const s of setoresDaFat) {
    const base = inicioDoSetor(s);
    for (let i = 0; i < porSetor; i++) fat.push(u32(base + i * 4));
  }
  const cadeia = (inicio: number, tabela: number[]) => {
    const lista: number[] = [];
    for (let s = inicio; s < FIM_DA_CADEIA && lista.length < tabela.length + 1; s = tabela[s]!) {
      lista.push(s);
      if (tabela[s] === undefined) break;
    }
    return lista;
  };
  const lerCadeia = (inicio: number, tamanho: number) => {
    const saida = new Uint8Array(tamanho);
    let p = 0;
    for (const s of cadeia(inicio, fat)) {
      if (p >= tamanho) break;
      const pedaco = bytes.subarray(inicioDoSetor(s), inicioDoSetor(s) + tamSetor);
      saida.set(pedaco.subarray(0, Math.min(pedaco.length, tamanho - p)), p);
      p += tamSetor;
    }
    return saida;
  };

  const diretorio = cadeia(dv.getUint32(0x30, true), fat).flatMap((s) => {
    const base = inicioDoSetor(s);
    return Array.from({ length: tamSetor / 128 }, (_, i) => base + i * 128);
  });
  const entradas = diretorio
    .filter((pos) => pos + 128 <= bytes.length)
    .map((pos) => {
      const tamNome = dv.getUint16(pos + 64, true);
      let nome = "";
      for (let i = 0; i + 2 < tamNome && i < 64; i += 2) {
        nome += String.fromCharCode(dv.getUint16(pos + i, true));
      }
      return {
        nome,
        tipo: bytes[pos + 66],
        inicio: dv.getUint32(pos + 116, true),
        tamanho: dv.getUint32(pos + 120, true),
      };
    });
  const raiz = entradas.find((e) => e.tipo === 5);
  const miniFluxo = raiz ? lerCadeia(raiz.inicio, raiz.tamanho) : new Uint8Array();
  const miniFat: number[] = [];
  for (const s of cadeia(dv.getUint32(0x3c, true), fat)) {
    const base = inicioDoSetor(s);
    for (let i = 0; i < porSetor; i++) miniFat.push(u32(base + i * 4));
  }

  return (nome: string): Uint8Array | null => {
    const e = entradas.find((x) => x.tipo === 2 && x.nome === nome);
    if (!e) return null;
    if (e.tamanho >= limiteMini) return lerCadeia(e.inicio, e.tamanho);
    const saida = new Uint8Array(e.tamanho);
    let p = 0;
    for (const s of cadeia(e.inicio, miniFat)) {
      if (p >= e.tamanho) break;
      const pedaco = miniFluxo.subarray(s * tamMini, s * tamMini + tamMini);
      saida.set(pedaco.subarray(0, Math.min(pedaco.length, e.tamanho - p)), p);
      p += tamMini;
    }
    return saida;
  };
}

const CP1252: Record<number, string> = {
  0x80: "€",
  0x82: "‚",
  0x83: "ƒ",
  0x84: "„",
  0x85: "…",
  0x86: "†",
  0x87: "‡",
  0x88: "ˆ",
  0x89: "‰",
  0x8a: "Š",
  0x8b: "‹",
  0x8c: "Œ",
  0x8e: "Ž",
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x95: "•",
  0x96: "–",
  0x97: "—",
  0x98: "˜",
  0x99: "™",
  0x9a: "š",
  0x9b: "›",
  0x9c: "œ",
  0x9e: "ž",
  0x9f: "Ÿ",
};

function limparTextoDoWord(bruto: string) {
  let saida = "";
  const campos: boolean[] = [];
  for (const c of bruto) {
    const n = c.charCodeAt(0);
    if (n === 0x13) {
      campos.push(true);
      continue;
    }
    if (n === 0x14) {
      if (campos.length) campos[campos.length - 1] = false;
      continue;
    }
    if (n === 0x15) {
      campos.pop();
      continue;
    }
    if (campos.includes(true)) continue;
    if (n === 13 || n === 11 || n === 12) saida += "\n";
    else if (n === 7) saida += "\t";
    else if (n === 9 || n >= 32) saida += c;
  }
  return saida
    .split("\n")
    .map((l) => l.replace(/\t+$/, "").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function textoDoDoc(bytes: Uint8Array): string {
  const fluxo = fluxosDoArquivoComposto(bytes);
  const doc = fluxo("WordDocument");
  if (!doc || doc.length < 0x1aa) throw new Error("documento do Word sem conteúdo");
  const dv = new DataView(doc.buffer, doc.byteOffset, doc.byteLength);
  if (dv.getUint16(0, true) !== 0xa5ec) throw new Error("formato do Word não reconhecido");
  const tabela = fluxo(dv.getUint16(0x0a, true) & 0x0200 ? "1Table" : "0Table");
  if (!tabela) throw new Error("documento do Word sem tabela de texto");
  const caracteresDoTexto = dv.getUint32(0x4c, true);
  const fcClx = dv.getUint32(0x1a2, true);
  const lcbClx = dv.getUint32(0x1a6, true);
  const tv = new DataView(tabela.buffer, tabela.byteOffset, tabela.byteLength);

  let p = fcClx;
  const fimClx = Math.min(fcClx + lcbClx, tabela.length);
  while (p < fimClx && tabela[p] === 0x01) p += 3 + tv.getUint16(p + 1, true);
  if (tabela[p] !== 0x02) throw new Error("tabela de texto do Word inválida");
  const lcb = tv.getUint32(p + 1, true);
  const plc = p + 5;
  const pedacos = Math.floor((lcb - 4) / 12);

  let texto = "";
  for (let i = 0; i < pedacos && texto.length < caracteresDoTexto; i++) {
    const cpIni = tv.getUint32(plc + i * 4, true);
    const cpFim = tv.getUint32(plc + (i + 1) * 4, true);
    const fcBruto = tv.getUint32(plc + (pedacos + 1) * 4 + i * 8 + 2, true);
    const comprimido = (fcBruto & 0x40000000) !== 0;
    const quantos = Math.min(cpFim - cpIni, caracteresDoTexto - texto.length);
    if (comprimido) {
      const fc = (fcBruto & ~0x40000000) / 2;
      for (let k = 0; k < quantos && fc + k < doc.length; k++) {
        const b = doc[fc + k]!;
        texto += CP1252[b] ?? String.fromCharCode(b);
      }
    } else {
      for (let k = 0; k < quantos && fcBruto + k * 2 + 1 < doc.length; k++) {
        texto += String.fromCharCode(dv.getUint16(fcBruto + k * 2, true));
      }
    }
  }
  return limparTextoDoWord(texto);
}

type Entrada = { nome: string; metodo: number; tamanho: number; inicio: number };

function lerEntradas(zip: Uint8Array): Entrada[] {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let fim = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new Error("arquivo zip inválido");
  const total = dv.getUint16(fim + 10, true);
  let p = dv.getUint32(fim + 16, true);
  const decodificador = new TextDecoder();
  const entradas: Entrada[] = [];
  for (let i = 0; i < total; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("diretório zip inválido");
    const metodo = dv.getUint16(p + 10, true);
    const tamanho = dv.getUint32(p + 20, true);
    const n = dv.getUint16(p + 28, true);
    const extra = dv.getUint16(p + 30, true);
    const comentario = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nome = decodificador.decode(zip.subarray(p + 46, p + 46 + n));
    const inicio = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    entradas.push({ nome, metodo, tamanho, inicio });
    p += 46 + n + extra + comentario;
  }
  return entradas;
}

async function abrir(zip: Uint8Array, e: Entrada): Promise<string> {
  const dados = zip.slice(e.inicio, e.inicio + e.tamanho);
  if (e.metodo === 0) return new TextDecoder().decode(dados);
  if (e.metodo !== 8) throw new Error("compressão não suportada");
  const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(fluxo).text();
}

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodificarXml(texto: string) {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (bruto, c: string) => {
    if (c[0] === "#") {
      const n = c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : bruto;
    }
    return ENTIDADES[c] ?? bruto;
  });
}

function paragrafos(xml: string, prefixo: "w" | "a"): string[] {
  const fimDoParagrafo = new RegExp(`</${prefixo}:p>`);
  const pedacos = new RegExp(
    `<${prefixo}:t(?:\\s[^>]*)?>([^<]*)</${prefixo}:t>|<${prefixo}:tab\\s*/>|<${prefixo}:br\\s*/>`,
    "g",
  );
  return xml
    .split(fimDoParagrafo)
    .map((p) =>
      [...p.matchAll(pedacos)]
        .map((m) =>
          m[1] !== undefined ? decodificarXml(m[1]) : m[0].includes("tab") ? "\t" : "\n",
        )
        .join("")
        .trim(),
    )
    .filter(Boolean);
}

export async function textoDoOffice(bytes: Uint8Array, formato: FormatoOffice): Promise<string> {
  if (formato === "doc") {
    const texto = textoDoDoc(bytes);
    return texto.length > LIMITE_DE_TEXTO ? `${texto.slice(0, LIMITE_DE_TEXTO)}\n[…]` : texto;
  }
  const entradas = lerEntradas(bytes);
  let texto: string;
  if (formato === "docx") {
    const doc = entradas.find((e) => e.nome === "word/document.xml");
    if (!doc) throw new Error("documento do Word sem conteúdo");
    texto = paragrafos(await abrir(bytes, doc), "w").join("\n");
  } else {
    const slides = entradas
      .map((e) => ({ e, n: /^ppt\/slides\/slide(\d+)\.xml$/.exec(e.nome)?.[1] }))
      .filter((s): s is { e: Entrada; n: string } => s.n !== undefined)
      .sort((a, b) => Number(a.n) - Number(b.n));
    const partes: string[] = [];
    for (const s of slides) {
      const linhas = paragrafos(await abrir(bytes, s.e), "a");
      if (linhas.length) partes.push(`Slide ${s.n}:\n${linhas.join("\n")}`);
    }
    texto = partes.join("\n\n");
  }
  return texto.length > LIMITE_DE_TEXTO ? `${texto.slice(0, LIMITE_DE_TEXTO)}\n[…]` : texto;
}

export function textoParaBase64(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}
