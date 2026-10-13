import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Aviso, TelaAcesso, botaoPrincipal } from "@/components/TelaAcesso";
import { confirmarLink } from "@/lib/sessao-store";

type Tipo = "invite" | "recovery" | "email" | "email_change";
type Busca = { token_hash?: string; type?: Tipo };

export const Route = createFileRoute("/confirmar")({
  validateSearch: (s: Record<string, unknown>): Busca => {
    const tipo = s["type"];
    return {
      ...(typeof s["token_hash"] === "string" ? { token_hash: s["token_hash"] } : {}),
      ...(tipo === "invite" || tipo === "recovery" || tipo === "email" || tipo === "email_change"
        ? { type: tipo }
        : {}),
    };
  },
  head: () => ({ meta: [{ title: "Confirmando… | Lume" }] }),
  component: Confirmar,
});

function Confirmar() {
  const { token_hash: tokenHash, type: tipo } = Route.useSearch();
  const navigate = useNavigate();
  const [erro, setErro] = useState("");
  const jaTentou = useRef(false);

  useEffect(() => {
    if (jaTentou.current) return;
    jaTentou.current = true;
    if (!tokenHash || !tipo) {
      setErro("Esse link está incompleto. Abra de novo o link do e-mail.");
      return;
    }
    void confirmarLink(tokenHash, tipo).then((r) => {
      if (!r.ok) {
        setErro("Esse link expirou ou já foi usado. Peça um novo para quem enviou o convite.");
        return;
      }
      if (tipo === "invite") void navigate({ to: "/nova-senha", search: { primeiro: true } });
      else if (tipo === "recovery") void navigate({ to: "/nova-senha", search: {} });
      else if (tipo === "email_change")
        void navigate({ to: "/perfil", search: { email: "confirmado" } });
      else void navigate({ to: "/" });
    });
  }, [tokenHash, tipo, navigate]);

  return (
    <TelaAcesso>
      {erro ? (
        <>
          <Aviso tipo="erro">{erro}</Aviso>
          <Link to="/entrar" className={`mt-6 ${botaoPrincipal}`}>
            Ir para entrar
          </Link>
        </>
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirmando seu acesso…
        </p>
      )}
    </TelaAcesso>
  );
}
