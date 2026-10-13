import { contasReais, supabase } from "./supabase";
import { exigir } from "./usar-dados";

export type ProfessorNoRanking = {
  posicao: number;
  nome: string;
  escola: string;
  xp: number;
  voce: boolean;
};

export type EscolaNoRanking = {
  posicao: number;
  nome: string;
  professores: number;
  xp_total: number;
  xp_medio: number;
  sua_escola: boolean;
};

export type Ranking = {
  professores: ProfessorNoRanking[];
  escolas: EscolaNoRanking[];
  eu: { participa: boolean; posicao: number | null; total: number };
  /** Sem Supabase (modo de demonstração) não existe ranking entre escolas. */
  disponivel: boolean;
};

export async function carregarRanking(): Promise<Ranking> {
  if (!contasReais) {
    return {
      professores: [],
      escolas: [],
      eu: { participa: false, posicao: null, total: 0 },
      disponivel: false,
    };
  }
  const sb = supabase();
  const [professores, escolas] = await Promise.all([
    sb.rpc("ranking_professores"),
    sb.rpc("ranking_escolas"),
  ]);
  const p = exigir(professores) as { professores: ProfessorNoRanking[]; eu: Ranking["eu"] };
  return {
    professores: p.professores,
    escolas: exigir(escolas) as EscolaNoRanking[],
    eu: p.eu,
    disponivel: true,
  };
}

export async function definirParticipacaoNoRanking(participa: boolean) {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Sua sessão venceu. Entre de novo.");
  const { error } = await sb.from("perfis").update({ aparece_no_ranking: participa }).eq("id", id);
  if (error) throw new Error(error.message);
}
