-- Ranking de professores e escolas. Só aparece quem aceitar (LGPD: participação opcional).
alter table public.perfis
  add column if not exists aparece_no_ranking boolean not null default false;

grant update (aparece_no_ranking) on public.perfis to authenticated;

-- Proteção do XP: o navegador grava o progresso, então o banco limita quanto ele pode subir.
-- Cada gravação soma no máximo 300 XP e cada dia no máximo 1.500 XP; o excesso é descartado.
alter table public.progresso_professor
  add column if not exists xp_dia       date,
  add column if not exists xp_ganho_dia int not null default 0;

create or replace function public.limitar_xp() returns trigger
language plpgsql as $$
declare
  hoje       date := (now() at time zone 'America/Sao_Paulo')::date;
  anterior   int := case when tg_op = 'UPDATE' then old.xp else 0 end;
  ganho_hoje int := case when tg_op = 'UPDATE' and old.xp_dia = hoje then old.xp_ganho_dia else 0 end;
  ganho      int;
begin
  -- No "insert ... on conflict do update" o gatilho de inserção roda antes do conflito.
  -- Se a linha já existe, quem limita é o gatilho de atualização.
  if tg_op = 'INSERT' and exists (select 1 from progresso_professor where usuario = new.usuario) then
    return new;
  end if;
  ganho := new.xp - anterior;
  if ganho > 0 then
    ganho := least(ganho, 300, greatest(1500 - ganho_hoje, 0));
    new.xp := anterior + ganho;
    new.xp_dia := hoje;
    new.xp_ganho_dia := ganho_hoje + ganho;
  elsif tg_op = 'UPDATE' then
    new.xp_dia := old.xp_dia;
    new.xp_ganho_dia := old.xp_ganho_dia;
  end if;
  return new;
end;
$$;

drop trigger if exists progresso_professor_limitar_xp on public.progresso_professor;
create trigger progresso_professor_limitar_xp
  before insert or update of xp on public.progresso_professor
  for each row execute function public.limitar_xp();

-- Escola principal do professor: o vínculo de professor ativo mais antigo, em escola ativa.
create or replace function public.escola_do_professor(p_usuario uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select v.escola from vinculos v
  join escolas es on es.id = v.escola
  where v.usuario = p_usuario and v.papel = 'professor' and v.ativo and es.ativa
  order by v.criado_em
  limit 1;
$$;

revoke execute on function public.escola_do_professor(uuid) from public, anon, authenticated;

create or replace function public.pode_ver_ranking() returns boolean
language sql stable security definer set search_path = public as $$
  select eh_admin() or exists (select 1 from vinculos where usuario = auth.uid() and ativo);
$$;

create or replace function public.ranking_professores() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not pode_ver_ranking() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return (
    with participantes as (
      select
        pe.id,
        coalesce(nullif(trim(pe.nome), ''), 'Professor(a)') as nome,
        es.nome as escola,
        coalesce(pp.xp, 0) as xp
      from perfis pe
      join escolas es on es.id = escola_do_professor(pe.id)
      left join progresso_professor pp on pp.usuario = pe.id
      where pe.aparece_no_ranking
    ),
    ordenados as (
      select *, rank() over (order by xp desc) as posicao from participantes
    )
    select json_build_object(
      'professores', coalesce((
        select json_agg(json_build_object(
          'posicao', o.posicao, 'nome', o.nome, 'escola', o.escola, 'xp', o.xp,
          'voce', o.id = auth.uid()
        ) order by o.posicao, o.nome)
        from (select * from ordenados order by posicao, nome limit 100) o
      ), '[]'::json),
      'eu', json_build_object(
        'participa', coalesce((select aparece_no_ranking from perfis where id = auth.uid()), false),
        'posicao', (select posicao from ordenados where id = auth.uid()),
        'total', (select count(*) from participantes)
      )
    )
  );
end;
$$;

create or replace function public.ranking_escolas() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not pode_ver_ranking() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return (
    select coalesce(json_agg(e order by e.posicao, e.nome), '[]'::json) from (
      select
        rank() over (order by sum(coalesce(pp.xp, 0)) desc) as posicao,
        es.nome,
        count(*) as professores,
        sum(coalesce(pp.xp, 0))::int as xp_total,
        round(avg(coalesce(pp.xp, 0)))::int as xp_medio,
        exists (select 1 from vinculos v where v.usuario = auth.uid() and v.escola = es.id and v.ativo)
          as sua_escola
      from perfis pe
      join escolas es on es.id = escola_do_professor(pe.id)
      left join progresso_professor pp on pp.usuario = pe.id
      where pe.aparece_no_ranking
      group by es.id, es.nome
      order by posicao
      limit 100
    ) e
  );
end;
$$;

revoke execute on function public.pode_ver_ranking() from public, anon;
revoke execute on function public.ranking_professores() from public, anon;
revoke execute on function public.ranking_escolas() from public, anon;
grant execute on function public.pode_ver_ranking() to authenticated;
grant execute on function public.ranking_professores() to authenticated;
grant execute on function public.ranking_escolas() to authenticated;
