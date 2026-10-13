export type DadosDaEscola = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  telefone: string | null;
  email_contato: string | null;
  inep: string | null;
  linha_superior: string | null;
  logo_url: string | null;
  logo_secundario: string | null;
  cabecalho_modo: "campos" | "pronto";
  cabecalho_imagem: string | null;
};

export const COLUNAS_DA_ESCOLA =
  "id, nome, cidade, uf, endereco, telefone, email_contato, inep, linha_superior, logo_url, logo_secundario, cabecalho_modo, cabecalho_imagem";

export type CabecalhoDaEscola = {
  nome: string;
  superior: string;
  inferior: string;
  logo: string | null;
  logo2: string | null;
  imagem: string | null;
};

export function cabecalhoDaEscola(d: DadosDaEscola): CabecalhoDaEscola {
  const lugar = [d.cidade?.trim(), d.uf?.trim().toUpperCase()].filter(Boolean).join("/");
  const inferior = [
    d.endereco?.trim(),
    lugar,
    d.telefone?.trim() ? `Tel.: ${d.telefone.trim()}` : "",
    d.email_contato?.trim(),
    d.inep?.trim() ? `INEP: ${d.inep.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    nome: d.nome.trim(),
    superior: d.linha_superior?.trim() ?? "",
    inferior,
    logo: d.logo_url || null,
    logo2: d.logo_secundario || null,
    imagem: d.cabecalho_modo === "pronto" ? d.cabecalho_imagem || null : null,
  };
}

export function bytesDoDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export function dimensoesPng(bytes: Uint8Array): { largura: number; altura: number } | null {
  const assinatura = [0x89, 0x50, 0x4e, 0x47];
  if (bytes.length < 24 || assinatura.some((b, i) => bytes[i] !== b)) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { largura: dv.getUint32(16), altura: dv.getUint32(20) };
}

export function tamanhoNoPapel(
  largura: number,
  altura: number,
  alturaMaxima: number,
  larguraMaxima: number,
) {
  const escala = Math.min(alturaMaxima / altura, larguraMaxima / largura);
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) };
}
