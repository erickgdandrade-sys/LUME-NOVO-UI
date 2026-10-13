const SOBRESCRITO: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  n: "ⁿ",
};

const SUBSCRITO: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
};

const SIMBOLOS: [RegExp, string][] = [
  [/\\(?:to|rightarrow|longrightarrow)\b/g, "→"],
  [/\\infty\b/g, "∞"],
  [/\\(?:leq|le)\b/g, "≤"],
  [/\\(?:geq|ge)\b/g, "≥"],
  [/\\(?:neq|ne)\b/g, "≠"],
  [/\\approx\b/g, "≈"],
  [/\\cdot\b/g, "·"],
  [/\\times\b/g, "×"],
  [/\\div\b/g, "÷"],
  [/\\pm\b/g, "±"],
  [/\\pi\b/g, "π"],
  [/\\alpha\b/g, "α"],
  [/\\beta\b/g, "β"],
  [/\\theta\b/g, "θ"],
  [/\\Delta\b/g, "Δ"],
  [/\\delta\b/g, "δ"],
  [/\\(?:epsilon|varepsilon)\b/g, "ε"],
  [/\\in\b/g, "∈"],
  [/\\(?:left|right|displaystyle)\b/g, ""],
  [/\\[,;:! ]|\\quad\b|\\qquad\b/g, " "],
];

function trocar(grupo: string, tabela: Record<string, string>, antes: string) {
  const limpo = grupo.replace(/\s+/g, "");
  if (limpo && [...limpo].every((c) => tabela[c])) return [...limpo].map((c) => tabela[c]).join("");
  return antes === "^" ? `^(${grupo.trim()})` : ` (${grupo.trim()})`;
}

const entre = (t: string) => (/^[\w.]+$/.test(t.trim()) ? t.trim() : `(${t.trim()})`);

function converter(expr: string) {
  let s = expr;
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(
        /\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g,
        (_, a: string, b: string) => `${entre(a)}/${entre(b)}`,
      )
      .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
      .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1");
  }
  for (const [padrao, simbolo] of SIMBOLOS) s = s.replace(padrao, simbolo);
  s = s
    .replace(/\\lim\b/g, "lim")
    .replace(/\^\{([^{}]*)\}/g, (_, g: string) => trocar(g, SOBRESCRITO, "^"))
    .replace(/\^([0-9+\-n])/g, (_, g: string) => SOBRESCRITO[g] ?? g)
    .replace(/_\{([^{}]*)\}/g, (_, g: string) => trocar(g, SUBSCRITO, "_"))
    .replace(/_([0-9])/g, (_, g: string) => SUBSCRITO[g] ?? g)
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/[ \t]{2,}/g, " ");
  return s.trim();
}

export function textoMatematico(texto: string): string {
  if (!texto.includes("$") && !texto.includes("\\")) return texto;
  const formula = (e: string) => /[\\^_{}]/.test(e) || /^\s*[A-Za-z]\s*$/.test(e);
  return texto
    .replace(/\$[^$]*\$/g, (trecho) =>
      trecho
        .replace(/\t/g, "\\t")
        .replace(/\f/g, "\\f")
        .replace(/\r/g, "\\r")
        .split(String.fromCharCode(8))
        .join("\\b")
        .replace(/\n(?=[a-z])/g, "\\n"),
    )
    .replace(/\$\$([^$]+)\$\$/g, (m, e: string) => (formula(e) ? converter(e) : m))
    .replace(/\$([^$\n]+)\$/g, (m, e: string) => (formula(e) ? converter(e) : m))
    .replace(/\\(?:to|infty|leq|geq|neq|cdot|times|frac|sqrt|lim)\b[^\n]*/g, (m) => converter(m));
}

export type ParteDoItem = { letra: string; texto: string };
export type ItemEstruturado = { texto: string; partes: ParteDoItem[] };

const MARCA = /(^|[\s;:,.])\(?([a-j])\)\s+/g;

export function partesDoItem(item: string): ItemEstruturado {
  const texto = textoMatematico(item);
  const marcas: { letra: string; inicio: number; fim: number }[] = [];
  for (const m of texto.matchAll(MARCA)) {
    const letra = m[2]!;
    const esperada = String.fromCharCode(97 + marcas.length);
    if (letra.toLowerCase() !== esperada) continue;
    const inicio = m.index + m[1]!.length;
    marcas.push({ letra: letra.toLowerCase(), inicio, fim: m.index + m[0].length });
  }
  if (marcas.length < 2) return { texto, partes: [] };
  const partes = marcas.map((m, i) => ({
    letra: m.letra,
    texto: texto
      .slice(m.fim, marcas[i + 1]?.inicio ?? texto.length)
      .trim()
      .replace(/[;,]$/, "")
      .trim(),
  }));
  return { texto: texto.slice(0, marcas[0]!.inicio).trim(), partes };
}
