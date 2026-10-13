import {
  LETRAS,
  formatarValor,
  questoesDaFolha,
  type Prova,
  type VersaoAdaptada,
} from "./prova-schema";
import {
  bytesDoDataUrl,
  dimensoesPng,
  tamanhoNoPapel,
  type CabecalhoDaEscola,
} from "./escola-cabecalho";

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(dados: Uint8Array) {
  let c = 0xffffffff;
  for (const b of dados) c = TABELA_CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function montarZip(arquivos: { nome: string; conteudo: string | Uint8Array }[]): Uint8Array {
  const codificador = new TextEncoder();
  const partes: Uint8Array[] = [];
  const diretorio: Uint8Array[] = [];
  let posicao = 0;
  for (const a of arquivos) {
    const nome = codificador.encode(a.nome);
    const dados = typeof a.conteudo === "string" ? codificador.encode(a.conteudo) : a.conteudo;
    const crc = crc32(dados);
    const local = new Uint8Array(30);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dados.length, true);
    lv.setUint32(22, dados.length, true);
    lv.setUint16(26, nome.length, true);
    const central = new Uint8Array(46);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dados.length, true);
    cv.setUint32(24, dados.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, posicao, true);
    partes.push(local, nome, dados);
    diretorio.push(central, nome);
    posicao += 30 + nome.length + dados.length;
  }
  const tamanhoDiretorio = diretorio.reduce((s, p) => s + p.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, arquivos.length, true);
  fv.setUint16(10, arquivos.length, true);
  fv.setUint32(12, tamanhoDiretorio, true);
  fv.setUint32(16, posicao, true);
  const tudo = [...partes, ...diretorio, fim];
  const saida = new Uint8Array(tudo.reduce((s, p) => s + p.length, 0));
  let p = 0;
  for (const parte of tudo) {
    saida.set(parte, p);
    p += parte.length;
  }
  return saida;
}

const semControle = (t: string) =>
  [...t]
    .filter((c) => {
      const n = c.charCodeAt(0);
      return n >= 32 || n === 9 || n === 10 || n === 13;
    })
    .join("");

