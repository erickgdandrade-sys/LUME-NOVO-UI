import { partesDoItem } from "@/lib/texto-atividade";

export function ItemDaAtividade({
  item,
  folha = false,
  linhas = 3,
}: {
  item: string;
  folha?: boolean;
  linhas?: number;
}) {
  const { texto, partes } = partesDoItem(item);
  const espaco = (n: number) =>
    folha ? (
      <div className="mt-0.5">
        {Array.from({ length: n }, (_, k) => (
          <div key={k} className="h-8 border-b border-black/40" />
        ))}
      </div>
    ) : null;
  return (
    <>
      <span className="whitespace-pre-line">{texto}</span>
      {partes.length ? (
        <ol className={folha ? "mt-2 space-y-3 pl-5" : "mt-1.5 space-y-1 pl-1"}>
          {partes.map((p) => (
            <li key={p.letra} className={folha ? "break-inside-avoid" : "flex gap-2"}>
              {folha ? (
                <>
                  <p>
                    <strong>{p.letra})</strong> {p.texto}
                  </p>
                  {espaco(p.texto.length > 90 ? 2 : 1)}
                </>
              ) : (
                <>
                  <span className="font-semibold">{p.letra})</span>
                  <span className="min-w-0 flex-1">{p.texto}</span>
                </>
              )}
            </li>
          ))}
        </ol>
      ) : (
        espaco(linhas)
      )}
    </>
  );
}
