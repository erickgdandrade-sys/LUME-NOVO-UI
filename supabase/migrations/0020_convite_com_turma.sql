alter table public.convites
  add column if not exists turmas jsonb not null default '[]'::jsonb
    check (jsonb_typeof(turmas) = 'array' and jsonb_array_length(turmas) <= 20);

create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''), new.email)
  on conflict (id) do nothing;

  insert into admins_lume (usuario, adicionado_por)
  select new.id, c.convidado_por from convites_admin c
  where lower(c.email) = lower(new.email) and c.aceito_em is null
  order by c.criado_em limit 1
  on conflict do nothing;

  update convites_admin set aceito_em = now()
  where lower(email) = lower(new.email) and aceito_em is null;

  insert into vinculos (usuario, escola, papel)
  select new.id, c.escola, c.papel from convites c
  where lower(c.email) = lower(new.email) and c.aceito_em is null
  on conflict (usuario, escola, papel) do update set ativo = true;

  insert into turma_professores (turma, professor, disciplina)
  select t.id, new.id, nullif(trim(item ->> 'disciplina'), '')
  from convites c
  cross join lateral jsonb_array_elements(c.turmas) item
  join turmas t on t.id::text = item ->> 'turma' and t.escola = c.escola
  where lower(c.email) = lower(new.email) and c.aceito_em is null and c.papel = 'professor'
  on conflict (turma, professor) do nothing;

  update convites set aceito_em = now()
  where lower(email) = lower(new.email) and aceito_em is null;

  return new;
end;
$$;
