import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Download,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
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
import { carregarExemplosNaNuvem, useAlunos } from "@/lib/alunos-store";
import { useCapacitacao } from "@/lib/capacitacao-store";
import {
  apagarTudo,
  baixarBackup,
  baixarMeusDados,
  carregarExemplos,
  restaurarBackup,
} from "@/lib/dados-locais";
import { planosStore } from "@/lib/planos-store";
import { useProgresso } from "@/lib/progresso-store";
import { contasReais } from "@/lib/supabase";

export const Route = createFileRoute("/dados")({
  head: () => ({
    meta: [
      { title: "Meus dados e privacidade | Lume" },
      {
        name: "description",
        content:
          "Onde ficam os dados dos seus alunos, o que é enviado à IA e como fazer backup ou apagar tudo.",
      },
    ],
  }),
  component: MeusDados,
});

function Bloco({
  icon,
  titulo,
  children,
}: {
  icon: ReactNode;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="card-soft p-5">
      <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold">
        {icon} {titulo}
      </h2>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

const botao =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90";

function MeusDados() {
  const alunos = useAlunos();
  const planos = planosStore.use();
  const progresso = useProgresso();
  const capacitacao = useCapacitacao();
  const arquivo = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState<File | null>(null);

  const reais = alunos.filter((a) => !a.exemplo).length;
  const exemplos = alunos.length - reais;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Meus dados e privacidade"
        subtitle="Informações de alunos são dados sensíveis. Veja como a Lume cuida delas."
      />

      <div className="space-y-4">
        <Bloco icon={<HardDrive className="h-4 w-4" />} titulo="Onde seus dados ficam">
          {contasReais ? (
            <>
              <p>
                Tudo o que você cadastra fica salvo <strong>na sua conta da Lume</strong>, num banco
                de dados protegido. Você acessa de qualquer computador, entrando com seu e-mail e
                senha.
              </p>
              <p>
                <strong>Quem vê o perfil de um aluno:</strong> só os professores vinculados à turma
                dele (ou só você, se o aluno estiver sem turma). A coordenação vê apenas números,
                como quantos alunos têm necessidades específicas, e não os perfis. A equipe da Lume
                também não vê os perfis.
              </p>
            </>
          ) : (
            <>
              <p>
                Tudo o que você cadastra fica salvo{" "}
                <strong>apenas neste navegador, neste aparelho</strong>. A Lume não tem uma conta
                sua nem guarda os perfis dos alunos em servidor.
              </p>
              <p>
                Se você limpar os dados do navegador ou trocar de aparelho, as informações se
                perdem. Faça um backup de vez em quando.
              </p>
            </>
          )}
          <p className="font-semibold text-foreground">
            Hoje: {reais} {reais === 1 ? "aluno cadastrado" : "alunos cadastrados"}
            {exemplos > 0 ? ` e ${exemplos} de exemplo` : ""} · {planos.length}{" "}
            {planos.length === 1 ? "plano adaptado" : "planos adaptados"}.
          </p>
        </Bloco>

        <Bloco icon={<ShieldCheck className="h-4 w-4" />} titulo="O que vai para a IA">
          <p>
            Só quando você clica em <strong>“Adaptar aula com IA”</strong>, a Lume envia ao serviço
            de IA o texto do seu plano de aula e o perfil de cada aluno selecionado, identificado
            apenas como “Aluno 1”, “Aluno 2”…
          </p>
          <p>
            Vão: série, nível de suporte, necessidades observadas, diagnóstico (se houver), o que
            funciona, o que evitar e aspectos sensoriais.
          </p>
          <p>
            <strong>Nunca vão:</strong> nome, idade, relato da família, anotações e registros de
            participação.
          </p>
          <p className="rounded-2xl bg-sun-soft px-4 py-3 text-foreground">
            <strong>Na versão com IA gratuita (Google Gemini):</strong> pelos termos do Google, o
            conteúdo enviado ao plano gratuito pode ser usado para melhorar os produtos deles e lido
            por revisores humanos. Nessa versão, use apenas alunos de exemplo ou perfis fictícios.
            Para dados reais, a escola precisa de um plano pago, que não usa o conteúdo dessa forma.
          </p>
        </Bloco>

        <Bloco icon={<UserRound className="h-4 w-4" />} titulo="Boas práticas">
          <ul className="list-disc space-y-1 pl-5">
            <li>Use iniciais ou apelido no lugar do nome completo da criança.</li>
            <li>Não escreva nomes de pessoas nos campos de texto do perfil.</li>
            <li>Registre diagnósticos só com autorização da família ou da escola.</li>
            <li>Em computador compartilhado, apague os dados ao terminar.</li>
          </ul>
        </Bloco>

        <section className="card-soft p-5">
          <h2 className="font-display text-base font-semibold">
            {contasReais ? "Cópia dos seus dados" : "Backup e exclusão"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {contasReais
              ? "Baixe um arquivo com os alunos, anotações, planos e progresso que você vê na Lume. Guarde em local seguro: ele contém informações dos alunos."
              : "O backup é um arquivo com todos os seus dados da Lume. Guarde-o em local seguro: ele contém informações dos alunos."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                contasReais
                  ? baixarMeusDados({ alunos, planos, progresso, capacitacao })
                  : baixarBackup()
              }
              className={`${botao} bg-primary text-primary-foreground`}
            >
              <Download className="h-4 w-4" /> {contasReais ? "Baixar meus dados" : "Baixar backup"}
            </button>
            {contasReais ? null : (
              <button
                type="button"
                onClick={() => arquivo.current?.click()}
                className={`${botao} border border-border bg-card`}
              >
                <Upload className="h-4 w-4" /> Restaurar backup
              </button>
            )}
            <input
              ref={arquivo}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Arquivo de backup"
              onChange={(e) => {
                setErro("");
                setPendente(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>

          {erro ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
            {exemplos === 0 ? (
              <button
                type="button"
                onClick={() =>
                  contasReais
                    ? void carregarExemplosNaNuvem().catch((e: unknown) => {
                        console.error(e);
                        setErro("Não foi possível carregar os exemplos agora.");
                      })
                    : carregarExemplos(alunos)
                }
                className={`${botao} border border-border bg-card`}
              >
                <Sparkles className="h-4 w-4" /> Carregar alunos de exemplo
              </button>
            ) : null}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className={`${botao} bg-coral-soft text-foreground`}>
                  <Trash2 className="h-4 w-4" />{" "}
                  {contasReais ? "Limpar este navegador" : "Apagar todos os dados"}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {contasReais
                      ? "Limpar os dados deste navegador?"
                      : "Apagar todos os dados da Lume?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {contasReais
                      ? "Apaga o que ficou guardado neste computador (como dados antigos de antes da conta) e você sai da Lume aqui. Os dados da sua conta continuam salvos. Para excluir um aluno, abra o perfil dele e clique em Excluir."
                      : "Perfis dos alunos, anotações, planos adaptados e seu progresso serão apagados deste navegador. Essa ação não pode ser desfeita — baixe um backup antes, se quiser guardar."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={apagarTudo}
                  >
                    {contasReais ? "Limpar" : "Apagar tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/sobre" className="font-semibold text-primary">
            Conheça a Lume
          </Link>
        </p>
      </div>

      <AlertDialog open={pendente !== null} onOpenChange={(aberto) => !aberto && setPendente(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar este backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados atuais deste navegador serão substituídos pelos do arquivo “{pendente?.name}
              ”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => {
                if (!pendente) return;
                restaurarBackup(pendente).catch((e: unknown) =>
                  setErro(e instanceof Error ? e.message : "Não foi possível restaurar."),
                );
              }}
            >
              <RotateCcw className="h-4 w-4" /> Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
