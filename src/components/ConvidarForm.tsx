import { useState, type FormEvent } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { convidarPessoa } from "@/lib/convites";

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

export function ConvidarForm({
  escola,
  papel,
  turmas = [],
  onConvidado,
}: {
  escola: string;
  papel: "gestor" | "professor";
  turmas?: { id: string; nome: string }[];
  onConvidado: () => void;
}) {
  const [email, setEmail] = useState("");
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [disciplina, setDisciplina] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!emailValido(email)) {
      setAviso({ tipo: "erro", texto: "Digite um e-mail válido." });
      return;
    }
    setEnviando(true);
    setAviso(null);
    const r = await convidarPessoa(
      escola,
      email,
      papel,
      escolhidas.map((turma) => ({ turma, disciplina: disciplina.trim() })),
    );
    setEnviando(false);
    if (!r.ok) {
      setAviso({ tipo: "erro", texto: r.erro });
      return;
    }
    setAviso({
      tipo: "ok",
      texto: r.jaTinhaConta
        ? `${email} já tinha conta e foi adicionado(a) à escola.`
        : `Convite enviado para ${email}.`,
    });
    const nomes = turmas.filter((t) => escolhidas.includes(t.id)).map((t) => t.nome);
    if (nomes.length) {
      setAviso({
        tipo: "ok",
        texto: r.jaTinhaConta
          ? `${email} já tinha conta e foi adicionado(a) à escola e a: ${nomes.join(", ")}.`
          : `Convite enviado para ${email}. Ao criar a conta, já entra em: ${nomes.join(", ")}.`,
      });
    }
    setEmail("");
    setEscolhidas([]);
    setDisciplina("");
    onConvidado();
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className="space-y-2" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={
            papel === "gestor" ? "email.do.gestor@escola.com" : "email.do.professor@escola.com"
          }
          aria-label={`E-mail do ${papel === "gestor" ? "gestor" : "professor"}`}
          className="h-10 rounded-lg bg-card px-4"
        />
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Convidar
        </button>
      </div>
      {papel === "professor" && turmas.length ? (
        <div className="rounded-2xl border border-border p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Já colocar nas turmas (opcional)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {turmas.map((t) => {
              const ativa = escolhidas.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() =>
                    setEscolhidas((l) => (ativa ? l.filter((x) => x !== t.id) : [...l, t.id]))
                  }
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${ativa ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  {ativa ? <Check className="mr-1 inline h-3 w-3" /> : null}
                  {t.nome}
                </button>
              );
            })}
          </div>
          {escolhidas.length ? (
            <Input
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value.slice(0, 60))}
              placeholder="Disciplina nessas turmas (ex.: Matemática)"
              aria-label="Disciplina nas turmas escolhidas"
              className="mt-2 h-9 rounded-full bg-card px-4"
            />
          ) : null}
        </div>
      ) : null}
      {aviso ? (
        <p
          role={aviso.tipo === "erro" ? "alert" : "status"}
          className={`text-xs ${aviso.tipo === "erro" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {aviso.texto}
        </p>
      ) : null}
    </form>
  );
}
