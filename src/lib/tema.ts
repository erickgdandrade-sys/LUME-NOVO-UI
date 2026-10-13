import { createLocalStore } from "./local-store";

export type Tema = "claro" | "escuro" | "sistema";

const CHAVE = "lume:tema:v1";

const temaStore = createLocalStore<Tema>(CHAVE, "sistema", { preferencia: true });
export const useTema = temaStore.use;

const consultaEscuro = "(prefers-color-scheme: dark)";

function deveEscurecer(tema: Tema) {
  return tema === "escuro" || (tema === "sistema" && window.matchMedia(consultaEscuro).matches);
}

function aplicarTema(tema: Tema = temaStore.get()) {
  document.documentElement.classList.toggle("dark", deveEscurecer(tema));
}

export function escolherTema(tema: Tema) {
  temaStore.set(tema);
  aplicarTema(tema);
}

export function iniciarTema() {
  const midia = window.matchMedia(consultaEscuro);
  const aoMudarSistema = () => aplicarTema();
  const antesDeImprimir = () => document.documentElement.classList.remove("dark");
  const depoisDeImprimir = () => aplicarTema();

  midia.addEventListener("change", aoMudarSistema);
  window.addEventListener("beforeprint", antesDeImprimir);
  window.addEventListener("afterprint", depoisDeImprimir);
  return () => {
    midia.removeEventListener("change", aoMudarSistema);
    window.removeEventListener("beforeprint", antesDeImprimir);
    window.removeEventListener("afterprint", depoisDeImprimir);
  };
}

export const scriptTemaInicial = `try{var t=JSON.parse(localStorage.getItem("${CHAVE}")||'"sistema"');if(t==="escuro"||(t!=="claro"&&matchMedia("${consultaEscuro}").matches))document.documentElement.classList.add("dark")}catch(e){}`;
