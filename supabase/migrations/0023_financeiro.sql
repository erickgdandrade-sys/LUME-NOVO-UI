create table if not exists public.contratos (
  escola              uuid primary key references public.escolas (id) on delete cascade,
  valor_mensal        numeric(10, 2) not null default 0 check (valor_mensal >= 0),
  dia_vencimento      int not null default 10 check (dia_vencimento between 1 and 28),
  valor_credito_extra numeric(10, 2) not null default 0 check (valor_credito_extra >= 0),
  inicio              date not null default (date_trunc('month', now() at time zone 'America/Sao_Paulo'))::date,
  ativo               boolean not null default true,
  observacao          text check (char_length(observacao) <= 1000),
  atualizado_em       timestamptz not null default now()
);

create table if not exists public.cobrancas (
  id           uuid primary key default gen_random_uuid(),
  escola       uuid not null references public.escolas (id) on delete cascade,
  competencia  date not null check (extract(day from competencia) = 1),
  vencimento   date not null,
  valor        numeric(10, 2) not null check (valor >= 0),
  creditos_extra int not null default 0 check (creditos_extra >= 0),
  valor_extra  numeric(10, 2) not null default 0 check (valor_extra >= 0),
  situacao     text not null default 'pendente' check (situacao in ('pendente', 'paga', 'cancelada')),
  pago_em      date,
  forma        text check (char_length(forma) <= 40),
  observacao   text check (char_length(observacao) <= 1000),
  criada_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (escola, competencia)
);

create index if not exists cobrancas_competencia_idx on public.cobrancas (competencia, situacao);

drop trigger if exists contratos_atualizado on public.contratos;
create trigger contratos_atualizado before update on public.contratos
  for each row execute function public.marcar_atualizacao();
drop trigger if exists cobrancas_atualizada on public.cobrancas;
create trigger cobrancas_atualizada before update on public.cobrancas
  for each row execute function public.marcar_atualizacao();

alter table public.contratos enable row level security;
alter table public.cobrancas enable row level security;
revoke all on public.contratos from anon, authenticated;
revoke all on public.cobrancas from anon, authenticated;
grant select, insert, delete on public.contratos to authenticated;
grant update (valor_mensal, dia_vencimento, valor_credito_extra, inicio, ativo, observacao)
  on public.contratos to authenticated;
grant select, delete on public.cobrancas to authenticated;
grant update (vencimento, valor, valor_extra, situacao, pago_em, forma, observacao)
  on public.cobrancas to authenticated;

drop policy if exists "equipe cuida dos contratos" on public.contratos;
create policy "equipe cuida dos contratos" on public.contratos
  for all to authenticated using (eh_admin()) with check (eh_admin());
drop policy if exists "equipe cuida das cobrancas" on public.cobrancas;
create policy "equipe cuida das cobrancas" on public.cobrancas
  for all to authenticated using (eh_admin()) with check (eh_admin());

create or replace function public.gerar_cobrancas(p_mes date) returns int
language plpgsql security definer set search_path = public as $$
declare
  mes date := date_trunc('month', p_mes)::date;
  anterior date := (date_trunc('month', p_mes) - interval '1 month')::date;
  criadas int;
begin
  if not eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into cobrancas (escola, competencia, vencimento, valor, creditos_extra, valor_extra)
  select
    c.escola,
    mes,
    make_date(extract(year from mes)::int, extract(month from mes)::int, c.dia_vencimento),
    c.valor_mensal,
    coalesce(x.creditos, 0),
    round(coalesce(x.creditos, 0) * c.valor_credito_extra, 2)
  from contratos c
  join escolas e on e.id = c.escola and e.ativa
  left join lateral (
    select sum(u.creditos)::int as creditos from usos_ia u
    where u.escola = c.escola and u.extra
      and u.criado_em >= (anterior::timestamp at time zone 'America/Sao_Paulo')
      and u.criado_em < (mes::timestamp at time zone 'America/Sao_Paulo')
  ) x on true
  where c.ativo and c.inicio <= mes
  on conflict (escola, competencia) do nothing;
  get diagnostics criadas = row_count;
  return criadas;
end;
$$;

revoke execute on function public.gerar_cobrancas(date) from public, anon;
grant execute on function public.gerar_cobrancas(date) to authenticated;
