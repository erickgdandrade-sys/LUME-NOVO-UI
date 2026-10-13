import { cn, iniciais } from "@/lib/utils";

export function FotoDoAluno({
  nome,
  foto,
  className,
}: {
  nome: string;
  foto?: string | null | undefined;
  className?: string;
}) {
  if (foto) {
    return <img src={foto} alt="" className={cn("shrink-0 object-cover", className)} />;
  }
  return (
    <span className={cn("grid shrink-0 place-items-center font-display font-semibold", className)}>
      {iniciais(nome)}
    </span>
  );
}
