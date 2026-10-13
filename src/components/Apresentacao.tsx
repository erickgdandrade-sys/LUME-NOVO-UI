import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LumisAnimada } from "@/components/Lumis";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apresentacaoStore, perfilStore } from "@/lib/perfil-store";

const passos = [
  {
    icon: Users,
    tone: "bg-leaf-soft text-leaf",
    titulo: "Conte como seus alunos aprendem",
    texto: "Registre as necessidades que você observa em sala. Não é preciso ter laudo.",
  },
  {
    icon: Sparkles,
    tone: "bg-sky-soft text-sky",
    titulo: "Cole seu plano de aula",
    texto: "A IA devolve a mesma aula adaptada para a turma toda e para cada aluno.",
  },
  {
    icon: GraduationCap,
    tone: "bg-tangerine-soft text-tangerine",
    titulo: "Aprenda na prática",
    texto: "Trilhas curtas, flashcards e uma biblioteca de estratégias com base no DUA.",
  },
] as const;

export function Apresentacao({ primeiroAcesso = false }: { primeiroAcesso?: boolean }) {
  const [nome, setNome] = useState("");

  function comecar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (n.length >= 2) perfilStore.set({ ...perfilStore.get(), nome: n });
    apresentacaoStore.set(true);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="card-soft overflow-hidden p-6 sm:p-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Mais inclusão, menos barreiras</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Boas-vindas à Lume</h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Uma assistente para a professora da sala regular tornar cada aula mais inclusiva — sem
              precisar ser especialista em educação especial e sem separar ninguém da turma.
            </p>
          </div>
          <LumisAnimada className="hidden h-24 w-24 shrink-0 sm:block" />
        </div>
      </section>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Como funciona</h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {passos.map((p, i) => (
          <li key={p.titulo} className="card-soft p-5">
            <span className={`mb-3 grid h-10 w-10 place-items-center rounded-lg ${p.tone}`}>
              <p.icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold">
              {i + 1}. {p.titulo}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
          </li>
        ))}
      </ol>

      <section className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="card-soft p-5">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <HeartHandshake className="h-4 w-4 text-lilac" /> Para quem é
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Professoras e professores da sala regular, do AEE e da coordenação que querem incluir
            todos os alunos no dia a dia.
          </p>
        </div>
        <div className="card-soft p-5">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-leaf" /> Privacidade em primeiro lugar
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os nomes dos alunos nunca vão para a IA, e os dados ficam só no seu navegador.{" "}
            <Link to="/dados" className="font-semibold text-primary">
              Saiba mais
            </Link>
          </p>
        </div>
      </section>

      {primeiroAcesso ? (
        <form onSubmit={comecar} className="card-soft mt-8 p-5 sm:p-6">
          <Label htmlFor="apresentacao-nome" className="text-sm font-semibold">
            Como quer ser chamada? <span className="font-normal">(opcional)</span>
          </Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="apresentacao-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Prof. Ana"
              className="h-10 bg-card"
            />
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Começar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Os alunos que você vai ver são exemplos fictícios, marcados com o selo “Exemplo”. Você
            pode apagá-los em Meus dados.
          </p>
        </form>
      ) : (
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ir para o início <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
