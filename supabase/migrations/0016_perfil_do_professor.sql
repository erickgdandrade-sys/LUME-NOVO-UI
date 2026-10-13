alter table public.perfis
  add column if not exists apelido     text check (char_length(apelido) <= 40),
  add column if not exists funcao      text check (char_length(funcao) <= 60),
  add column if not exists telefone    text check (char_length(telefone) <= 30),
  add column if not exists formacao    text check (char_length(formacao) <= 300),
  add column if not exists disciplinas text[] not null default '{}' check (cardinality(disciplinas) <= 15),
  add column if not exists series      text[] not null default '{}' check (cardinality(series) <= 15),
  add column if not exists foto        text check (char_length(foto) <= 120000);

alter table public.perfis drop constraint if exists perfis_nome_tamanho;
alter table public.perfis add constraint perfis_nome_tamanho check (char_length(nome) <= 120);

grant update (nome, ultimo_acesso, apelido, funcao, telefone, formacao, disciplinas, series, foto)
  on public.perfis to authenticated;

create or replace function public.ao_mudar_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update perfis set email = new.email where id = new.id;
  return new;
end;
$$;

revoke execute on function public.ao_mudar_email() from public, anon, authenticated;

drop trigger if exists ao_mudar_email on auth.users;
create trigger ao_mudar_email
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.ao_mudar_email();
