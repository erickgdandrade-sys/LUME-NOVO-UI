import { useCallback, useEffect, useRef, useState } from "react";

export function useDados<T>(carregar: () => Promise<T>, dependencias: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const atual = useRef(0);

  const recarregar = useCallback(async () => {
    const pedido = ++atual.current;
    setCarregando(true);
    try {
      const resultado = await carregar();
      if (pedido === atual.current) {
        setDados(resultado);
        setErro("");
      }
    } catch (e) {
      console.error(e);
      if (pedido === atual.current) setErro("Não foi possível carregar os dados. Tente de novo.");
    } finally {
      if (pedido === atual.current) setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { dados, erro, carregando, recarregar };
}

export function exigir<T>(resposta: { data: T | null; error: { message: string } | null }): T {
  if (resposta.error) throw new Error(resposta.error.message);
  return resposta.data as T;
}

export function dataCurta(iso: string | null | undefined) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
