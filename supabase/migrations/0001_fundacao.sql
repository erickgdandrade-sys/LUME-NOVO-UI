create table if not exists public.escolas (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (length(trim(nome)) >= 2),
  cidade       text,
  endereco     text,
  responsaveis text,
  logo_url     text,
  plano        text not null default 'piloto',
  ativa        boolean not null default true,
  criada_em    timestamptz not null default now()
);

create table if not exists public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text,
  email         text,
  criado_em     timestamptz not null default now(),
  ultimo_acesso timestamptz
);

create table if not exists public.admins_lume (
  usuario   uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.vinculos (
  id        uuid primary key default gen_random_uuid(),
  usuario   uuid not null references auth.users (id) on delete cascade,
  escola    uuid not null references public.escolas (id) on delete cascade,
  papel     text not null check (papel in ('gestor', 'professor')),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (usuario, escola, papel)
);

create table if not exists public.convites (
  id            uuid primary key default gen_random_uuid(),
  escola        uuid not null references public.escolas (id) on delete cascade,
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  papel         text not null check (papel in ('gestor', 'professor')),
  convidado_por uuid references auth.users (id) on delete set null,
  criado_em     timestamptz not null default now(),
  aceito_em     timestamptz
);

create table if not exists public.turmas (
  id         uuid primary key default gen_random_uuid(),
  escola     uuid not null references public.escolas (id) on delete cascade,
  nome       text not null check (length(trim(nome)) >= 1),
  serie      text,
  turno      text,
  ano_letivo int not null default extract(year from now())::int,
  ativa      boolean not null default true,
  criada_em  timestamptz not null default now()
);

create table if not exists public.turma_professores (
  turma      uuid not null references public.turmas (id) on delete cascade,
  professor  uuid not null references auth.users (id) on delete cascade,
  disciplina text,
  primary key (turma, professor)
);

create table if not exists public.alunos (
  id              uuid primary key default gen_random_uuid(),
  escola          uuid not null references public.escolas (id) on delete cascade,
  turma           uuid references public.turmas (id) on delete set null,
  nome            text not null check (length(trim(nome)) >= 2),
  idade           int check (idade between 2 and 20),
  serie           text,
  suporte         text not null default 'Leve' check (suporte in ('Leve', 'Médio', 'Alto')),
  necessidades    text[] not null default '{}',
  diagnosticos    text[] not null default '{}',
  resumo          text not null default '',
  caracteristicas text[] not null default '{}',
  preferencias    text[] not null default '{}',
  sensorial       text[] not null default '{}',
  funcionam       text[] not null default '{}',
  nao_funcionam   text[] not null default '{}',
  familia         text not null default '',
  criado_por      uuid references auth.users (id) on delete set null,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create table if not exists public.anotacoes_aluno (
  id        uuid primary key default gen_random_uuid(),
  aluno     uuid not null references public.alunos (id) on delete cascade,
  autor     uuid references auth.users (id) on delete set null,
  titulo    text not null default 'Anotação',
  texto     text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.participacoes (
  aluno          uuid not null references public.alunos (id) on delete cascade,
  mes            date not null check (extract(day from mes) = 1),
  participacao   int not null check (participacao between 0 and 100),
  registrado_por uuid references auth.users (id) on delete set null,
  primary key (aluno, mes)
);

create table if not exists public.planejamentos (
  id             uuid primary key default gen_random_uuid(),
  escola         uuid not null references public.escolas (id) on delete cascade,
  turma          uuid references public.turmas (id) on delete set null,
  professor      uuid not null references auth.users (id) on delete cascade,
  titulo         text not null,
  disciplina     text,
  serie          text,
  plano_original text not null,
  resultado      jsonb not null,
  alunos_ids     uuid[] not null default '{}',
  criado_em      timestamptz not null default now()
);

create table if not exists public.usos_ia (
  id        uuid primary key default gen_random_uuid(),
  escola    uuid not null references public.escolas (id) on delete cascade,
  usuario   uuid references auth.users (id) on delete set null,
  tipo      text not null default 'adaptar_aula',
  criado_em timestamptz not null default now()
);

create table if not exists public.registro_acessos (
  id        uuid primary key default gen_random_uuid(),
  escola    uuid not null references public.escolas (id) on delete cascade,
  usuario   uuid references auth.users (id) on delete set null,
  aluno     uuid references public.alunos (id) on delete set null,
  acao      text not null check (acao in ('visualizou', 'criou', 'editou', 'excluiu', 'exportou')),
  criado_em timestamptz not null default now()
);

create index if not exists vinculos_escola_idx on public.vinculos (escola);
create index if not exists convites_email_idx on public.convites (lower(email));
create index if not exists turmas_escola_idx on public.turmas (escola);
create index if not exists turma_professores_prof_idx on public.turma_professores (professor);
create index if not exists alunos_turma_idx on public.alunos (turma);
create index if not exists alunos_escola_idx on public.alunos (escola);
create index if not exists planejamentos_escola_idx on public.planejamentos (escola, criado_em desc);
create index if not exists planejamentos_professor_idx on public.planejamentos (professor);
create index if not exists usos_ia_escola_idx on public.usos_ia (escola, criado_em desc);
create index if not exists registro_acessos_aluno_idx on public.registro_acessos (aluno, criado_em desc);

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins_lume where usuario = auth.uid());
$$;

create or replace function public.eh_gestor(p_escola uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from vinculos
    where usuario = auth.uid() and escola = p_escola and papel = 'gestor' and ativo
  );
$$;

create or replace function public.eh_membro(p_escola uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from vinculos where usuario = auth.uid() and escola = p_escola and ativo
  );
$$;

create or replace function public.leciona(p_turma uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from turma_professores tp
    join turmas t on t.id = tp.turma
    join vinculos v on v.escola = t.escola and v.usuario = tp.professor
    where tp.turma = p_turma and tp.professor = auth.uid()
      and v.papel = 'professor' and v.ativo
  );
$$;

create or replace function public.turma_da_escola(p_turma uuid, p_escola uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_turma is null or exists (select 1 from turmas where id = p_turma and escola = p_escola);
$$;

create or replace function public.pode_ver_aluno(p_aluno uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from alunos a
    where a.id = p_aluno
      and (
        (a.turma is not null and leciona(a.turma))
        or (a.turma is null and a.criado_por = auth.uid() and eh_membro(a.escola))
      )
  );
$$;

create or replace function public.emails_admin_lume() returns text[]
language sql immutable as $$ select array['erickgdandrade@gmail.com']::text[]; $$;

create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''), new.email)
  on conflict (id) do nothing;

  if lower(new.email) = any (emails_admin_lume()) then
    insert into admins_lume (usuario) values (new.id) on conflict do nothing;
  end if;

  insert into vinculos (usuario, escola, papel)
  select new.id, c.escola, c.papel from convites c
  where lower(c.email) = lower(new.email) and c.aceito_em is null
  on conflict (usuario, escola, papel) do update set ativo = true;

  update convites set aceito_em = now()
  where lower(email) = lower(new.email) and aceito_em is null;

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.ao_criar_usuario();

create or replace function public.marcar_atualizacao() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists alunos_atualizado on public.alunos;
create trigger alunos_atualizado
  before update on public.alunos
  for each row execute function public.marcar_atualizacao();

alter table public.escolas          enable row level security;
alter table public.perfis           enable row level security;
alter table public.admins_lume      enable row level security;
alter table public.vinculos         enable row level security;
alter table public.convites         enable row level security;
alter table public.turmas           enable row level security;
alter table public.turma_professores enable row level security;
alter table public.alunos           enable row level security;
alter table public.anotacoes_aluno  enable row level security;
alter table public.participacoes    enable row level security;
alter table public.planejamentos    enable row level security;
alter table public.usos_ia          enable row level security;
alter table public.registro_acessos enable row level security;

revoke all on all tables in schema public from anon;

drop policy if exists escolas_ver on public.escolas;
create policy escolas_ver on public.escolas for select to authenticated
  using (eh_admin() or eh_membro(id));
drop policy if exists escolas_criar on public.escolas;
create policy escolas_criar on public.escolas for insert to authenticated
  with check (eh_admin());
drop policy if exists escolas_editar on public.escolas;
create policy escolas_editar on public.escolas for update to authenticated
  using (eh_admin() or eh_gestor(id)) with check (eh_admin() or eh_gestor(id));
drop policy if exists escolas_excluir on public.escolas;
create policy escolas_excluir on public.escolas for delete to authenticated
  using (eh_admin());
revoke update on public.escolas from authenticated;
grant update (nome, cidade, endereco, responsaveis, logo_url) on public.escolas to authenticated;

drop policy if exists perfis_ver on public.perfis;
create policy perfis_ver on public.perfis for select to authenticated
  using (
    id = auth.uid() or eh_admin()
    or exists (select 1 from vinculos v where v.usuario = perfis.id and eh_gestor(v.escola))
  );
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.perfis from authenticated;
grant update (nome, ultimo_acesso) on public.perfis to authenticated;

drop policy if exists admins_ver on public.admins_lume;
create policy admins_ver on public.admins_lume for select to authenticated
  using (usuario = auth.uid());

drop policy if exists vinculos_ver on public.vinculos;
create policy vinculos_ver on public.vinculos for select to authenticated
  using (usuario = auth.uid() or eh_admin() or eh_gestor(escola));
drop policy if exists vinculos_criar on public.vinculos;
create policy vinculos_criar on public.vinculos for insert to authenticated
  with check (eh_admin() or (eh_gestor(escola) and papel = 'professor'));
drop policy if exists vinculos_editar on public.vinculos;
create policy vinculos_editar on public.vinculos for update to authenticated
  using (eh_admin() or (eh_gestor(escola) and papel = 'professor'))
  with check (eh_admin() or (eh_gestor(escola) and papel = 'professor'));
drop policy if exists vinculos_excluir on public.vinculos;
create policy vinculos_excluir on public.vinculos for delete to authenticated
  using (eh_admin() or (eh_gestor(escola) and papel = 'professor'));

drop policy if exists convites_ver on public.convites;
create policy convites_ver on public.convites for select to authenticated
  using (eh_admin() or eh_gestor(escola));
drop policy if exists convites_criar on public.convites;
create policy convites_criar on public.convites for insert to authenticated
  with check (
    convidado_por = auth.uid()
    and (eh_admin() or (eh_gestor(escola) and papel = 'professor'))
  );
drop policy if exists convites_excluir on public.convites;
create policy convites_excluir on public.convites for delete to authenticated
  using (eh_admin() or (eh_gestor(escola) and papel = 'professor'));

drop policy if exists turmas_ver on public.turmas;
create policy turmas_ver on public.turmas for select to authenticated
  using (eh_admin() or eh_gestor(escola) or leciona(id));
drop policy if exists turmas_gerir on public.turmas;
create policy turmas_gerir on public.turmas for all to authenticated
  using (eh_admin() or eh_gestor(escola)) with check (eh_admin() or eh_gestor(escola));

drop policy if exists turma_prof_ver on public.turma_professores;
create policy turma_prof_ver on public.turma_professores for select to authenticated
  using (
    professor = auth.uid()
    or exists (select 1 from turmas t where t.id = turma and (eh_admin() or eh_gestor(t.escola)))
  );
drop policy if exists turma_prof_gerir on public.turma_professores;
create policy turma_prof_gerir on public.turma_professores for all to authenticated
  using (exists (select 1 from turmas t where t.id = turma and (eh_admin() or eh_gestor(t.escola))))
  with check (
    exists (select 1 from turmas t where t.id = turma and (eh_admin() or eh_gestor(t.escola)))
    and exists (
      select 1 from turmas t join vinculos v on v.escola = t.escola
      where t.id = turma and v.usuario = professor and v.papel = 'professor' and v.ativo
    )
  );

drop policy if exists alunos_ver on public.alunos;
create policy alunos_ver on public.alunos for select to authenticated
  using (
    (turma is not null and leciona(turma))
    or (turma is null and criado_por = auth.uid() and eh_membro(escola))
  );
drop policy if exists alunos_criar on public.alunos;
create policy alunos_criar on public.alunos for insert to authenticated
  with check (
    criado_por = auth.uid() and eh_membro(escola) and turma_da_escola(turma, escola)
    and (turma is null or leciona(turma))
  );
drop policy if exists alunos_editar on public.alunos;
create policy alunos_editar on public.alunos for update to authenticated
  using ((turma is not null and leciona(turma)) or (turma is null and criado_por = auth.uid()))
  with check (
    eh_membro(escola) and turma_da_escola(turma, escola) and (turma is null or leciona(turma))
  );
drop policy if exists alunos_excluir on public.alunos;
create policy alunos_excluir on public.alunos for delete to authenticated
  using ((turma is not null and leciona(turma)) or (turma is null and criado_por = auth.uid()));

drop policy if exists anotacoes_acesso on public.anotacoes_aluno;
create policy anotacoes_acesso on public.anotacoes_aluno for all to authenticated
  using (pode_ver_aluno(aluno)) with check (pode_ver_aluno(aluno) and autor = auth.uid());

drop policy if exists participacoes_acesso on public.participacoes;
create policy participacoes_acesso on public.participacoes for all to authenticated
  using (pode_ver_aluno(aluno)) with check (pode_ver_aluno(aluno));

drop policy if exists planejamentos_ver on public.planejamentos;
create policy planejamentos_ver on public.planejamentos for select to authenticated
  using (professor = auth.uid() or eh_gestor(escola));
drop policy if exists planejamentos_criar on public.planejamentos;
create policy planejamentos_criar on public.planejamentos for insert to authenticated
  with check (
    professor = auth.uid() and eh_membro(escola) and turma_da_escola(turma, escola)
    and (turma is null or leciona(turma))
  );
drop policy if exists planejamentos_editar on public.planejamentos;
create policy planejamentos_editar on public.planejamentos for update to authenticated
  using (professor = auth.uid()) with check (professor = auth.uid() and eh_membro(escola));
drop policy if exists planejamentos_excluir on public.planejamentos;
create policy planejamentos_excluir on public.planejamentos for delete to authenticated
  using (professor = auth.uid());

drop policy if exists usos_ia_ver on public.usos_ia;
create policy usos_ia_ver on public.usos_ia for select to authenticated
  using (usuario = auth.uid() or eh_gestor(escola) or eh_admin());
drop policy if exists usos_ia_criar on public.usos_ia;
create policy usos_ia_criar on public.usos_ia for insert to authenticated
  with check (usuario = auth.uid() and eh_membro(escola));

drop policy if exists registro_ver on public.registro_acessos;
create policy registro_ver on public.registro_acessos for select to authenticated
  using (eh_gestor(escola) or eh_admin());
drop policy if exists registro_criar on public.registro_acessos;
create policy registro_criar on public.registro_acessos for insert to authenticated
  with check (usuario = auth.uid() and eh_membro(escola));

create or replace function public.resumo_escola(p_escola uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  inicio_mes timestamptz := date_trunc('month', now());
begin
  if not (eh_gestor(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return json_build_object(
    'professores', (select count(*) from vinculos where escola = p_escola and papel = 'professor' and ativo),
    'turmas', (select count(*) from turmas where escola = p_escola and ativa),
    'alunos', (select count(*) from alunos where escola = p_escola),
    'alunos_com_necessidades', (
      select count(*) from alunos
      where escola = p_escola and (cardinality(necessidades) > 0 or cardinality(diagnosticos) > 0)
    ),
    'planejamentos_mes', (select count(*) from planejamentos where escola = p_escola and criado_em >= inicio_mes),
    'usos_ia_mes', (select count(*) from usos_ia where escola = p_escola and criado_em >= inicio_mes)
  );
end;
$$;

create or replace function public.resumo_turmas(p_escola uuid)
returns table (
  turma uuid,
  nome text,
  serie text,
  alunos bigint,
  alunos_com_necessidades bigint,
  professores bigint,
  planejamentos bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (eh_gestor(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  select t.id, t.nome, t.serie,
    (select count(*) from alunos a where a.turma = t.id),
    (select count(*) from alunos a where a.turma = t.id
       and (cardinality(a.necessidades) > 0 or cardinality(a.diagnosticos) > 0)),
    (select count(*) from turma_professores tp where tp.turma = t.id),
    (select count(*) from planejamentos p where p.turma = t.id)
  from turmas t
  where t.escola = p_escola
  order by t.nome;
end;
$$;

revoke execute on function public.resumo_escola(uuid) from anon;
revoke execute on function public.resumo_turmas(uuid) from anon;

insert into public.perfis (id, nome, email)
select u.id, coalesce(u.raw_user_meta_data ->> 'nome', ''), u.email from auth.users u
on conflict (id) do nothing;

insert into public.admins_lume (usuario)
select u.id from auth.users u where lower(u.email) = any (public.emails_admin_lume())
on conflict do nothing;

insert into public.escolas (nome, plano)
select 'Escola Piloto', 'piloto'
where not exists (select 1 from public.escolas where nome = 'Escola Piloto');
