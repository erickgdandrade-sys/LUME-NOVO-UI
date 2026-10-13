import { z } from "zod/v4";

export const CARGOS = [
  "Professor(a)",
  "Coordenador(a) pedagógico(a)",
  "Diretor(a)",
  "Gestor(a) de rede ou secretaria",
  "Profissional de AEE / apoio",
  "Outro",
] as const;

export const ESTADOS = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
] as const;

const soDigitos = (texto: string) => texto.replace(/\D/g, "");

export function mascararTelefone(texto: string) {
  const d = soDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const pedidoDemonstracao = z.object({
  nome: z.string().trim().min(3, "Escreva seu nome completo.").max(120),
  email: z.email("Confira o e-mail.").trim().max(160),
  telefone: z
    .string()
    .refine((t) => [10, 11].includes(soDigitos(t).length), "Telefone com DDD, só números."),
  escola: z.string().trim().min(2, "Qual é a escola ou instituição?").max(160),
  cargo: z.enum(CARGOS, "Escolha o seu cargo."),
  estado: z.enum(ESTADOS.map(([uf]) => uf) as [string, ...string[]], "Escolha o estado."),
  cidade: z.string().trim().min(2, "Escolha a sua cidade.").max(120),
  mensagem: z.string().trim().max(1500, "Use até 1.500 caracteres.").optional(),
  consentimento: z.literal(true, "Precisamos da sua autorização para entrar em contato."),
});

export type PedidoDemonstracao = z.infer<typeof pedidoDemonstracao>;

export async function cidadesDoEstado(uf: string): Promise<string[]> {
  const resposta = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
  );
  if (!resposta.ok) throw new Error("Não foi possível carregar as cidades.");
  const lista = (await resposta.json()) as { nome: string }[];
  return lista.map((c) => c.nome);
}
