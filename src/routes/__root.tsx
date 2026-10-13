import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AppShell } from "../components/AppShell";
import { Landing } from "../components/Landing";
import { inicioDa, rotaPermitida, useAcesso } from "../lib/acesso";
import { iniciarSessao, useSessao } from "../lib/sessao-store";
import { iniciarTema, scriptTemaInicial } from "../lib/tema";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-bold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Tente novamente ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center justify-center rounded-xl border border-input bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lume — Mais inclusão, menos barreiras" },
      {
        name: "description",
        content:
          "Plataforma de educação inclusiva para professores: capacitação prática, planejamento de aula com IA e perfis de alunos.",
      },
      { name: "author", content: "Lume" },
      { name: "theme-color", content: "#3f74e0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@700;800&family=Sora:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: `${import.meta.env.BASE_URL}favicon.png`, type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTemaInicial }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const TELAS_PUBLICAS = ["/entrar", "/nova-senha", "/confirmar", "/demonstracao"];

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sessao = useSessao();
  const [montado, setMontado] = useState(false);
  useEffect(() => iniciarTema(), []);
  useEffect(() => {
    iniciarSessao()
      .catch((e: unknown) => console.error(e))
      .finally(() => setMontado(true));
  }, []);

  const acesso = useAcesso();
  const rota = pathname.replace(/\/$/, "");
  const telaPublica = TELAS_PUBLICAS.some((t) => rota.endsWith(t));
  const telaSoDeVisitante = rota.endsWith("/entrar");
  const naCapa = rota === "";
  const mostrarCapa = montado && !sessao && naCapa;
  const precisaEntrar = montado && !sessao && !telaPublica && !naCapa;
  const carregandoPapel = Boolean(sessao) && !acesso.carregado;
  const foraDoPapel =
    montado &&
    Boolean(sessao) &&
    acesso.carregado &&
    !telaPublica &&
    !rotaPermitida(acesso.visao, rota);

  useEffect(() => {
    if (precisaEntrar) void navigate({ to: "/entrar", replace: true });
    else if (montado && sessao && acesso.carregado && (telaSoDeVisitante || foraDoPapel)) {
      void navigate({ to: inicioDa(acesso.visao) as "/", replace: true });
    }
  }, [precisaEntrar, montado, sessao, acesso, telaSoDeVisitante, foraDoPapel, navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      {mostrarCapa ? (
        <Landing />
      ) : telaPublica ? (
        <Outlet />
      ) : precisaEntrar || carregandoPapel || foraDoPapel ? null : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
    </QueryClientProvider>
  );
}
