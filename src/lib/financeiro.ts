export type Cobranca = {
  id: string;
  escola: string;
  competencia: string;
  vencimento: string;
  valor: number;
  creditos_extra: number;
  valor_extra: number;
  situacao: "pendente" | "paga" | "cancelada";
  pago_em: string | null;
  forma: string | null;
  observacao: string | null;
};

export type Contrato = {
  escola: string;
  valor_mensal: number;
  dia_vencimento: number;
  valor_credito_extra: number;
  inicio: string;
  ativo: boolean;
  observacao: string | null;
};

export type SituacaoNaTela = "paga" | "cancelada" | "atrasada" | "vence-logo" | "pendente";

export const ROTULO_DA_SITUACAO: Record<SituacaoNaTela, string> = {
  paga: "Paga",
  cancelada: "Cancelada",
  atrasada: "Em atraso",
  "vence-logo": "Vence em breve",
  pendente: "A vencer",
};

export const TOM_DA_SITUACAO: Record<SituacaoNaTela, string> = {
  paga: "bg-leaf-soft",
  cancelada: "bg-secondary",
  atrasada: "bg-coral-soft",
  "vence-logo": "bg-sun-soft",
  pendente: "bg-sky-soft",
};

export const DIAS_DE_AVISO = 7;

export const FORMAS = ["Pix", "Boleto", "Transferência", "Cartão", "Outro"];

export function reais(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function hojeISO(agora = new Date()) {
  return new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    .toISOString()
    .slice(0, 10);
}

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export function totalDa(c: Pick<Cobranca, "valor" | "valor_extra">) {
  return Math.round((Number(c.valor) + Number(c.valor_extra)) * 100) / 100;
}

export function situacaoNaTela(
  c: Pick<Cobranca, "situacao" | "vencimento">,
  hoje: string,
): SituacaoNaTela {
  if (c.situacao !== "pendente") return c.situacao;
  const faltam = diasEntre(hoje, c.vencimento);
  if (faltam < 0) return "atrasada";
  if (faltam <= DIAS_DE_AVISO) return "vence-logo";
  return "pendente";
}

export function resumoFinanceiro(cobrancas: Cobranca[], hoje: string) {
  const validas = cobrancas.filter((c) => c.situacao !== "cancelada");
  const soma = (lista: Cobranca[]) =>
    Math.round(lista.reduce((s, c) => s + totalDa(c), 0) * 100) / 100;
  const pagas = validas.filter((c) => c.situacao === "paga");
  const pendentes = validas.filter((c) => c.situacao === "pendente");
  const atrasadas = pendentes.filter((c) => situacaoNaTela(c, hoje) === "atrasada");
  const venceLogo = pendentes.filter((c) => situacaoNaTela(c, hoje) === "vence-logo");
  return {
    previsto: soma(validas),
    recebido: soma(pagas),
    aReceber: soma(pendentes),
    emAtraso: soma(atrasadas),
    atrasadas,
    venceLogo,
  };
}

export function primeiroDoMes(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function mudarMes(competencia: string, passo: number) {
  const [a, m] = competencia.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 1 + passo, 1));
  return d.toISOString().slice(0, 10);
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function nomeDoMes(competencia: string) {
  const [a, m] = competencia.split("-").map(Number) as [number, number];
  return `${MESES[m - 1]} de ${a}`;
}

export const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
