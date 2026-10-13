import { useState, type FormEvent } from "react";
import { Pencil, Power, Trash2, UserMinus, X } from "lucide-react";
import { EditorDaEscola } from "@/components/EditorDaEscola";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type EscolaBasica = { id: string; nome: string; cidade: string | null; ativa: boolean };

const botaoPequeno =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

export function AcoesDaEscola({ escola, onMudou }: { escola: EscolaBasica; onMudou: () => void }) {
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function executar(
    f: () => PromiseLike<{ error: { message: string } | null }>,
    falha: string,
  ) {
    setOcupado(true);
    setErro("");
    const { error } = await f();
    setOcupado(false);
    if (error) {
      console.error(error.message);
      setErro(falha);
      return false;
    }
    onMudou();
    return true;
  }

  function alternarAtiva() {
    const texto = escola.ativa
      ? `Desativar a ${escola.nome}? Gestores e professores perdem o acesso, mas os dados ficam guardados e dá para reativar depois.`
      : `Reativar a ${escola.nome}? Gestores e professores voltam a ter acesso.`;
    if (!window.confirm(texto)) return;
    void executar(
      () => supabase().rpc("definir_escola_ativa", { p_escola: escola.id, p_ativa: !escola.ativa }),
      "Não foi possível mudar a situação da escola.",
    );
  }

  async function excluir(e: FormEvent) {
    e.preventDefault();
    if (confirmacao.trim() !== escola.nome) {
      return setErro("Digite o nome exatamente como aparece.");
    }
    const ok = await executar(
      () => supabase().from("escolas").delete().eq("id", escola.id),
      "Não foi possível excluir. A escola precisa estar desativada.",
    );
    if (ok) setExcluindo(false);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={botaoPequeno}
          disabled={ocupado}
          onClick={() => {
            setErro("");
            setEditando((v) => !v);
          }}
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
        <button type="button" className={botaoPequeno} disabled={ocupado} onClick={alternarAtiva}>
          <Power className="h-3.5 w-3.5" /> {escola.ativa ? "Desativar" : "Reativar"}
        </button>
        {escola.ativa ? null : (
          <button
            type="button"
            className={`${botaoPequeno} hover:bg-coral-soft`}
            disabled={ocupado}
            onClick={() => {
              setConfirmacao("");
              setErro("");
              setExcluindo((v) => !v);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir de vez
          </button>
        )}
      </div>

      {editando ? (
        <div className="mt-3 rounded-2xl border border-border p-4">
          <EditorDaEscola escolaId={escola.id} onSalvo={onMudou} />
        </div>
      ) : null}

      {excluindo ? (
        <form
          onSubmit={(e) => void excluir(e)}
          className="mt-3 rounded-2xl bg-coral-soft p-3"
          noValidate
        >
          <p className="text-xs">
            <strong>Isso apaga a escola e TODOS os dados dela</strong>: turmas, alunos, planos,
            provas e anotações. Não tem volta. Para confirmar, digite o nome da escola:{" "}
            <strong>{escola.nome}</strong>
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              aria-label="Nome da escola para confirmar"
              className="h-9 rounded-full bg-card px-4"
            />
            <button
              type="submit"
              disabled={ocupado || confirmacao.trim() !== escola.nome}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full bg-destructive px-4 text-xs font-semibold text-white disabled:opacity-40"
            >
              Excluir
            </button>
          </div>
        </form>
      ) : null}
      {erro ? <p className="mt-2 text-xs text-destructive">{erro}</p> : null}
    </div>
  );
}

export function RemoverGestor({
  escola,
  usuario,
  nome,
  onRemovido,
}: {
  escola: string;
  usuario: string;
  nome: string;
  onRemovido: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      type="button"
      disabled={ocupado}
      aria-label={`Remover ${nome} da gestão`}
      title="Remover da gestão"
      onClick={() => {
        if (
          !window.confirm(
            `Remover ${nome} da gestão desta escola? A pessoa perde o acesso de gestor aqui.`,
          )
        )
          return;
        setOcupado(true);
        void supabase()
          .from("vinculos")
          .update({ ativo: false })
          .eq("usuario", usuario)
          .eq("escola", escola)
          .eq("papel", "gestor")
          .then(({ error }) => {
            setOcupado(false);
            if (error) window.alert("Não foi possível remover. Tente de novo.");
            else onRemovido();
          });
      }}
      className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-coral-soft hover:text-foreground disabled:opacity-40"
    >
      <UserMinus className="h-3.5 w-3.5" />
    </button>
  );
}

export function CancelarConvite({
  id,
  email,
  onCancelado,
}: {
  id: string;
  email: string;
  onCancelado: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Cancelar o convite de ${email}`}
      title="Cancelar convite"
      onClick={() => {
        if (!window.confirm(`Cancelar o convite de ${email}? O link enviado deixa de valer.`)) {
          return;
        }
        void supabase()
          .from("convites")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) window.alert("Não foi possível cancelar. Tente de novo.");
            else onCancelado();
          });
      }}
      className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-coral-soft hover:text-foreground"
    >
      <X className="h-3 w-3" />
    </button>
  );
}
