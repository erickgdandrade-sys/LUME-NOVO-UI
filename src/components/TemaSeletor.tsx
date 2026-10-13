import { Monitor, Moon } from "lucide-react";
import { IconeEstrelas } from "@/components/IconeEstrelas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { escolherTema, useTema, type Tema } from "@/lib/tema";

const opcoes = [
  { valor: "claro", rotulo: "Claro", icon: IconeEstrelas },
  { valor: "escuro", rotulo: "Escuro", icon: Moon },
  { valor: "sistema", rotulo: "Automático (do aparelho)", icon: Monitor },
] as const;

export function TemaSeletor() {
  const tema = useTema();
  const atual = opcoes.find((o) => o.valor === tema) ?? opcoes[2];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Tema: ${atual.rotulo}. Trocar tema`}
          title="Trocar tema"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground"
        >
          <atual.icon className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
        <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={tema} onValueChange={(v) => escolherTema(v as Tema)}>
          {opcoes.map((o) => (
            <DropdownMenuRadioItem
              key={o.valor}
              value={o.valor}
              className="cursor-pointer rounded-lg"
            >
              <o.icon className="mr-2 h-4 w-4" /> {o.rotulo}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
