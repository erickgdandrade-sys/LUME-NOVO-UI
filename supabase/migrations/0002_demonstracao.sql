create table if not exists public.pedidos_demonstracao (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  nome          text not null check (char_length(nome) between 3 and 120),
  email         text not null check (char_length(email) <= 160),
  telefone      text not null check (char_length(telefone) <= 20),
  escola        text not null check (char_length(escola) between 2 and 160),
  cargo         text not null check (char_length(cargo) <= 60),
  estado        char(2) not null,
  cidade        text not null check (char_length(cidade) <= 120),
  mensagem      text check (char_length(mensagem) <= 1500),
  consentiu_em  timestamptz not null default now(),
  situacao      text not null default 'novo'
                check (situacao in ('novo', 'contatado', 'agendado', 'realizado', 'descartado')),
  observacao    text check (char_length(observacao) <= 2000),
  atualizado_em timestamptz not null default now(),
  origem_hash   text
);

create index if not exists pedidos_demonstracao_criado_idx
  on public.pedidos_demonstracao (criado_em desc);
create index if not exists pedidos_demonstracao_origem_idx
  on public.pedidos_demonstracao (origem_hash, criado_em desc);

drop trigger if exists pedidos_demonstracao_atualizado on public.pedidos_demonstracao;
create trigger pedidos_demonstracao_atualizado
  before update on public.pedidos_demonstracao
  for each row execute function public.marcar_atualizacao();

create table if not exists public.configuracoes (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);

insert into public.configuracoes (chave, valor)
values ('emails_pedidos_demonstracao', '["devgang777@gmail.com"]'::jsonb)
on conflict (chave) do nothing;

drop trigger if exists configuracoes_atualizado on public.configuracoes;
create trigger configuracoes_atualizado
  before update on public.configuracoes
  for each row execute function public.marcar_atualizacao();

alter table public.pedidos_demonstracao enable row level security;
alter table public.configuracoes        enable row level security;

revoke all on public.pedidos_demonstracao from anon, authenticated;
revoke all on public.configuracoes        from anon, authenticated;

grant select on public.pedidos_demonstracao to authenticated;
grant update (situacao, observacao) on public.pedidos_demonstracao to authenticated;
grant select, update (valor) on public.configuracoes to authenticated;

drop policy if exists "admin lê pedidos" on public.pedidos_demonstracao;
create policy "admin lê pedidos" on public.pedidos_demonstracao
  for select to authenticated using (public.eh_admin());

drop policy if exists "admin atualiza pedidos" on public.pedidos_demonstracao;
create policy "admin atualiza pedidos" on public.pedidos_demonstracao
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "admin lê configurações" on public.configuracoes;
create policy "admin lê configurações" on public.configuracoes
  for select to authenticated using (public.eh_admin());

drop policy if exists "admin altera configurações" on public.configuracoes;
create policy "admin altera configurações" on public.configuracoes
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
