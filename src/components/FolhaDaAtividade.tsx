import { CabecalhoEscola } from "@/components/CabecalhoEscola";
import { ItemDaAtividade } from "@/components/ItemDaAtividade";
import type { CabecalhoDaEscola } from "@/lib/escola-cabecalho";
import { LINHAS_POR_ITEM, type FolhaAtividade } from "@/lib/folha-atividade";

export function FolhaDaAtividade({
  folha: f,
  escola = null,
}: {
  folha: FolhaAtividade;
  escola?: CabecalhoDaEscola | null;
}) {
  return (
    <div className="bg-white font-sans text-[12pt] leading-relaxed text-black">
      {escola ? <CabecalhoEscola escola={escola} /> : null}
      <header className="rounded-md border border-black/70 px-4 py-3 text-[11pt]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-6">
          <p className="flex min-w-0 items-end gap-1.5">
            <span className="shrink-0 font-semibold">Nome:</span>
            {f.nome ? (
              <span className="truncate">{f.nome}</span>
            ) : (
              <span className="mb-1 flex-1 border-b border-black/60" />
            )}
          </p>
          <p className="flex items-end gap-1.5">
            <span className="font-semibold">Data:</span>
            <span className="mb-1 w-28 border-b border-black/60" />
          </p>
        </div>
        {f.info ? <p className="mt-1.5">{f.info}</p> : null}
      </header>
      <h1 className="mt-5 text-center text-[15pt] font-bold">{f.titulo}</h1>
      {f.enunciado ? <p className="mt-3 whitespace-pre-wrap">{f.enunciado}</p> : null}
      {f.apoios.length ? (
        <div className="mt-4 rounded-md border border-black/40 px-4 py-3 text-[11pt] break-inside-avoid">
          <p className="font-bold">Para ajudar</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {f.apoios.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <ol className="mt-6 space-y-6">
        {f.itens.map((item, i) => (
          <li key={i} className="break-inside-avoid">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-1.5">
              <strong>{i + 1}.</strong>
              <div className="min-w-0">
                <ItemDaAtividade item={item} folha linhas={LINHAS_POR_ITEM} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
