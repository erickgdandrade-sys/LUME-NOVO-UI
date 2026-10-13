import { useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import { dadosNoNavegador, importarDoNavegador, naoImportar } from "@/lib/importar-local";
import { useEstadoNuvem, useMinhasTurmas } from "@/lib/nuvem";

export function AvisoImportar() {
  const { situacao, usuario } = useEstadoNuvem();
  const turmas = useMinhasTurmas();
  const [turma, setTurma] = useState("");
  const [estado, setEstado] = useState<"aberto" | "importando" | "fechado">("aberto");
  const [erro, setErro] = useState("");

  if (situacao !== "pronta" || !usuario || estado === "fechado") return null;
  const achados = dadosNoNavegador(usuario);
  if (!achados) return null;

  const partes = [
    achados.alunos ? `${achados.alunos} ${achados.alunos === 1 ? "aluno" : "alunos"}` : "",
    achados.planos ? `${achados.planos} ${achados.planos === 1 ? "plano" : "planos"} de aula` : "",
    achados.licoes
      ? `${achados.licoes} ${achados.licoes === 1 ? "lição" : "lições"} da capacitação`
      : "",
  ].filter(Boolean);

  async function importar() {
    setEstado("importando");
    setErro("");
    try {
      await importarDoNavegador(usuario!, turma || null);
      setEstado("fechado");
    } catch (e) {
      console.error(e);
      setErro("Não foi possível trazer tudo agora. Tente de novo.");
      setEstado("aberto");
    }
  }

  return (
    <section className="card-soft mb-6 border-primary/40 bg-accent/40 p-5">
      <p className="inline-flex items-center gap-2 font-display text-base font-semibold">
        <CloudUpload className="h-5 w-5 text-primary" /> Encontramos dados salvos neste computador
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {partes.join(", ")} ficaram guardados só neste navegador. Traga para a sua conta para usar
        em qualquer computador e não perder nada.
      </p>
      {achados.alunos ? (
        <label className="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
          <span className="font-semibold">Colocar os alunos na turma</span>
          <select
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-input bg-card px-3 text-sm"
          >
            <option value="">Sem turma (só eu vejo)</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {erro ? <p className="mt-2 text-sm text-destructive">{erro}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={estado === "importando"}
          onClick={() => void importar()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {estado === "importando" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Trazer para a minha conta
        </button>
        <button
          type="button"
          disabled={estado === "importando"}
          onClick={() => {
            naoImportar(usuario);
            setEstado("fechado");
          }}
          className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          Não, obrigado
        </button>
      </div>
    </section>
  );
}
