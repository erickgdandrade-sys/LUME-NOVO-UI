create table if not exists public.planos (
  id           text primary key,
  nome         text not null,
  max_turmas   int check (max_turmas is null or max_turmas >= 0),
  creditos_mes int check (creditos_mes is null or creditos_mes >= 0),
  ordem        int not null default 0
);

insert into public.planos (id, nome, max_turmas, creditos_mes, ordem) values
  ('piloto', 'Piloto', 3, 100, 1),
  ('essencial', 'Essencial', 10, 500, 2),
  ('escola', 'Escola', 30, 2000, 3),
  ('rede', 'Rede', null, null, 4)
on conflict (id) do nothing;

update public.escolas set plano = 'piloto' where plano not in (select id from public.planos);

alter table public.escolas
  add column if not exists max_turmas_proprio   int check (max_turmas_proprio is null or max_turmas_proprio >= 0),
  add column if not exists creditos_mes_proprio int check (creditos_mes_proprio is null or creditos_mes_proprio >= 0);

do $$ begin
  alter table public.escolas
    add constraint escolas_plano_fk foreign key (plano) references public.planos (id);
exception when duplicate_object then null;
end $$;

alter table public.vinculos
  add column if not exists teto_creditos int check (teto_creditos is null or teto_creditos >= 0);

alter table public.usos_ia
  add column if not exists creditos int not null default 1 check (creditos > 0);

create index if not exists usos_ia_usuario_idx on public.usos_ia (escola, usuario, criado_em desc);

create or replace function public.inicio_do_mes() returns timestamptz
language sql stable as $$
  select date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
$$;

create or replace function public.limites_da_escola(p_escola uuid)
returns table (max_turmas int, creditos_mes int)
language sql stable security definer set search_path = public as $$
  select coalesce(e.max_turmas_proprio, p.max_turmas), coalesce(e.creditos_mes_proprio, p.creditos_mes)
  from escolas e join planos p on p.id = e.plano
  where e.id = p_escola;
$$;

create or replace function public.situacao_plano(p_escola uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  lim record;
  inicio timestamptz := inicio_do_mes();
  meu_teto int;
begin
  if not (eh_membro(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into lim from limites_da_escola(p_escola);
  select v.teto_creditos into meu_teto from vinculos v
  where v.escola = p_escola and v.usuario = auth.uid() and v.papel = 'professor' and v.ativo;
  return json_build_object(
    'plano', (select e.plano from escolas e where e.id = p_escola),
    'plano_nome', (select p.nome from escolas e join planos p on p.id = e.plano where e.id = p_escola),
    'max_turmas', lim.max_turmas,
    'turmas_ativas', (select count(*) from turmas where escola = p_escola and ativa),
    'creditos_mes', lim.creditos_mes,
    'creditos_usados', (select coalesce(sum(creditos), 0) from usos_ia where escola = p_escola and criado_em >= inicio),
    'meus_creditos_usados', (select coalesce(sum(creditos), 0) from usos_ia
                             where escola = p_escola and usuario = auth.uid() and criado_em >= inicio),
    'meu_teto', meu_teto,
    'renova_em', (inicio_do_mes() at time zone 'America/Sao_Paulo' + interval '1 month')::date
  );
end;
$$;

create or replace function public.uso_por_professor(p_escola uuid)
returns table (usuario uuid, creditos_usados bigint, teto_creditos int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (eh_gestor(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
    select v.usuario,
           coalesce((select sum(u.creditos) from usos_ia u
                     where u.escola = p_escola and u.usuario = v.usuario and u.criado_em >= inicio_do_mes()), 0),
           v.teto_creditos
    from vinculos v
    where v.escola = p_escola and v.papel = 'professor';
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
  if lim.creditos_mes is not null and usados + p_creditos > lim.creditos_mes then
    return json_build_object('ok', false, 'motivo', 'escola_sem_creditos', 'limite', lim.creditos_mes, 'usados', usados);
  end if;
  if teto is not null and meus + p_creditos > teto then
    return json_build_object('ok', false, 'motivo', 'professor_no_teto', 'limite', teto, 'usados', meus);
  end if;
  insert into usos_ia (escola, usuario, tipo, creditos) values (p_escola, p_usuario, p_tipo, p_creditos)
  returning id into novo;
  return json_build_object('ok', true, 'uso', novo, 'limite', lim.creditos_mes, 'antes', usados, 'depois', usados + p_creditos);
end;
$$;

create or replace function public.definir_plano_escola(
  p_escola uuid, p_plano text, p_max_turmas int, p_creditos_mes int
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update escolas
  set plano = p_plano, max_turmas_proprio = p_max_turmas, creditos_mes_proprio = p_creditos_mes
  where id = p_escola;
end;
$$;

create or replace function public.conferir_limite_turmas() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  limite int;
  ativas int;
begin
  if not new.ativa or (tg_op = 'UPDATE' and old.ativa and old.escola = new.escola) then
    return new;
  end if;
  select max_turmas into limite from limites_da_escola(new.escola);
  if limite is null then
    return new;
  end if;
  perform 1 from escolas where id = new.escola for update;
  select count(*) into ativas from turmas where escola = new.escola and ativa and id <> new.id;
  if ativas >= limite then
    raise exception 'O plano desta escola permite até % turmas ativas.', limite using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists conferir_limite_turmas on public.turmas;
create trigger conferir_limite_turmas
  before insert or update of ativa, escola on public.turmas
  for each row execute function public.conferir_limite_turmas();

alter table public.planos enable row level security;
revoke all on public.planos from anon, authenticated;
grant select on public.planos to authenticated;
grant update (nome, max_turmas, creditos_mes) on public.planos to authenticated;

drop policy if exists "todos veem os planos" on public.planos;
create policy "todos veem os planos" on public.planos for select to authenticated using (true);
drop policy if exists "admin edita os planos" on public.planos;
create policy "admin edita os planos" on public.planos for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

revoke insert on public.usos_ia from authenticated;
drop policy if exists usos_ia_criar on public.usos_ia;

revoke execute on function public.consumir_creditos(uuid, uuid, int, text) from public, anon, authenticated;
revoke execute on function public.limites_da_escola(uuid) from public, anon, authenticated;
revoke execute on function public.situacao_plano(uuid) from public, anon;
revoke execute on function public.uso_por_professor(uuid) from public, anon;
revoke execute on function public.definir_plano_escola(uuid, text, int, int) from public, anon;
revoke execute on function public.conferir_limite_turmas() from public, anon, authenticated;
revoke execute on function public.inicio_do_mes() from public, anon;
