import { Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, BarChart3, Sparkles, UsersRound, type LucideIcon } from "lucide-react";
import lumeLogo from "@/assets/lume-logo.png";
import fundoClaroCentro from "@/assets/fundo-claro-centro.webp";
import fundoClaroLaranja from "@/assets/fundo-claro-laranja.webp";
import fundoClaroRosa from "@/assets/fundo-claro-rosa.webp";
import fundoClaroVerde from "@/assets/fundo-claro-verde.webp";
import fundoEscuroCentro from "@/assets/fundo-escuro-centro.webp";
import fundoEscuroLaranja from "@/assets/fundo-escuro-laranja.webp";
import fundoEscuroRosa from "@/assets/fundo-escuro-rosa.webp";
import fundoEscuroVerde from "@/assets/fundo-escuro-verde.webp";
import { LumeLogo } from "@/components/AppShell";

const destaques: { titulo: string; texto: string; icon: LucideIcon; tom: string; cor: string }[] = [
  {
    titulo: "Planejamento inclusivo com IA",
    texto: "Ajuste aulas, atividades e estratégias para cada aluno.",
    icon: Sparkles,
    tom: "#dcecfb",
    cor: "#2f6fd6",
  },
  {
    titulo: "Perfis inteligentes dos alunos",
    texto: "Acompanhe o desenvolvimento de forma personalizada.",
    icon: UsersRound,
    tom: "#dff1df",
    cor: "#2f8f4e",
  },
  {
    titulo: "Relatórios e acompanhamentos",
    texto: "Dados que orientam decisões e mostram resultados.",
    icon: BarChart3,
    tom: "#fbeccb",
    cor: "#d9822b",
  },
];

const PALCO = { largura: 1920, altura: 1080 };
const LARGURA_MINIMA = 1024;

