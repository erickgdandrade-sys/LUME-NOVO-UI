import { XP_POR_NIVEL, nivel } from "./progresso-store";

export type Liga = {
  id: "bronze" | "prata" | "ouro" | "platina" | "diamante";
  nome: string;
  nivelMinimo: number;
  /** Classes do selo: fundo suave + cor do ícone. */
  tom: string;
  /** Cor sólida da barra de progresso. */
  barra: string;
};

export const LIGAS: readonly Liga[] = [
  {
    id: "bronze",
    nome: "Bronze",
    nivelMinimo: 1,
    tom: "bg-liga-bronze/15 text-liga-bronze",
    barra: "bg-liga-bronze",
  },
  {
    id: "prata",
    nome: "Prata",
    nivelMinimo: 3,
    tom: "bg-liga-prata/20 text-liga-prata",
    barra: "bg-liga-prata",
  },
  {
    id: "ouro",
    nome: "Ouro",
    nivelMinimo: 5,
    tom: "bg-liga-ouro/15 text-liga-ouro",
    barra: "bg-liga-ouro",
  },
  {
    id: "platina",
    nome: "Platina",
    nivelMinimo: 8,
    tom: "bg-liga-platina/15 text-liga-platina",
    barra: "bg-liga-platina",
  },
  {
    id: "diamante",
    nome: "Diamante",
    nivelMinimo: 12,
    tom: "bg-liga-diamante/15 text-liga-diamante",
    barra: "bg-liga-diamante",
  },
];

export function ligaDoNivel(n: number): Liga {
  return [...LIGAS].reverse().find((l) => n >= l.nivelMinimo) ?? LIGAS[0]!;
}

export function ligaDoXp(xp: number): Liga {
  return ligaDoNivel(nivel(xp));
}

export function proximaLiga(liga: Liga): Liga | null {
  return LIGAS[LIGAS.indexOf(liga) + 1] ?? null;
}

/** XP mínimo para chegar a uma liga. */
export function xpDaLiga(liga: Liga) {
  return (liga.nivelMinimo - 1) * XP_POR_NIVEL;
}

/** Quanto falta para a próxima liga e o progresso (0–100) dentro da liga atual. */
export function progressoNaLiga(xp: number) {
  const liga = ligaDoXp(xp);
  const proxima = proximaLiga(liga);
  if (!proxima) return { liga, proxima, faltam: 0, pct: 100 };
  const inicio = xpDaLiga(liga);
  const fim = xpDaLiga(proxima);
  return {
    liga,
    proxima,
    faltam: fim - xp,
    pct: Math.round(((xp - inicio) / (fim - inicio)) * 100),
  };
}

export function faixaDeNiveis(liga: Liga) {
  const proxima = proximaLiga(liga);
  return proxima
    ? `níveis ${liga.nivelMinimo}–${proxima.nivelMinimo - 1}`
    : `nível ${liga.nivelMinimo}+`;
}
