create table if not exists public.liberacoes_extra (
  id            uuid primary key default gen_random_uuid(),
  escola        uuid not null references public.escolas (id) on delete cascade,
  mes           date not null,
  limite_extra  int check (limite_extra is null or limite_extra > 0),
  liberado_por  uuid references auth.users (id) on delete set null,
  liberado_em   timestamptz not null default now(),
  encerrado_por uuid references auth.users (id) on delete set null,
  encerrado_em  timestamptz
);

create unique index if not exists liberacoes_extra_ativa_idx
  on public.liberacoes_extra (escola, mes) where encerrado_em is null;

alter table public.usos_ia add column if not exists extra boolean not null default false;

create or replace function public.mes_atual() returns date
language sql stable as $$ select (inicio_do_mes() at time zone 'America/Sao_Paulo')::date; $$;

create or replace function public.liberar_uso_extra(p_escola uuid, p_limite_extra int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (eh_gestor(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update liberacoes_extra set encerrado_por = auth.uid(), encerrado_em = now()
  where escola = p_escola and mes = mes_atual() and encerrado_em is null;
  insert into liberacoes_extra (escola, mes, limite_extra, liberado_por)
  values (p_escola, mes_atual(), p_limite_extra, auth.uid());
end;
$$;

create or replace function public.encerrar_uso_extra(p_escola uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (eh_gestor(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update liberacoes_extra set encerrado_por = auth.uid(), encerrado_em = now()
  where escola = p_escola and mes = mes_atual() and encerrado_em is null;
end;
$$;

create or replace function public.consumir_creditos(p_escola uuid, p_usuario uuid, p_creditos int, p_tipo text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  lim record;
  inicio timestamptz := inicio_do_mes();
  usados int;
  meus int;
  teto int;
  novo uuid;
  liberacao record;
  extra boolean := false;
begin
  perform 1 from escolas where id = p_escola and ativa for update;
  if not found then
    return json_build_object('ok', false, 'motivo', 'escola_inativa');
  end if;
  select v.teto_creditos into teto from vinculos v
  where v.escola = p_escola and v.usuario = p_usuario and v.ativo and v.papel = 'professor';
  if not found then
    return json_build_object('ok', false, 'motivo', 'sem_vinculo');
  end if;
  select * into lim from limites_da_escola(p_escola);
  select coalesce(sum(creditos), 0) into usados from usos_ia where escola = p_escola and criado_em >= inicio;
  select coalesce(sum(creditos), 0) into meus from usos_ia
  where escola = p_escola and usuario = p_usuario and criado_em >= inicio;
  if teto is not null and meus + p_creditos > teto then
    return json_build_object('ok', false, 'motivo', 'professor_no_teto', 'limite', teto, 'usados', meus);
  end if;
  if lim.creditos_mes is not null and usados + p_creditos > lim.creditos_mes then
    select * into liberacao from liberacoes_extra
    where escola = p_escola and mes = mes_atual() and encerrado_em is null;
    if not found then
      return json_build_object('ok', false, 'motivo', 'escola_sem_creditos', 'limite', lim.creditos_mes, 'usados', usados);
    end if;
    if liberacao.limite_extra is not null
       and usados + p_creditos > lim.creditos_mes + liberacao.limite_extra then
      return json_build_object('ok', false, 'motivo', 'extra_esgotado',
        'limite', lim.creditos_mes + liberacao.limite_extra, 'usados', usados);
    end if;
    extra := true;
  end if;
  insert into usos_ia (escola, usuario, tipo, creditos, extra)
  values (p_escola, p_usuario, p_tipo, p_creditos, extra)
  returning id into novo;
  return json_build_object('ok', true, 'uso', novo, 'limite', lim.creditos_mes,
    'antes', usados, 'depois', usados + p_creditos, 'extra', extra);
end;
$$;

create or replace function public.situacao_plano(p_escola uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  lim record;
  inicio timestamptz := inicio_do_mes();
  meu_teto int;
  liberacao record;
begin
  if not (eh_membro(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into lim from limites_da_escola(p_escola);
  select v.teto_creditos into meu_teto from vinculos v
  where v.escola = p_escola and v.usuario = auth.uid() and v.papel = 'professor' and v.ativo;
  select l.limite_extra, l.liberado_em, p.nome as liberado_por_nome into liberacao
  from liberacoes_extra l left join perfis p on p.id = l.liberado_por
  where l.escola = p_escola and l.mes = mes_atual() and l.encerrado_em is null;
  return json_build_object(
    'plano', (select e.plano from escolas e where e.id = p_escola),
    'plano_nome', (select p.nome from escolas e join planos p on p.id = e.plano where e.id = p_escola),
    'max_turmas', lim.max_turmas,
    'turmas_ativas', (select count(*) from turmas where escola = p_escola and ativa),
    'creditos_mes', lim.creditos_mes,
    'creditos_usados', (select coalesce(sum(creditos), 0) from usos_ia where escola = p_escola and criado_em >= inicio),
    'creditos_extra_usados', (select coalesce(sum(creditos), 0) from usos_ia
                              where escola = p_escola and extra and criado_em >= inicio),
    'extra_liberado', liberacao.liberado_em is not null,
    'extra_limite', liberacao.limite_extra,
    'extra_liberado_em', liberacao.liberado_em,
    'extra_liberado_por', liberacao.liberado_por_nome,
    'meus_creditos_usados', (select coalesce(sum(creditos), 0) from usos_ia
                             where escola = p_escola and usuario = auth.uid() and criado_em >= inicio),
    'meu_teto', meu_teto,
    'renova_em', (inicio_do_mes() at time zone 'America/Sao_Paulo' + interval '1 month')::date
  );
end;
$$;

create or replace function public.extras_por_escola(p_mes date)
returns table (escola uuid, creditos_extra bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
    select u.escola, sum(u.creditos)::bigint from usos_ia u
    where u.extra
      and u.criado_em >= (p_mes::timestamp at time zone 'America/Sao_Paulo')
      and u.criado_em < ((p_mes + interval '1 month')::timestamp at time zone 'America/Sao_Paulo')
    group by u.escola;
end;
$$;

alter table public.liberacoes_extra enable row level security;
revoke all on public.liberacoes_extra from anon, authenticated;
grant select on public.liberacoes_extra to authenticated;

drop policy if exists "gestor e admin veem liberações" on public.liberacoes_extra;
create policy "gestor e admin veem liberações" on public.liberacoes_extra
  for select to authenticated using (public.eh_admin() or public.eh_gestor(escola));

revoke execute on function public.consumir_creditos(uuid, uuid, int, text) from public, anon, authenticated;
revoke execute on function public.situacao_plano(uuid) from public, anon;
revoke execute on function public.liberar_uso_extra(uuid, int) from public, anon;
revoke execute on function public.encerrar_uso_extra(uuid) from public, anon;
revoke execute on function public.extras_por_escola(date) from public, anon;
revoke execute on function public.mes_atual() from public, anon;
