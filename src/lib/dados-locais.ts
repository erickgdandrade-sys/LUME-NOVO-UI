import { alunos as alunosExemplo, type Aluno } from "./lume-data";

const PREFIXO = "lume:";
const CHAVE_ALUNOS = "lume:alunos:v1";

type Backup = { app: "lume"; versao: 1; exportadoEm: string; dados: Record<string, unknown> };

function chavesDoLume() {
  const chaves: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const chave = window.localStorage.key(i);
    if (chave?.startsWith(PREFIXO)) chaves.push(chave);
  }
  return chaves;
}

export function baixarBackup() {
  const dados: Record<string, unknown> = {};
  for (const chave of chavesDoLume()) {
    try {
      dados[chave] = JSON.parse(window.localStorage.getItem(chave) ?? "null");
    } catch {}
  }
  const backup: Backup = { app: "lume", versao: 1, exportadoEm: new Date().toISOString(), dados };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `lume-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restaurarBackup(arquivo: File) {
  let backup: Partial<Backup>;
  try {
    backup = JSON.parse(await arquivo.text()) as Partial<Backup>;
  } catch {
    throw new Error("Esse arquivo não é um backup da Lume.");
  }
  if (backup.app !== "lume" || typeof backup.dados !== "object" || backup.dados === null) {
    throw new Error("Esse arquivo não é um backup da Lume.");
  }
  const entradas = Object.entries(backup.dados).filter(([chave]) => chave.startsWith(PREFIXO));
  for (const chave of chavesDoLume()) window.localStorage.removeItem(chave);
  for (const [chave, valor] of entradas) window.localStorage.setItem(chave, JSON.stringify(valor));
  window.location.reload();
}

export function apagarTudo() {
  for (const chave of chavesDoLume()) window.localStorage.removeItem(chave);
  window.localStorage.setItem(CHAVE_ALUNOS, "[]");
  window.location.reload();
}

export function carregarExemplos(atuais: Aluno[]) {
  const faltando = alunosExemplo.filter((e) => !atuais.some((a) => a.id === e.id));
  window.localStorage.setItem(CHAVE_ALUNOS, JSON.stringify([...atuais, ...faltando]));
  window.location.reload();
}

export function baixarMeusDados(conteudo: Record<string, unknown>) {
  const arquivo = {
    app: "lume",
    exportadoEm: new Date().toISOString(),
    ...conteudo,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(arquivo, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `lume-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
