# Lume

Plataforma de educação inclusiva para escolas: planejamento de aula adaptado com a Lumis (IA),
perfis dos alunos, capacitação, biblioteca de estratégias e relatórios, com painéis para
professor, gestor e Admin Lume.

## Tecnologias

- TanStack Start, React 19, TypeScript e Tailwind CSS 4
- Cloudflare Workers (hospedagem e funções do servidor)
- Supabase (PostgreSQL, login e regras de acesso por linha)
- Gemini (IA da Lumis) e Brevo (e-mails)

## Rodar no computador

Requer Node.js 22.12 ou mais novo.

```sh
npm install
cp .env.example .env   # preencha as variáveis
npm run dev
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Abre o site em modo de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run deploy` | Gera e publica na Cloudflare |
| `npm run lint` | Verifica o código |
| `npm run testar:banco` | Testa as regras de segurança do banco |

## Banco de dados

As migrações ficam em `supabase/migrations` e são aplicadas em ordem no Supabase
(SQL Editor ou `scripts/aplicar-banco.ps1`). Os modelos de e-mail ficam em `supabase/templates`.

## Segredos

Ficam guardados na Cloudflare (`npx wrangler secret put NOME`), nunca no código:

- `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BREVO_API_KEY`
