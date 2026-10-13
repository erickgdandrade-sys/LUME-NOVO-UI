import { useState, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { adicionarAoQueFunciona, necessidadesDe, useAlunos } from "@/lib/alunos-store";
import type { Estrategia } from "@/lib/biblioteca-estrategias";
import { FotoDoAluno } from "@/components/FotoDoAluno";
import { cn } from "@/lib/utils";

export function UsarComAluno({
  estrategia,
  trigger,
}: {
  estrategia: Estrategia;
  trigger: ReactNode;
}) {
  const alunos = useAlunos();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [feitos, setFeitos] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const texto = `${estrategia.titulo}: ${estrategia.resumo}`;

  const combina = (necessidades: string[]) =>
    estrategia.necessidades.some((n) => necessidades.includes(n));
  const ordenados = [...alunos].sort(
    (a, b) => Number(combina(necessidadesDe(b))) - Number(combina(necessidadesDe(a))),
  );

  async function usar(id: string) {
    setSalvando(id);
    setErro("");
    try {
      await adicionarAoQueFunciona(id, texto);
      setFeitos((f) => [...f, id]);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível salvar no perfil. Confira sua conexão e tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) {
          setFeitos([]);
          setErro("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold">
            Usar com um aluno
          </DialogTitle>
          <DialogDescription>
            A estratégia entra em “O que funciona” no perfil do aluno, e a Lumis passa a usá-la nos
            planos de aula.
          </DialogDescription>
        </DialogHeader>
        {alunos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Você ainda não tem alunos cadastrados.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordenados.map((a) => {
              const ja = a.funcionam.includes(texto) || feitos.includes(a.id);
              const indicado = combina(necessidadesDe(a));
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={ja || salvando !== null}
                    onClick={() => void usar(a.id)}
                    className={cn(
                      "grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left hover:bg-accent disabled:cursor-default",
                      ja && "bg-leaf-soft hover:bg-leaf-soft",
                    )}
                  >
                    <FotoDoAluno
                      nome={a.nome}
                      foto={a.foto}
                      className="h-9 w-9 rounded-xl bg-sky-soft text-xs"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{a.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {indicado ? "Indicada para as necessidades dele" : a.serie}
                      </span>
                    </span>
                    {salvando === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : ja ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        <Check className="h-3.5 w-3.5" /> No perfil
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-primary">Adicionar</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