const escapar = (t: string) =>
  semControle(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type Trecho = { texto: string; negrito?: boolean; italico?: boolean; tamanho?: number };
export type Paragrafo = {
  trechos: Trecho[];
  centro?: boolean;
  recuo?: number;
  antes?: number;
  depois?: number;
  linhaEmbaixo?: boolean;
  caixa?: boolean;
  sombreado?: boolean;
  manterComProximo?: boolean;
};

function run(t: Trecho) {
  const props = [
    t.negrito ? "<w:b/>" : "",
    t.italico ? "<w:i/>" : "",
    t.tamanho ? `<w:sz w:val="${t.tamanho * 2}"/><w:szCs w:val="${t.tamanho * 2}"/>` : "",
  ].join("");
  const linhas = t.texto.split("\n");
  const corpo = linhas
    .map((l, i) => `${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${escapar(l)}</w:t>`)
    .join("");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}${corpo}</w:r>`;
}

function paragrafo(p: Paragrafo) {
  const borda = p.caixa
    ? '<w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="000000"/><w:left w:val="single" w:sz="6" w:space="4" w:color="000000"/><w:bottom w:val="single" w:sz="6" w:space="4" w:color="000000"/><w:right w:val="single" w:sz="6" w:space="4" w:color="000000"/></w:pBdr>'
    : p.linhaEmbaixo
      ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="808080"/><w:between w:val="single" w:sz="4" w:space="1" w:color="808080"/></w:pBdr>'
      : "";
  const props = [
    p.manterComProximo ? "<w:keepNext/>" : "",
    borda,
    p.sombreado ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : "",
    `<w:spacing w:before="${(p.antes ?? 0) * 20}" w:after="${(p.depois ?? 4) * 20}"/>`,
    p.recuo ? `<w:ind w:left="${p.recuo * 20}"/>` : "",
    p.centro ? '<w:jc w:val="center"/>' : "",
  ].join("");
  return `<w:p><w:pPr>${props}</w:pPr>${p.trechos.map(run).join("")}</w:p>`;
}

const pontos = (n: number) => `${formatarValor(n)} ${n > 0 && n <= 1 ? "ponto" : "pontos"}`;

function documento(paragrafos: Paragrafo[], inicio = "") {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${inicio}${paragrafos.map(paragrafo).join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="23"/><w:szCs w:val="23"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;

const TIPOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;

const RELACOES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const RELACOES_DOC = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

function cabecalho(prova: Prova, nomeDoAluno: string, comEscola: boolean): Paragrafo[] {
  const c = prova.cabecalho;
  const campo = (rotulo: string, valor: string, largura = 22) =>
    `${rotulo}: ${valor || "_".repeat(largura)}`;
  const linhas: Paragrafo[] = [];
  if (c.escola && !comEscola) {
    linhas.push({
      trechos: [{ texto: c.escola.toUpperCase(), negrito: true, tamanho: 13 }],
      centro: true,
    });
  }
  linhas.push({
    trechos: [
      { texto: `${campo("Professor(a)", c.professor)}     ${campo("Disciplina", c.disciplina)}` },
    ],
  });
  linhas.push({
    trechos: [{ texto: `${campo("Turma", c.turma, 12)}     ${campo("Série", c.serie, 12)}` }],
  });
  if (c.camposDoAluno) {
    linhas.push({ trechos: [{ texto: campo("Nome", nomeDoAluno, 60) }] });
    linhas.push({
      trechos: [
        {
          texto: `${campo("Data", c.data, 14)}     ${campo("Valor", c.valorTotal, 8)}     ${campo("Nota", "", 8)}`,
        },
      ],
    });
  }
  return linhas.map((l) => ({ ...l, caixa: true, depois: 0 }));
}

export type ModoDoWord = "prova" | "gabarito";

export function provaParaDocx(
  prova: Prova,
  modo: ModoDoWord,
  versao?: VersaoAdaptada,
  nomeDoAluno = "",
  escola: CabecalhoDaEscola | null = null,
): Uint8Array {
  const questoes = questoesDaFolha(prova, versao);
  const p: Paragrafo[] = [];

  if (modo === "gabarito") {
    p.push({
      trechos: [
        {
          texto: `Gabarito: ${prova.titulo}${versao ? ` (versão de ${nomeDoAluno || versao.rotulo})` : ""}`,
          negrito: true,
          tamanho: 14,
        },
      ],
      depois: 4,
    });
    const info = [prova.cabecalho.disciplina, prova.cabecalho.serie, prova.cabecalho.turma]
      .filter(Boolean)
      .join(" · ");
    if (info) p.push({ trechos: [{ texto: info, tamanho: 10 }], depois: 10 });
    if (versao?.orientacoes.length) {
      p.push({ trechos: [{ texto: "Como aplicar esta versão", negrito: true }], antes: 6 });
      for (const o of versao.orientacoes) p.push({ trechos: [{ texto: `• ${o}` }], recuo: 10 });
    }
    questoes.forEach((q, i) => {
      p.push({
        trechos: [
          { texto: `${i + 1}. `, negrito: true },
          {
            texto:
              q.tipo === "objetiva"
                ? `(${LETRAS[q.correta]}) ${q.alternativas[q.correta] ?? ""}`
                : "Dissertativa",
            negrito: true,
          },
          { texto: q.valor !== null ? ` · ${pontos(q.valor)}` : "" },
        ],
        antes: 8,
        manterComProximo: true,
      });
      if (q.resposta) p.push({ trechos: [{ texto: q.resposta }] });
      if (q.habilidade) {
        p.push({ trechos: [{ texto: `Avalia: ${q.habilidade}`, italico: true, tamanho: 10 }] });
      }
    });
  } else {
    p.push(...cabecalho(prova, nomeDoAluno, Boolean(escola)));
    p.push({
      trechos: [{ texto: prova.titulo, negrito: true, tamanho: 14 }],
      centro: true,
      antes: 14,
      depois: 8,
    });
    for (const l of prova.cabecalho.instrucoes
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)) {
      p.push({ trechos: [{ texto: `• ${l}`, tamanho: 10.5 }], recuo: 10, depois: 2 });
    }
    questoes.forEach((q, i) => {
      p.push({
        trechos: [
          { texto: `${i + 1}. `, negrito: true },
          { texto: q.valor !== null ? `(${pontos(q.valor)}) ` : "" },
          { texto: q.enunciado },
        ],
        antes: 14,
        depois: 6,
        manterComProximo: true,
      });
      if (q.apoio) {
        p.push({
          trechos: [{ texto: "Apoio: ", negrito: true }, { texto: q.apoio }],
          sombreado: true,
          recuo: 10,
          depois: 6,
          manterComProximo: true,
        });
      }
      if (q.tipo === "objetiva") {
        q.alternativas.forEach((a, j) =>
          p.push({
            trechos: [{ texto: `(${LETRAS[j]}) `, negrito: true }, { texto: a }],
            recuo: 18,
            depois: 3,
            manterComProximo: j < q.alternativas.length - 1,
          }),
        );
      } else {
        for (let k = 0; k < q.linhas; k++) {
          p.push({ trechos: [{ texto: " " }], linhaEmbaixo: true, antes: 6, depois: 0 });
        }
      }
    });
  }

  return documentoDocx(p, modo === "prova" ? escola : null);
}

const EMU_POR_CM = 360000;

type Imagem = { rid: string; arquivo: string; bytes: Uint8Array };

function imagemXml(img: Imagem, numero: number, cx: number, cy: number) {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${numero}" name="Logo ${numero}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${numero}" name="${img.arquivo}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${img.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function celula(conteudo: string, largura: number) {
  return `<w:tc><w:tcPr><w:tcW w:w="${largura}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${conteudo || "<w:p/>"}</w:tc>`;
}

