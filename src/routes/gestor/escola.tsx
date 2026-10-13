import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { EditorDaEscola } from "@/components/EditorDaEscola";
import { useEscolaDoGestor } from "@/lib/acesso";

export const Route = createFileRoute("/gestor/escola")({
  head: () => ({ meta: [{ title: "Escola | Lume" }] }),
  component: DadosDaEscolaDoGestor,
});

function DadosDaEscolaDoGestor() {
  const escola = useEscolaDoGestor();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Escola"
        subtitle="Dados e cabeçalho padrão: o que aparece no topo de todas as provas e folhas da escola."
      />
      <div className="card-soft p-5 sm:p-6">
        {escola ? (
          <EditorDaEscola escolaId={escola.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Escolha a escola no menu do perfil.</p>
        )}
      </div>
    </div>
  );
}
