import { useSyncExternalStore } from "react";

let somenteMemoria = false;
const aoTrocarModo = new Set<() => void>();

export function usarSomenteMemoria(ativo: boolean) {
  if (somenteMemoria === ativo) return;
  somenteMemoria = ativo;
  aoTrocarModo.forEach((f) => f());
}

export const estaSomenteNaMemoria = () => somenteMemoria;

export function createLocalStore<T>(
  chave: string,
  padrao: T,
  { preferencia = false }: { preferencia?: boolean } = {},
) {
  let cache: { valor: T } | null = null;
  const soMemoria = () => somenteMemoria && !preferencia;
  const ouvintes = new Set<() => void>();

  aoTrocarModo.add(() => {
    if (preferencia) return;
    cache = null;
    ouvintes.forEach((o) => o());
  });

  function get(): T {
    if (cache) return cache.valor;
    if (soMemoria()) {
      cache = { valor: padrao };
      return cache.valor;
    }
    try {
      const bruto = window.localStorage.getItem(chave);
      cache = { valor: bruto === null ? padrao : (JSON.parse(bruto) as T) };
    } catch {
      cache = { valor: padrao };
    }
    return cache.valor;
  }

  function set(valor: T) {
    cache = { valor };
    if (!soMemoria()) {
      try {
        window.localStorage.setItem(chave, JSON.stringify(valor));
      } catch {}
    }
    ouvintes.forEach((o) => o());
  }

  function subscribe(ouvinte: () => void) {
    ouvintes.add(ouvinte);
    const aoMudar = (e: StorageEvent) => {
      if (e.key === chave && !soMemoria()) {
        cache = null;
        ouvinte();
      }
    };
    window.addEventListener("storage", aoMudar);
    return () => {
      ouvintes.delete(ouvinte);
      window.removeEventListener("storage", aoMudar);
    };
  }

  function use(): T {
    return useSyncExternalStore(subscribe, get, () => padrao);
  }

  return { get, set, use };
}

export function lerDoNavegador<T>(chave: string): T | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto === null ? null : (JSON.parse(bruto) as T);
  } catch {
    return null;
  }
}