function blocoDaEscola(e: CabecalhoDaEscola): { xml: string; imagens: Imagem[] } {
  const imagens: Imagem[] = [];
  if (e.imagem) {
    const bytes = bytesDoDataUrl(e.imagem);
    const dim = dimensoesPng(bytes);
    if (dim) {
      const img: Imagem = { rid: "rIdLogo1", arquivo: "cabecalho.png", bytes };
      const t = tamanhoNoPapel(dim.largura, dim.altura, 6 * EMU_POR_CM, 17 * EMU_POR_CM);
      return {
        xml: `${imagemXml(img, 1, t.largura, t.altura)}${paragrafo({ trechos: [], depois: 4 })}`,
        imagens: [img],
      };
    }
  }
  const logo = (dataUrl: string | null) => {
    if (!dataUrl) return "";
    const bytes = bytesDoDataUrl(dataUrl);
    const dim = dimensoesPng(bytes);
    if (!dim) return "";
    const img: Imagem = {
      rid: `rIdLogo${imagens.length + 1}`,
      arquivo: `logo${imagens.length + 1}.png`,
      bytes,
    };
    imagens.push(img);
    const t = tamanhoNoPapel(dim.largura, dim.altura, 1.6 * EMU_POR_CM, 3.4 * EMU_POR_CM);
    return imagemXml(img, imagens.length, t.largura, t.altura);
  };
  const esquerda = logo(e.logo);
  const direita = logo(e.logo2);
  const textos = [
    e.superior
      ? paragrafo({ trechos: [{ texto: e.superior, tamanho: 9 }], centro: true, depois: 0 })
      : "",
    paragrafo({
      trechos: [{ texto: e.nome.toUpperCase(), negrito: true, tamanho: 12.5 }],
      centro: true,
      depois: 0,
    }),
    e.inferior
      ? paragrafo({ trechos: [{ texto: e.inferior, tamanho: 8.5 }], centro: true, depois: 0 })
      : "",
  ].join("");
  const semBorda =
    '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
  const xml = `<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:jc w:val="center"/>${semBorda}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="2100"/><w:gridCol w:w="5438"/><w:gridCol w:w="2100"/></w:tblGrid><w:tr>${celula(esquerda, 2100)}${celula(textos, 5438)}${celula(direita, 2100)}</w:tr></w:tbl>${paragrafo({ trechos: [], depois: 4 })}`;
  return { xml, imagens };
}

export function documentoDocx(p: Paragrafo[], escola?: CabecalhoDaEscola | null): Uint8Array {
  const bloco = escola ? blocoDaEscola(escola) : { xml: "", imagens: [] };
  const relacoes = RELACOES_DOC.replace(
    "</Relationships>",
    `${bloco.imagens
      .map(
        (i) =>
          `<Relationship Id="${i.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${i.arquivo}"/>`,
      )
      .join("")}</Relationships>`,
  );
  return montarZip([
    { nome: "[Content_Types].xml", conteudo: TIPOS },
    { nome: "_rels/.rels", conteudo: RELACOES },
    { nome: "word/_rels/document.xml.rels", conteudo: relacoes },
    { nome: "word/document.xml", conteudo: documento(p, bloco.xml) },
    { nome: "word/styles.xml", conteudo: ESTILOS },
    ...bloco.imagens.map((i) => ({ nome: `word/media/${i.arquivo}`, conteudo: i.bytes })),
  ]);
}

export function baixarArquivo(bytes: Uint8Array, nome: string) {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
