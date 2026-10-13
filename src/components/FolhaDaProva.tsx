import {
  LETRAS,
  formatarValor,
  questoesDaFolha,
  type Prova,
  type QuestaoDaFolha,
  type VersaoAdaptada,
} from "@/lib/prova-schema";
import { CabecalhoEscola } from "@/components/CabecalhoEscola";
import type { CabecalhoDaEscola } from "@/lib/escola-cabecalho";

export type ModoDeImpressao = "prova" | "gabarito";

const pontos = (n: number) => `${formatarValor(n)} ${n > 0 && n <= 1 ? "ponto" : "pontos"}`;

function Linha({
  rotulo,
  valor,
  className,
}: {
  rotulo: string;
  valor: string;
  className?: string;
}) {
  return (
    <p className={`flex min-w-0 items-end gap-1.5 ${className ?? ""}`}>
      <span className="shrink-0 font-semibold">{rotulo}:</span>
      {valor ? (
        <span className="min-w-0 truncate">{valor}</span>
      ) : (
        <span className="mb-1 min-w-8 flex-1 border-b border-black/60" />
      )}
    </p>
  );
}

function Cabecalho({ prova, nome, comEscola }: { prova: Prova; nome: string; comEscola: boolean }) {
  const c = prova.cabecalho;
  return (
    <header className="rounded-md border border-black/70 px-4 py-3 text-[11pt]">
      {c.escola && !comEscola ? (
        <p className="text-center text-[13pt] font-bold uppercase">{c.escola}</p>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
        <Linha rotulo="Professor(a)" valor={c.professor} />
        <Linha rotulo="Disciplina" valor={c.disciplina} />
        <Linha rotulo="Turma" valor={c.turma} />
        <Linha rotulo="Série" valor={c.serie} />
      </div>
      {c.camposDoAluno ? (
        <div className="mt-1.5 space-y-1.5">
          <Linha rotulo="Nome" valor={nome} />
          <div className="grid grid-cols-3 gap-x-6">
            <Linha rotulo="Data" valor={c.data} />
            <Linha rotulo="Valor" valor={c.valorTotal} />
            <Linha rotulo="Nota" valor="" />
          </div>
        </div>
      ) : c.data || c.valorTotal ? (
        <div className="mt-1.5 grid grid-cols-2 gap-x-6">
          {c.data ? <Linha rotulo="Data" valor={c.data} /> : null}
          {c.valorTotal ? <Linha rotulo="Valor" valor={c.valorTotal} /> : null}
        </div>
      ) : null}
    </header>
  );
}

function QuestaoImpressa({ q, n }: { q: QuestaoDaFolha; n: number }) {
  return (
    <li className="break-inside-avoid">
      <p className="whitespace-pre-wrap">
        <strong>{n}.</strong> {q.valor !== null ? <span>({pontos(q.valor)}) </span> : null}
        {q.enunciado}
      </p>
      {q.apoio ? (
        <p className="mt-2 rounded-md border border-black/40 px-3 py-2 text-[10.5pt] whitespace-pre-wrap">
          <strong>Apoio:</strong> {q.apoio}
        </p>
      ) : null}
      {q.tipo === "objetiva" ? (
        <ol className="mt-2 space-y-1.5 pl-5">
          {q.alternativas.map((a, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold">({LETRAS[i]})</span>
              <span className="whitespace-pre-wrap">{a}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-2 space-y-0">
          {Array.from({ length: q.linhas }, (_, i) => (
            <div key={i} className="h-8 border-b border-black/40" />
          ))}
        </div>
      )}
    </li>
  );
}

export function FolhaDaProva({
  prova,
  modo,
  versao,
  nome = "",
  escola = null,
}: {
  prova: Prova;
  modo: ModoDeImpressao;
  versao?: VersaoAdaptada | undefined;
  nome?: string;
  escola?: CabecalhoDaEscola | null;
}) {
  const questoes = questoesDaFolha(prova, versao);
  const instrucoes = prova.cabecalho.instrucoes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (modo === "gabarito") {
    return (
      <div className="bg-white font-sans text-[11pt] leading-relaxed text-black">
        <h1 className="text-[15pt] font-bold">
          Gabarito: {prova.titulo}
          {versao ? ` (versão de ${nome || versao.rotulo})` : ""}
        </h1>
        <p className="mt-1 text-[10pt]">
          {[prova.cabecalho.disciplina, prova.cabecalho.serie, prova.cabecalho.turma]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {versao?.orientacoes.length ? (
          <div className="mt-4 break-inside-avoid">
            <p className="font-bold">Como aplicar esta versão</p>
            <ul className="mt-1 list-disc pl-6">
              {versao.orientacoes.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ol className="mt-5 space-y-4">
          {questoes.map((q, i) => (
            <li key={i} className="break-inside-avoid">
              <p>
                <strong>{i + 1}.</strong>{" "}
                {q.tipo === "objetiva" ? (
                  <strong>
                    ({LETRAS[q.correta]}) {q.alternativas[q.correta]}
                  </strong>
                ) : (
                  <strong>Dissertativa</strong>
                )}
                {q.valor !== null ? ` · ${pontos(q.valor)}` : ""}
              </p>
              {q.resposta ? <p className="mt-1 whitespace-pre-wrap">{q.resposta}</p> : null}
              {q.habilidade ? (
                <p className="mt-1 text-[9.5pt] italic">Avalia: {q.habilidade}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="bg-white font-sans text-[11.5pt] leading-relaxed text-black">
      {escola ? <CabecalhoEscola escola={escola} /> : null}
      <Cabecalho prova={prova} nome={nome} comEscola={Boolean(escola)} />
      <h1 className="mt-5 text-center text-[15pt] font-bold">{prova.titulo}</h1>
      {instrucoes.length ? (
        <ul className="mt-3 list-disc space-y-0.5 pl-6 text-[10.5pt]">
          {instrucoes.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : null}
      <ol className="mt-6 space-y-6">
        {questoes.map((q, i) => (
          <QuestaoImpressa key={i} q={q} n={i + 1} />
        ))}
      </ol>
    </div>
  );
}
