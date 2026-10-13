import { createLocalStore } from "./local-store";

export type Perfil = {
  nome: string;
  funcao: string;
  apelido?: string;
  foto?: string | null;
  telefone?: string;
  formacao?: string;
  disciplinas?: string[];
  series?: string[];
};

export function nomeDaSaudacao(p: Perfil) {
  return p.apelido?.trim() || p.nome.trim().split(/\s+/)[0] || p.nome;
}

export const perfilStore = createLocalStore<Perfil>("lume:perfil:v1", {
  nome: "Professora",
  funcao: "Professora",
});

export const usePerfil = perfilStore.use;

export const lidasStore = createLocalStore<string[]>("lume:notificacoes-lidas:v1", [], {
  preferencia: true,
});

export const apresentacaoStore = createLocalStore<boolean>("lume:apresentacao-vista:v1", false, {
  preferencia: true,
});
