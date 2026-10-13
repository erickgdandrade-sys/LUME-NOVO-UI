import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { ChatLumis } from "@/components/ChatLumis";
import {
  Aviso,
  TelaAcesso,
  botaoPrincipal,
  campoAcesso,
  rotuloAcesso,
} from "@/components/TelaAcesso";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, pedirNovaSenha, reenviarConfirmacao } from "@/lib/sessao-store";
import { contasReais } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar | Lume" },
      { name: "description", content: "Entre na Lume, a plataforma de educação inclusiva." },
    ],
  }),
  component: Entrar,
});

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

function IconeGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function Entrar() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const [reenviado, setReenviado] = useState("");
  const [erros, setErros] = useState<{ usuario?: string; senha?: string }>({});
  const [dialogo, setDialogo] = useState<"senha" | "google" | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos: typeof erros = {};
    if (contasReais ? !emailValido(usuario) : usuario.trim().length < 3) {
      novos.usuario = contasReais
        ? "Digite o e-mail da sua conta, como ana@escola.com."
        : "Digite seu usuário ou e-mail.";
    }
    if (senha.length < 4) novos.senha = "Digite sua senha.";
    setErros(novos);
    setErro("");
    setNaoConfirmado(false);
    setReenviado("");
    if (Object.keys(novos).length > 0) return;

    setCarregando(true);
    const resultado = await entrar(usuario, senha, lembrar);
    setCarregando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      setNaoConfirmado(resultado.erro.includes("confirmou"));
      return;
    }
    void navigate({ to: "/" });
  }

  async function reenviar() {
    const r = await reenviarConfirmacao(usuario);
    setReenviado(r.ok ? "Enviamos um novo link de confirmação. Confira também o spam." : r.erro);
  }

  return (
    <>
      <TelaAcesso>
        <h1 className="font-display text-3xl font-semibold text-[#1b2744] sm:text-[2.1rem]">
          Bem-vindo(a) de volta!
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Faça seu login para continuar na plataforma.
        </p>

        <form onSubmit={(e) => void enviar(e)} className="mt-8 space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="usuario" className={rotuloAcesso}>
              {contasReais ? "E-mail" : "Usuário"}
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                id="usuario"
                type={contasReais ? "email" : "text"}
                inputMode={contasReais ? "email" : "text"}
                autoComplete={contasReais ? "email" : "username"}
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder={contasReais ? "seu@email.com" : "Seu usuário ou e-mail"}
                aria-invalid={Boolean(erros.usuario)}
                aria-describedby={erros.usuario ? "usuario-erro" : undefined}
                className={campoAcesso}
                autoFocus
              />
            </div>
            {erros.usuario ? (
              <p id="usuario-erro" className="text-xs text-destructive">
                {erros.usuario}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha" className={rotuloAcesso}>
              Senha
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                id="senha"
                type={verSenha ? "text" : "password"}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                aria-invalid={Boolean(erros.senha)}
                aria-describedby={erros.senha ? "senha-erro" : undefined}
                className={`${campoAcesso} pr-12`}
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                {verSenha ? (
                  <Eye className="h-[18px] w-[18px]" />
                ) : (
                  <EyeOff className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
            {erros.senha ? (
              <p id="senha-erro" className="text-xs text-destructive">
                {erros.senha}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
              <Checkbox
                checked={lembrar}
                onCheckedChange={(v) => setLembrar(v === true)}
                className="h-5 w-5 rounded-md"
              />
              Lembrar de mim
            </label>
            <button
              type="button"
              onClick={() => setDialogo("senha")}
              className="cursor-pointer font-medium text-[#1f6fe0] hover:underline"
            >
              Esqueceu sua senha?
            </button>
          </div>

          {erro ? (
            <Aviso tipo="erro">
              {erro}
              {naoConfirmado ? (
                <button
                  type="button"
                  onClick={() => void reenviar()}
                  className="mt-2 block cursor-pointer font-semibold underline"
                >
                  Reenviar e-mail de confirmação
                </button>
              ) : null}
            </Aviso>
          ) : null}
          {reenviado ? <Aviso tipo="ok">{reenviado}</Aviso> : null}

          <button type="submit" disabled={carregando} className={botaoPrincipal}>
            Entrar
            {carregando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => setDialogo("google")}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-border bg-white text-sm font-medium text-[#2b3550] transition-colors hover:bg-accent"
          >
            <IconeGoogle /> Faça login com o Google
          </button>
        </form>

        {contasReais ? (
          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-4 w-4" /> O acesso à Lume é por convite da sua escola.
          </p>
        ) : (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Versão de demonstração: o acesso fica salvo só neste navegador e a senha não é guardada.
          </p>
        )}

        <Dialog open={dialogo !== null} onOpenChange={(aberto) => !aberto && setDialogo(null)}>
          <DialogContent className="rounded-3xl sm:max-w-md">
            {dialogo === "senha" && contasReais ? (
              <RecuperarSenha emailInicial={usuario} onFechar={() => setDialogo(null)} />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl font-semibold">
                    {dialogo === "google" ? "Login com Google" : "Esqueceu a senha?"}
                  </DialogTitle>
                  <DialogDescription>
                    {dialogo === "google"
                      ? "O login com Google ainda vai ser ativado. Por enquanto, entre com e-mail e senha."
                      : "Nesta versão de demonstração nenhuma senha fica guardada: você pode entrar com qualquer senha de 4 ou mais caracteres."}
                  </DialogDescription>
                </DialogHeader>
                <button
                  type="button"
                  onClick={() => setDialogo(null)}
                  className={`mt-2 ${botaoPrincipal}`}
                >
                  Entendi
                </button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </TelaAcesso>
      <ChatLumis modo="visitante" />
    </>
  );
}

function RecuperarSenha({
  emailInicial,
  onFechar,
}: {
  emailInicial: string;
  onFechar: () => void;
}) {
  const [email, setEmail] = useState(emailValido(emailInicial) ? emailInicial : "");
  const [estado, setEstado] = useState<"inicio" | "enviando" | "enviado">("inicio");
  const [erro, setErro] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!emailValido(email)) {
      setErro("Digite o e-mail da sua conta.");
      return;
    }
    setErro("");
    setEstado("enviando");
    const r = await pedirNovaSenha(email);
    if (!r.ok) {
      setErro(r.erro);
      setEstado("inicio");
      return;
    }
    setEstado("enviado");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl font-semibold">Esqueceu a senha?</DialogTitle>
        <DialogDescription>
          {estado === "enviado"
            ? `Se existir uma conta com ${email}, enviamos um link para criar uma nova senha. Abra-o neste mesmo navegador. Confira também o spam.`
            : "Digite o e-mail da sua conta e enviaremos um link para você criar uma nova senha."}
        </DialogDescription>
      </DialogHeader>
      {estado === "enviado" ? (
        <button type="button" onClick={onFechar} className={`mt-2 ${botaoPrincipal}`}>
          Entendi
        </button>
      ) : (
        <form onSubmit={(e) => void enviar(e)} className="mt-2 space-y-3" noValidate>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@escola.com"
            aria-label="E-mail da conta"
            className={cn(campoAcesso, "pl-4")}
            autoFocus
          />
          {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
          <button type="submit" disabled={estado === "enviando"} className={botaoPrincipal}>
            {estado === "enviando" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar link
          </button>
        </form>
      )}
    </>
  );
}
