import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Mail, Send, ShieldCheck, Trash2, UserMinus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cancelarConviteAdmin, convidarAdmin, removerAdmin } from "@/lib/equipe";
import { supabase } from "@/lib/supabase";
import { dataCurta, exigir, useDados } from "@/lib/usar-dados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/equipe")({
  head: () => ({ meta: [{ title: "Equipe Lume | Admin Lume" }] }),
  component: EquipeLume,
});

type Admin = { usuario: string; criado_em: string; adicionado_por: string | null };
type Convite = { id: string; email: string; criado_em: string };
type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  ultimo_acesso: string | null;
};

async function carregar() {
  const sb = supabase();
  const [eu, admins, convites] = await Promise.all([
    sb.auth.getUser(),
    sb.from("admins_lume").select("usuario, criado_em, adicionado_por").order("criado_em"),
    sb
      .from("convites_admin")
      .select("id, email, criado_em")
      .is("aceito_em", null)
      .order("criado_em", { ascending: false }),
  ]);
  const lista = exigir(admins) as Admin[];
  const ids = [
    ...new Set(
      lista.flatMap((a) => (a.adicionado_por ? [a.usuario, a.adicionado_por] : [a.usuario])),
    ),
  ];
  const perfis = ids.length
    ? (exigir(
        await sb.from("perfis").select("id, nome, email, ultimo_acesso").in("id", ids),
      ) as Perfil[])
    : [];
  return {
    eu: eu.data.user?.id ?? null,
    admins: lista,
    convites: exigir(convites) as Convite[],
    perfis: new Map(perfis.map((p) => [p.id, p])),
  };
}

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

function EquipeLume() {
  const { dados, erro, carregando, recarregar } = useDados(carregar, []);
  const [aviso, setAviso] = useState<Aviso>(null);

  const depois = (r: { ok: true; mensagem: string } | { ok: false; erro: string }) => {
    setAviso(r.ok ? { tipo: "ok", texto: r.mensagem } : { tipo: "erro", texto: r.erro });
    if (r.ok) void recarregar();
  };
  const sozinho = (dados?.admins.length ?? 0) <= 1;

  return (
    <div>
      <PageHeader
        title="Equipe Lume"
        subtitle="Quem administra a Lume: cria escolas, convida gestores e vê os pedidos de demonstração."
      />

      <ConvidarAdmin onFeito={depois} />

      {aviso ? (
        <p
          role={aviso.tipo === "erro" ? "alert" : "status"}
          className={cn(
            "mb-4 rounded-2xl px-4 py-3 text-sm",
            aviso.tipo === "erro" ? "bg-coral-soft" : "bg-leaf-soft",
          )}
        >
          {aviso.texto}
        </p>
      ) : null}
      {erro ? <p className="rounded-2xl bg-coral-soft p-4 text-sm">{erro}</p> : null}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando equipe…
        </p>
      ) : null}

      {dados ? (
        <section className="card-soft divide-y divide-border">
          {dados.admins.map((a) => {
            const p = dados.perfis.get(a.usuario);
            const quem = a.adicionado_por ? dados.perfis.get(a.adicionado_por) : null;
            const souEu = a.usuario === dados.eu;
            return (
              <div key={a.usuario} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lilac-soft">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {p?.nome || "Sem nome"}
                    {souEu ? (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                        você
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{p?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Admin desde {dataCurta(a.criado_em)}
                    {quem ? ` · adicionado por ${quem.nome || quem.email}` : ""} · último acesso:{" "}
                    {dataCurta(p?.ultimo_acesso)}
                  </p>
                </div>
                {souEu || sozinho ? null : (
                  <Confirmar
                    titulo={`Remover ${p?.nome || p?.email || "esta pessoa"} da equipe?`}
                    texto="Ela deixa de ver o painel Admin na hora. A conta continua existindo (e os vínculos com escolas, se tiver). Dá para convidar de novo depois."
                    acao="Remover"
                    onConfirmar={async () => depois(await removerAdmin(a.usuario))}
                  >
                    <UserMinus className="h-4 w-4" /> Remover
                  </Confirmar>
                )}
              </div>
            );
          })}

          {dados.convites.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sun-soft">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.email}</p>
                <p className="text-xs text-muted-foreground">
                  Convite enviado em {dataCurta(c.criado_em)}, ainda não entrou
                </p>
              </div>
              <Confirmar
                titulo={`Cancelar o convite de ${c.email}?`}
                texto="O link do e-mail deixa de dar acesso de Admin. Se a pessoa criar a conta mesmo assim, ela entra sem ser Admin."
                acao="Cancelar convite"
                onConfirmar={async () => depois(await cancelarConviteAdmin(c.id))}
              >
                <Trash2 className="h-4 w-4" /> Cancelar
              </Confirmar>
            </div>
          ))}
        </section>
      ) : null}

      {sozinho && dados ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Você é o único Admin. A Lume precisa ter pelo menos um, então não dá para remover.
        </p>
      ) : null}
    </div>
  );
}

function ConvidarAdmin({
  onFeito,
}: {
  onFeito: (r: Awaited<ReturnType<typeof convidarAdmin>>) => void;
}) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      return setErro("Digite um e-mail válido.");
    setErro("");
    setEnviando(true);
    const r = await convidarAdmin(email);
    setEnviando(false);
    if (r.ok) setEmail("");
    onFeito(r);
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className="card-soft mb-6 p-5" noValidate>
      <p className="text-sm font-semibold">Adicionar Admin</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Se a pessoa já tem conta na Lume, vira Admin na hora. Se não tem, recebe um convite por
        e-mail para criar a senha.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErro("");
          }}
          placeholder="email@exemplo.com"
          aria-label="E-mail do novo Admin"
          className="h-10 rounded-lg bg-card px-4"
        />
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{" "}
          Convidar como Admin
        </button>
      </div>
      {erro ? <p className="mt-2 text-xs font-medium text-destructive">{erro}</p> : null}
    </form>
  );
}

function Confirmar({
  titulo,
  texto,
  acao,
  onConfirmar,
  children,
}: {
  titulo: string;
  texto: string;
  acao: string;
  onConfirmar: () => Promise<void>;
  children: ReactNode;
}) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={ocupado}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-coral-soft hover:text-destructive disabled:opacity-50"
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{texto}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOcupado(true);
              void onConfirmar().finally(() => setOcupado(false));
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {acao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