function useEscala() {
  const [escala, setEscala] = useState<number | null>(null);
  useEffect(() => {
    const medir = () => {
      const { innerWidth: w, innerHeight: h } = window;
      setEscala(w < LARGURA_MINIMA ? null : Math.min(w / PALCO.largura, h / PALCO.altura));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  return escala;
}

function circulo(cx: number, cy: number, r: number, fundo: string): CSSProperties {
  return {
    position: "absolute",
    left: cx - r,
    top: cy - r,
    width: r * 2,
    height: r * 2,
    borderRadius: "9999px",
    background: fundo,
  };
}

const FUNDO = {
  claro: {
    rosa: fundoClaroRosa,
    laranja: fundoClaroLaranja,
    verde: fundoClaroVerde,
    centro: fundoClaroCentro,
  },
  escuro: {
    rosa: fundoEscuroRosa,
    laranja: fundoEscuroLaranja,
    verde: fundoEscuroVerde,
    centro: fundoEscuroCentro,
  },
};
type Peca = keyof typeof FUNDO.claro;

function PecaDoFundo({ peca, estilo }: { peca: Peca; estilo: CSSProperties }) {
  const classe = "pointer-events-none absolute max-w-none select-none";
  return (
    <>
      <img
        aria-hidden="true"
        src={FUNDO.claro[peca]}
        alt=""
        className={`${classe} dark:hidden`}
        style={estilo}
      />
      <img
        aria-hidden="true"
        src={FUNDO.escuro[peca]}
        alt=""
        className={`${classe} hidden dark:block`}
        style={estilo}
      />
    </>
  );
}

function FormasDosCantos({ escala }: { escala: number }) {
  const t = (px: number) => px * escala;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <PecaDoFundo peca="rosa" estilo={{ left: 0, top: 0, width: t(340) }} />
      <PecaDoFundo peca="laranja" estilo={{ right: 0, top: 0, width: t(440) }} />
      <PecaDoFundo peca="verde" estilo={{ left: 0, bottom: 0, width: t(560) }} />
    </div>
  );
}

function Palco() {
  return (
    <>
      <PecaDoFundo peca="centro" estilo={{ left: 540, top: 340, width: 940, height: 740 }} />

      <section className="absolute" style={{ left: 139, top: 125, width: 560 }}>
        <LumeLogo className="h-16 w-auto" />
        <h1
          className="font-display font-bold text-[#1b2744] dark:text-white"
          style={{ marginTop: 16, fontSize: 64, lineHeight: "70px", letterSpacing: "-0.01em" }}
        >
          Juntos por uma educação mais{" "}
          <em className="text-[#2f6fd6] dark:text-[#4f8ff0]">inclusiva.</em>
        </h1>
        <p
          className="text-[#2b3550] dark:text-[#dfe5ef]"
          style={{ marginTop: 10, width: 300, fontSize: 15.5, lineHeight: "18px" }}
        >
          A Lume é uma plataforma que ajuda professores e gestores a planejar aulas mais inclusivas,
          capacitar sua equipe e acompanhar o desenvolvimento de todos os alunos.
        </p>
        <ul style={{ marginTop: 34 }}>
          {destaques.map((d) => (
            <li key={d.titulo} className="flex items-center" style={{ gap: 18, marginBottom: 33 }}>
              <span
                className="grid shrink-0 place-items-center rounded-full"
                style={{ width: 77, height: 77, background: d.tom }}
              >
                <d.icon style={{ width: 30, height: 30, color: d.cor }} />
              </span>
              <span style={{ width: 250 }}>
                <span
                  className="block font-display font-semibold text-[#1b2744] dark:text-white"
                  style={{ fontSize: 16.5, lineHeight: "16px" }}
                >
                  {d.titulo}
                </span>
                <span
                  className="block text-[#2b3550] dark:text-[#dfe5ef]"
                  style={{ marginTop: 4, fontSize: 15.5, lineHeight: "18px" }}
                >
                  {d.texto}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <Link
        to="/demonstracao"
        className="absolute inline-flex items-center justify-center rounded-full bg-[#1f6fe0] text-white shadow-lg transition-opacity hover:opacity-90"
        style={{ left: 139, top: 857, width: 534, height: 74, gap: 22, fontSize: 30 }}
      >
        Agende uma demonstração! <ArrowRight style={{ width: 40, height: 40 }} />
      </Link>
    </>
  );
}

function Cartao({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <main
      className={`claro-fixo rounded-[2.5rem] bg-white shadow-[0_30px_80px_-30px_rgba(27,39,68,0.35)] ${className ?? ""}`}
      style={style}
    >
      <img src={lumeLogo} alt="Lume" className="mb-8 h-12 w-auto sm:h-16" />
      {children}
    </main>
  );
}

export function TelaAcesso({ children }: { children: ReactNode }) {
  const escala = useEscala();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fefdfd] dark:bg-[#131a2a]">
      {escala ? (
        <>
          <FormasDosCantos escala={escala} />
          <div className="absolute inset-0 flex items-end justify-center">
            <div
              className="relative shrink-0"
              style={{ width: PALCO.largura, height: PALCO.altura, zoom: escala }}
            >
              <Palco />
              <Cartao
                className="absolute px-[122px] py-[100px]"
                style={{
                  left: 1025,
                  top: "50%",
                  width: 767,
                  transform: "translateY(-50%)",
                  borderRadius: 72,
                }}
              >
                {children}
              </Cartao>
            </div>
          </div>
        </>
      ) : (
        <div className="relative grid min-h-screen place-items-center px-4 py-10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              style={circulo(0, -60, 130, "linear-gradient(35deg, #f6c4c9, #e0566a)")}
              className="opacity-80"
            />
            <div
              style={{
                ...circulo(0, 60, 110, "linear-gradient(120deg, #f9d65c, #ef9272)"),
                left: "auto",
                right: -40,
              }}
            />
            <div
              style={{
                ...circulo(60, 0, 160, "linear-gradient(80deg, #6fb95f, #9fd06c)"),
                top: "auto",
                bottom: -250,
              }}
            />
          </div>
          <div className="relative w-full max-w-[34rem]">
            <Cartao className="w-full px-7 py-10 sm:px-12 sm:py-12">{children}</Cartao>
            <Link
              to="/demonstracao"
              className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#1f6fe0] hover:underline dark:text-[#6e9bf0]"
            >
              Quer conhecer a Lume? Agende uma demonstração <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export const campoAcesso =
  "h-12 rounded-full border-border bg-white pl-12 pr-4 text-sm text-[#1b2744] caret-[#1b2744] shadow-none placeholder:text-[#8a94ab] focus-visible:ring-2";

export const rotuloAcesso = "text-sm font-semibold text-[#1b2744]";

export const botaoPrincipal =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1f6fe0] px-5 text-base font-semibold text-white shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export function Aviso({ tipo, children }: { tipo: "erro" | "ok"; children: ReactNode }) {
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm ${tipo === "erro" ? "bg-coral-soft" : "bg-leaf-soft"}`}
    >
      {children}
    </div>
  );
}
