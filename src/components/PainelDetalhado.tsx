import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { GraficoBarras } from "@/components/GraficoBarras";
import { SecaoRecolhivel } from "@/components/SecaoRecolhivel";
import { supabase } from "@/lib/supabase";
import { dataCurta, exigir, useDados } from "@/lib/usar-dados";
import { cn } from "@/lib/utils";

type Mes = {
  mes: string;
  usos_ia: number;
  planejamentos: number;
  participacao_media: number | null;
};
type Professor = {
  usuario: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  turmas: number;
  alunos: number;
  planejamentos_mes: number;
  creditos_mes: number;
  licoes_concluidas: number;
};
type Painel = {
  meses: Mes[];
  professores: Professor[];
  turmas_sem_professor: number;
  alunos_sem_registro_mes: number;
};

const ROTULOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const rotuloDoMes = (iso: string) => ROTULOS[Number(iso.slice(5, 7)) - 1] ?? iso;
const DIAS_SEM_ACESSO = 14;

function diasDesde(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function PainelDetalhado({
  escola,
  entre,
  comoAdmin = false,
}: {
  escola: string;
  entre?: ReactNode;
  comoAdmin?: boolean;
}) {
  const { dados, erro, carregando } = useDados(async () => {
    const r = await supabase().rpc("painel_gestor", { p_escola: escola });
    return exigir(r) as Painel;
  }, [escola]);

  if (erro) return <p className="mb-6 rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p>;
  if (carregando && !dados) {
    return (
      <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando o acompanhamento…
      </p>
    );
  }
  if (!dados) return null;

  const ativos = dados.professores.filter((p) => p.ativo);
  const sumidos = ativos.filter((p) => {
    const d = diasDesde(p.ultimo_acesso);
    return p.ultimo_acesso !== null && d !== null && d > DIAS_SEM_ACESSO;
  });
  const nuncaEntraram = ativos.filter((p) => p.ultimo_acesso === null);
  const semTurma = ativos.filter((p) => p.turmas === 0);

  const atencao = [
    sumidos.length && {
      texto: `${sumidos.length} ${sumidos.length === 1 ? "professor não entra" : "professores não entram"} há mais de ${DIAS_SEM_ACESSO} dias`,
      detalhe: sumidos.map((p) => p.nome).join(", "),
      to: "/gestor/professores",
    },
    nuncaEntraram.length && {
      texto: `${nuncaEntraram.length} ${nuncaEntraram.length === 1 ? "professor ainda não aceitou" : "professores ainda não aceitaram"} o convite`,
      detalhe: nuncaEntraram.map((p) => p.nome).join(", "),
      to: "/gestor/professores",
    },
    semTurma.length && {
      texto: `${semTurma.length} ${semTurma.length === 1 ? "professor está" : "professores estão"} sem turma`,
      detalhe: semTurma.map((p) => p.nome).join(", "),
      to: "/gestor/turmas",
    },
    dados.turmas_sem_professor && {
      texto: `${dados.turmas_sem_professor} ${dados.turmas_sem_professor === 1 ? "turma está" : "turmas estão"} sem professor vinculado`,
      detalhe: "Vincule os professores para que possam cadastrar os alunos.",
      to: "/gestor/turmas",
    },
    dados.alunos_sem_registro_mes && {
      texto: `${dados.alunos_sem_registro_mes} ${dados.alunos_sem_registro_mes === 1 ? "aluno está" : "alunos estão"} sem participação registrada neste mês`,
      detalhe: "Os professores registram no perfil de cada aluno.",
      to: "/gestor/alunos",
    },
  ].filter(Boolean) as { texto: string; detalhe: string; to: string }[];

  const pontos = (campo: "usos_ia" | "planejamentos" | "participacao_media") =>
    dados.meses.map((m) => ({
      rotulo: rotuloDoMes(m.mes),
      valor: m[campo] === null ? null : Number(m[campo]),
    }));

  return (
    <div className="mb-6 space-y-4">
      <SecaoRecolhivel
        chave={comoAdmin ? "admin-escola-atencao" : "gestor-atencao"}
        titulo="Precisa da sua atenção"
        resumo={
          atencao.length
            ? `${atencao.length} ${atencao.length === 1 ? "ponto" : "pontos"} para olhar`
            : "Tudo em dia"
        }
      >
        {atencao.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-[#2f7a45] dark:text-[#9fd8ae]" /> Tudo em dia por
            aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {atencao.map((a) => (
              <li key={a.texto}>
                <Link
                  to={(comoAdmin ? "/admin/escolas" : a.to) as "/gestor"}
                  className="flex items-start gap-3 rounded-2xl bg-sun-soft px-4 py-3 hover:opacity-90"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{a.texto}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.detalhe}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SecaoRecolhivel>

      {entre}

      <SecaoRecolhivel
        chave={comoAdmin ? "admin-escola-graficos" : "gestor-graficos"}
        titulo="Últimos 6 meses"
        resumo="Uso da Lumis, planejamentos e participação dos alunos"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <GraficoBarras titulo="Uso da Lumis (créditos)" dados={pontos("usos_ia")} />
          <GraficoBarras
            titulo="Planejamentos feitos"
            dados={pontos("planejamentos")}
            cor="bg-leaf"
          />
          <GraficoBarras
            titulo="Participação média dos alunos"
            dados={pontos("participacao_media")}
            unidade="%"
            maximo={100}
            cor="bg-tangerine"
          />
        </div>
      </SecaoRecolhivel>

      <SecaoRecolhivel
        chave={comoAdmin ? "admin-escola-professores" : "gestor-professores"}
        titulo="Professores neste mês"
        resumo={`${ativos.length} ${ativos.length === 1 ? "professor ativo" : "professores ativos"}`}
        className="overflow-hidden"
        acao={
          comoAdmin ? undefined : (
            <Link to="/gestor/professores" className="text-xs font-semibold text-primary">
              Gerenciar
            </Link>
          )
        }
      >
        {dados.professores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum professor convidado ainda.</p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/60 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Professor</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Turmas</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Alunos</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Planejamentos</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Créditos de IA</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Lições da capacitação</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {dados.professores.map((p) => {
                  const dias = diasDesde(p.ultimo_acesso);
                  return (
                    <tr
                      key={p.usuario}
                      className={cn(
                        "border-b border-border last:border-0",
                        !p.ativo && "opacity-50",
                      )}
                    >
                      <td className="px-5 py-3">
                        <span className="font-semibold">{p.nome}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.ativo ? p.email : "desativado"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.turmas}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.alunos}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.planejamentos_mes}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.creditos_mes}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{p.licoes_concluidas}</td>
                      <td
                        className={cn(
                          "px-5 py-3 text-right text-xs",
                          dias !== null && dias > DIAS_SEM_ACESSO && "font-semibold",
                        )}
                      >
                        {p.ultimo_acesso
                          ? dias === 0
                            ? "hoje"
                            : dataCurta(p.ultimo_acesso)
                          : "não entrou ainda"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SecaoRecolhivel>
    </div>
  );
}
