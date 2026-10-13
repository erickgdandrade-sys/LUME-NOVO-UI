import { useSyncExternalStore } from "react";
import { contasReais, supabase } from "./supabase";

export type Papel = "gestor" | "professor";
type Vinculo = { escola: string; escolaNome: string; papel: Papel };

export type Visao =
  | { tipo: "admin" }
  | { tipo: Papel; escola: string; escolaNome: string }
  | { tipo: "demo" }
  | { tipo: "sem-acesso" };

type Acesso = {
  carregado: boolean;
  admin: boolean;
  vinculos: Vinculo[];
  visao: Visao | null;
};

const VAZIO: Acesso = { carregado: false, admin: false, vinculos: [], visao: null };
const CHAVE_VISAO = "lume:visao:v1";

let estado: Acesso = VAZIO;
const ouvintes = new Set<() => void>();

function definir(novo: Acesso) {
  estado = novo;
  ouvintes.forEach((o) => o());
}

export function useAcesso(): Acesso {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => estado,
    () => VAZIO,
  );
}

export function useEscolaDoGestor() {
  const { visao } = useAcesso();
  return visao?.tipo === "gestor" ? { id: visao.escola, nome: visao.escolaNome } : null;
}

function mesmaVisao(a: Visao, b: Visao) {
  if (a.tipo !== b.tipo) return false;
  if (
    (a.tipo === "gestor" || a.tipo === "professor") &&
    (b.tipo === "gestor" || b.tipo === "professor")
  )
    return a.escola === b.escola;
  return true;
}

export function visoesPossiveis(acesso: Acesso): Visao[] {
  const lista: Visao[] = acesso.admin ? [{ tipo: "admin" }] : [];
  for (const v of acesso.vinculos) {
    if (v.papel === "gestor")
      lista.push({ tipo: "gestor", escola: v.escola, escolaNome: v.escolaNome });
  }
  for (const v of acesso.vinculos) {
    if (v.papel === "professor")
      lista.push({ tipo: "professor", escola: v.escola, escolaNome: v.escolaNome });
  }
  return lista;
}

function lerVisaoSalva(): Visao | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_VISAO);
    return bruto ? (JSON.parse(bruto) as Visao) : null;
  } catch {
    return null;
  }
}

export function escolherVisao(visao: Visao) {
  try {
    window.localStorage.setItem(CHAVE_VISAO, JSON.stringify(visao));
  } catch {}
  definir({ ...estado, visao });
}

export async function carregarAcesso(usuarioId: string | null) {
  if (!contasReais) {
    definir({ carregado: true, admin: false, vinculos: [], visao: { tipo: "demo" } });
    return;
  }
  if (!usuarioId) {
    definir({ ...VAZIO, carregado: true });
    return;
  }
  const sb = supabase();
  const [admins, vinculos] = await Promise.all([
    sb.from("admins_lume").select("usuario").eq("usuario", usuarioId).maybeSingle(),
    sb
      .from("vinculos")
      .select("escola, papel, escolas(nome, ativa)")
      .eq("usuario", usuarioId)
      .eq("ativo", true),
  ]);

  type Linha = { escola: string; papel: Papel; escolas: { nome: string; ativa: boolean } | null };
  const lista: Vinculo[] = ((vinculos.data ?? []) as unknown as Linha[])
    .filter((l) => l.escolas?.ativa !== false)
    .map((l) => ({ escola: l.escola, escolaNome: l.escolas?.nome ?? "Escola", papel: l.papel }));

  const base: Acesso = {
    carregado: true,
    admin: Boolean(admins.data),
    vinculos: lista,
    visao: null,
  };
  const possiveis = visoesPossiveis(base);
  const salva = lerVisaoSalva();
  const visao = (salva && possiveis.find((p) => mesmaVisao(p, salva))) ??
    possiveis[0] ?? { tipo: "sem-acesso" };
  definir({ ...base, visao });

  void sb.from("perfis").update({ ultimo_acesso: new Date().toISOString() }).eq("id", usuarioId);
  void import("./meu-perfil").then((m) => m.carregarMeuPerfil(usuarioId));
}

export function inicioDa(visao: Visao | null): string {
  if (!visao) return "/";
  if (visao.tipo === "admin") return "/admin";
  if (visao.tipo === "gestor") return "/gestor";
  if (visao.tipo === "sem-acesso") return "/sem-acesso";
  return "/";
}

export function rotaPermitida(visao: Visao | null, rota: string): boolean {
  if (!visao) return true;
  const r = rota || "/";
  const comum = r.endsWith("/sobre") || r.endsWith("/nova-senha") || r.endsWith("/perfil");
  if (visao.tipo === "admin") return comum || r.includes("/admin");
  if (visao.tipo === "gestor") return comum || r.includes("/gestor");
  if (visao.tipo === "sem-acesso") return comum || r.endsWith("/sem-acesso");
  return !r.includes("/admin") && !r.includes("/gestor") && !r.endsWith("/sem-acesso");
}

export function nomeDaVisao(visao: Visao): string {
  if (visao.tipo === "admin") return "Admin Lume";
  if (visao.tipo === "gestor") return `Gestão · ${visao.escolaNome}`;
  if (visao.tipo === "professor") return `Professor(a) · ${visao.escolaNome}`;
  if (visao.tipo === "demo") return "Demonstração";
  return "Sem escola";
}
