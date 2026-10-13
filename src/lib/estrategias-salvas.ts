import { avisarMudancaDeProgresso } from "./contexto-nuvem";
import { createLocalStore } from "./local-store";

export const estrategiasSalvasStore = createLocalStore<string[]>("lume:estrategias-salvas:v1", []);

export const useEstrategiasSalvas = estrategiasSalvasStore.use;

export function alternarEstrategiaSalva(id: string) {
  const atuais = estrategiasSalvasStore.get();
  estrategiasSalvasStore.set(
    atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
  );
  avisarMudancaDeProgresso();
}
