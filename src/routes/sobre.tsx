import { createFileRoute } from "@tanstack/react-router";
import { Apresentacao } from "@/components/Apresentacao";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Lume | Educação inclusiva" },
      {
        name: "description",
        content:
          "O que é a Lume, para quem ela serve e como ajuda a professora a tornar cada aula mais inclusiva.",
      },
      { property: "og:title", content: "Sobre a Lume" },
    ],
  }),
  component: () => <Apresentacao />,
});
