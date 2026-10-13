import type { PlanoAdaptado } from "./plano-schema";
import { documentoDocx, type Paragrafo } from "./prova-docx";
import type { CabecalhoDaEscola } from "./escola-cabecalho";
import { partesDoItem } from "./texto-atividade";

export type FolhaAtividade = {
  chave: string;
  rotulo: string;
  titulo: string;
  enunciado: string;
  itens: string[];
  apoios: string[];
  nome: string;
  info: string;
};

export const LINHAS_POR_ITEM = 3;

export function folhasDoPlano(
  plano: PlanoAdaptado,
  nomes: Record<string, string>,
): FolhaAtividade[] {
  const a = plano.atividade;
  const info = [plano.disciplina, plano.serie === "Não informado" ? "" : plano.serie]
    .filter(Boolean)
    .join(" · ");
  const base = { titulo: a.titulo || plano.titulo, enunciado: a.enunciado, nome: "", info };
  const folhas: FolhaAtividade[] = [];
  if (a.itens.length) {
    folhas.push({ ...base, chave: "turma", rotulo: "Folha da turma", itens: a.itens, apoios: [] });
  }
  if (a.versaoAdaptada.length) {
    folhas.push({
      ...base,
      chave: "apoio",
      rotulo: "Folha com mais apoio",
      itens: a.versaoAdaptada,
      apoios: a.apoios,
    });
  }
  plano.adaptacoes.forEach((ad, i) => {
    if (!ad.atividade.length) return;
    const nome = ad.aluno ? (nomes[ad.aluno] ?? "") : "";
    folhas.push({
      ...base,
      chave: `aluno-${i}`,
      rotulo: nome ? `Folha de ${nome.split(" ")[0]}` : `Folha para: ${ad.perfil}`,
      itens: ad.atividade,
      apoios: [],
      nome,
    });
  });
  return folhas;
}

export function folhaParaDocx(
  f: FolhaAtividade,
  escola: CabecalhoDaEscola | null = null,
): Uint8Array {
  const p: Paragrafo[] = [
    {
      trechos: [{ texto: `Nome: ${f.nome || "_".repeat(50)}     Data: ____/____/______` }],
      caixa: true,
      depois: 0,
    },
  ];
  if (f.info) p.push({ trechos: [{ texto: f.info }], caixa: true, depois: 0 });
  p.push({ trechos: [{ texto: f.titulo, negrito: true, tamanho: 14 }], centro: true, antes: 14 });
  if (f.enunciado) p.push({ trechos: [{ texto: f.enunciado }], antes: 6, depois: 8 });
  if (f.apoios.length) {
    p.push({
      trechos: [{ texto: "Para ajudar", negrito: true }],
      sombreado: true,
      antes: 4,
      depois: 0,
      manterComProximo: true,
    });
    f.apoios.forEach((a) => p.push({ trechos: [{ texto: `• ${a}` }], sombreado: true, depois: 0 }));
  }
  const linhas = (n: number, recuo = 0) => {
    for (let k = 0; k < n; k++) {
      p.push({ trechos: [{ texto: " " }], linhaEmbaixo: true, antes: 6, depois: 0, recuo });
    }
  };
  f.itens.forEach((item, i) => {
    const { texto, partes } = partesDoItem(item);
    p.push({
      trechos: [{ texto: `${i + 1}. `, negrito: true }, { texto }],
      antes: 14,
      depois: 4,
      manterComProximo: true,
    });
    if (!partes.length) {
      linhas(LINHAS_POR_ITEM);
      return;
    }
    for (const parte of partes) {
      p.push({
        trechos: [{ texto: `${parte.letra}) `, negrito: true }, { texto: parte.texto }],
        recuo: 18,
        antes: 8,
        depois: 0,
        manterComProximo: true,
      });
      linhas(parte.texto.length > 90 ? 2 : 1, 18);
    }
  });
  return documentoDocx(p, escola);
}
