import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import {
  Aviso,
  TelaAcesso,
  botaoPrincipal,
  campoAcesso,
  rotuloAcesso,
} from "@/components/TelaAcesso";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirNovaSenha, useSessao } from "@/lib/sessao-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nova-senha")({
  validateSearch: (s: Record<string, unknown>): { primeiro?: boolean } =>
    s["primeiro"] === true || s["primeiro"] === "true" ? { primeiro: true } : {},
  head: () => ({ meta: [{ title: "Nova senha | Lume" }] }),
  component: NovaSenha,
});

function NovaSenha() {
  const navigate = useNavigate();
  const sessao = useSessao();
  const { primeiro } = Route.useSearch();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirmar) return setErro("As senhas não são iguais.");
    setErro("");
    setCarregando(true);
    const r = await definirNovaSenha(senha);
    setCarregando(false);
    if (!r.ok) return setErro(r.erro);
    void navigate({ to: "/" });
  }

  if (!sessao) {
    return (
      <TelaAcesso>
        <Aviso tipo="erro">
          Esse link expirou ou já foi usado. Peça um novo em “Esqueceu a senha?”, na tela de entrar,
          e abra-o neste mesmo navegador.
        </Aviso>
        <Link to="/entrar" className={`mt-6 ${botaoPrincipal}`}>
          Voltar para entrar
        </Link>
      </TelaAcesso>
    );
  }

  return (
    <TelaAcesso>
      <h1 className="mb-2 text-center font-display text-2xl font-semibold">
        {primeiro ? "Boas-vindas! Crie sua senha" : "Criar nova senha"}
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">Para a conta {sessao.email}</p>
      <form onSubmit={(e) => void enviar(e)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="senha" className={rotuloAcesso}>
            Nova senha
          </Label>
          <Input
            id="senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Pelo menos 8 caracteres"
            className={cn(campoAcesso, "pl-4")}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar" className={rotuloAcesso}>
            Confirmar senha
          </Label>
          <Input
            id="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repita a senha"
            className={cn(campoAcesso, "pl-4")}
          />
        </div>
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <button type="submit" disabled={carregando} className={botaoPrincipal}>
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Salvar nova senha
        </button>
      </form>
    </TelaAcesso>
  );
}
