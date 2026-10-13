import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  cabecalhoDaEscola,
  dimensoesPng,
  bytesDoDataUrl,
  tamanhoNoPapel,
  type DadosDaEscola,
} from "@/lib/escola-cabecalho";
import { textoDoOffice } from "@/lib/ler-office";
import { provaParaDocx } from "@/lib/prova-docx";
import { paraQuestao, type Prova } from "@/lib/prova-schema";

function png(largura: number, altura: number) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const bloco = (tipo: string, dados: Buffer) => {
    const t = Buffer.from(tipo);
    const tam = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    return Buffer.concat([tam, t, dados, Buffer.alloc(4)]);
  };
  const linhas = Buffer.alloc((largura * 4 + 1) * altura);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(linhas)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

const dataUrl = (b: Buffer) => `data:image/png;base64,${b.toString("base64")}`;

const escola: DadosDaEscola = {
  id: "e1",
  nome: "  Escola Municipal Paulo Freire ",
  cidade: "Campinas",
  uf: "sp",
  endereco: "Rua das Flores, 100",
  telefone: "(19) 3333-0000",
  email_contato: "",
  inep: "35012345",
  linha_superior: "Prefeitura de Campinas",
  logo_url: dataUrl(png(400, 200)),
  logo_secundario: null,
  cabecalho_modo: "campos",
  cabecalho_imagem: null,
};

describe("cabeçalho da escola", () => {
  it("monta as linhas a partir dos dados da escola", () => {
    const c = cabecalhoDaEscola(escola);
    expect(c.nome).toBe("Escola Municipal Paulo Freire");
    expect(c.superior).toBe("Prefeitura de Campinas");
    expect(c.inferior).toBe(
      "Rua das Flores, 100 · Campinas/SP · Tel.: (19) 3333-0000 · INEP: 35012345",
    );
    expect(c.logo2).toBeNull();
  });

  it("no modo pronto usa a imagem do cabeçalho oficial", () => {
    const pronto = cabecalhoDaEscola({
      ...escola,
      cabecalho_modo: "pronto",
      cabecalho_imagem: dataUrl(png(2000, 300)),
    });
    expect(pronto.imagem?.startsWith("data:image/png")).toBe(true);
    expect(
      cabecalhoDaEscola({ ...escola, cabecalho_imagem: dataUrl(png(10, 10)) }).imagem,
    ).toBeNull();
  });

  it("lê o tamanho do logo e encaixa no espaço do papel", () => {
    expect(dimensoesPng(bytesDoDataUrl(escola.logo_url!))).toEqual({ largura: 400, altura: 200 });
    expect(tamanhoNoPapel(400, 200, 100, 300)).toEqual({ largura: 200, altura: 100 });
    expect(tamanhoNoPapel(1000, 100, 100, 300)).toEqual({ largura: 300, altura: 30 });
  });

  it("a prova em Word leva o logo e o nome da escola, sem repetir o nome", async () => {
    const prova: Prova = {
      titulo: "Avaliação",
      alternativas: 4,
      origem: "",
      cabecalho: {
        escola: "Nome antigo digitado",
        professor: "Erick",
        disciplina: "Matemática",
        turma: "5º A",
        serie: "5º ano",
        data: "",
        valorTotal: "",
        instrucoes: "",
        camposDoAluno: true,
      },
      questoes: [
        paraQuestao(
          {
            tipo: "dissertativa",
            enunciado: "Explique.",
            alternativas: [],
            correta: -1,
            resposta: "",
            dificuldade: "media",
            habilidade: "",
          },
          4,
        ),
      ],
    };
    const bytes = provaParaDocx(prova, "prova", undefined, "", cabecalhoDaEscola(escola));
    expect(Buffer.from(bytes).includes("word/media/logo1.png")).toBe(true);
    const texto = await textoDoOffice(bytes, "docx");
    expect(texto).toContain("ESCOLA MUNICIPAL PAULO FREIRE");
    expect(texto).not.toContain("Nome antigo digitado");
    const semEscola = await textoDoOffice(provaParaDocx(prova, "prova"), "docx");
    expect(semEscola).toContain("NOME ANTIGO DIGITADO");
  });
});
