import type { CabecalhoDaEscola } from "@/lib/escola-cabecalho";

export function CabecalhoEscola({ escola }: { escola: CabecalhoDaEscola }) {
  if (escola.imagem) {
    return <img src={escola.imagem} alt={escola.nome} className="mb-3 block w-full" />;
  }
  const logo = (src: string | null) => (
    <div className="flex items-center justify-center">
      {src ? <img src={src} alt="" className="max-h-[1.6cm] max-w-[3.4cm] object-contain" /> : null}
    </div>
  );
  return (
    <div className="mb-3 grid grid-cols-[3.6cm_minmax(0,1fr)_3.6cm] items-center gap-3 text-black">
      {logo(escola.logo)}
      <div className="min-w-0 text-center leading-snug">
        {escola.superior ? <p className="text-[9pt]">{escola.superior}</p> : null}
        <p className="text-[12.5pt] font-bold uppercase">{escola.nome}</p>
        {escola.inferior ? <p className="text-[8.5pt]">{escola.inferior}</p> : null}
      </div>
      {logo(escola.logo2)}
    </div>
  );
}
