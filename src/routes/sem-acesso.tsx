import { createFileRoute } from "@tanstack/react-router";
import { School } from "lucide-react";
import { useSessao, sair } from "@/lib/sessao-store";

export const Route = createFileRoute("/sem-acesso")({
  head: () => ({ meta: [{ title: "Aguardando escola | Lume" }] }),
  component: SemAcesso,
});

function SemAcesso() {
  const sessao = useSessao();
  return (
    <div className="card-soft mx-auto mt-10 max-w-lg p-8 text-center">
      <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-soft">
        <School className="h-7 w-7" />
      </span>
      <h1 className="font-display text-2xl font-semibold">Sua conta ainda não tem escola</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A conta <strong className="text-foreground">{sessao?.email}</strong> ainda não foi ligada a
        nenhuma escola. Peça para o gestor da sua escola enviar um convite para este e-mail.
      </p>
      <button
        type="button"
        onClick={() => void sair()}
        className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold hover:bg-accent"
      >
        Sair
      </button>
    </div>
  );
}
