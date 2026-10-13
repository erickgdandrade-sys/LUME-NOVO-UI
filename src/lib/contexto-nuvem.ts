export type ContextoNuvem = { usuario: string; escola: string };

let atual: ContextoNuvem | null = null;

export const contextoNuvem = () => atual;

export function definirContextoNuvem(contexto: ContextoNuvem | null) {
  atual = contexto;
}

let aoMudarProgresso: (() => void) | null = null;

export function definirAoMudarProgresso(f: (() => void) | null) {
  aoMudarProgresso = f;
}

export function avisarMudancaDeProgresso() {
  aoMudarProgresso?.();
}
