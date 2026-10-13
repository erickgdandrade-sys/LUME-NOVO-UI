create table if not exists public.tickets (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  tipo          text not null check (tipo in ('duvida', 'creditos')),
  origem        text not null check (origem in ('chat', 'chat-visitante', 'gestor')),
  situacao      text not null default 'aberto' check (situacao in ('aberto', 'respondido', 'resolvido')),
  usuario       uuid references auth.users (id) on delete set null,
  nome          text check (char_length(nome) <= 120),
  email         text not null check (char_length(email) <= 200),
  escola        uuid references public.escolas (id) on delete set null,
  escola_nome   text check (char_length(escola_nome) <= 160),
  papel         text check (char_length(papel) <= 40),
  assunto       text not null check (char_length(assunto) between 2 and 200),
  mensagem      text check (char_length(mensagem) <= 4000),
  conversa      jsonb not null default '[]'::jsonb
    check (jsonb_typeof(conversa) = 'array' and jsonb_array_length(conversa) <= 30),
  observacao    text check (char_length(observacao) <= 4000)
);

create index if not exists tickets_situacao_idx on public.tickets (situacao, criado_em desc);

drop trigger if exists tickets_atualizado on public.tickets;
create trigger tickets_atualizado
  before update on public.tickets
  for each row execute function public.marcar_atualizacao();

alter table public.tickets enable row level security;
revoke all on public.tickets from anon, authenticated;
grant select, delete on public.tickets to authenticated;
grant update (situacao, observacao) on public.tickets to authenticated;

drop policy if exists "equipe vê os chamados" on public.tickets;
create policy "equipe vê os chamados" on public.tickets
  for select to authenticated using (eh_admin());
drop policy if exists "equipe atualiza os chamados" on public.tickets;
create policy "equipe atualiza os chamados" on public.tickets
  for update to authenticated using (eh_admin()) with check (eh_admin());
drop policy if exists "equipe apaga os chamados" on public.tickets;
create policy "equipe apaga os chamados" on public.tickets
  for delete to authenticated using (eh_admin());
