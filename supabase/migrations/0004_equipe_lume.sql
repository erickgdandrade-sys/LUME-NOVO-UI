alter table public.admins_lume
  add column if not exists adicionado_por uuid references auth.users (id) on delete set null;

create table if not exists public.convites_admin (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (char_length(email) <= 200),
  convidado_por uuid references auth.users (id) on delete set null,
  criado_em     timestamptz not null default now(),
  aceito_em     timestamptz
);
create unique index if not exists convites_admin_pendente_idx
  on public.convites_admin (lower(email)) where aceito_em is null;

insert into public.convites_admin (email)
select 'erickgdandrade@gmail.com'
where not exists (
    select 1 from public.admins_lume a join auth.users u on u.id = a.usuario
    where lower(u.email) = 'erickgdandrade@gmail.com'
  )
  and not exists (
    select 1 from public.convites_admin
    where lower(email) = 'erickgdandrade@gmail.com' and aceito_em is null
  );

create or replace function public.emails_admin_lume() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(lower(email)), '{}') from convites_admin where aceito_em is null;
$$;

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

  update convites set aceito_em = now()
  where lower(email) = lower(new.email) and aceito_em is null;

  return new;
end;
$$;

create or replace function public.manter_um_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from admins_lume) <= 1 then
    raise exception 'O Lume precisa ter pelo menos um Admin.';
  end if;
  return old;
end;
$$;

drop trigger if exists manter_um_admin on public.admins_lume;
create trigger manter_um_admin
  before delete on public.admins_lume
  for each row execute function public.manter_um_admin();

alter table public.convites_admin enable row level security;
revoke all on public.convites_admin from anon, authenticated;
grant select on public.convites_admin to authenticated;

drop policy if exists admins_ver on public.admins_lume;
create policy admins_ver on public.admins_lume for select to authenticated
  using (usuario = auth.uid() or public.eh_admin());

drop policy if exists "admin vê convites de admin" on public.convites_admin;
create policy "admin vê convites de admin" on public.convites_admin
  for select to authenticated using (public.eh_admin());

revoke execute on function public.emails_admin_lume() from public, anon, authenticated;
