create table if not exists public.provas (
  id            uuid primary key default gen_random_uuid(),
  escola        uuid not null references public.escolas (id) on delete cascade,
  professor     uuid not null references auth.users (id) on delete cascade,
  titulo        text not null check (char_length(titulo) <= 200),
  conteudo      jsonb not null check (octet_length(conteudo::text) <= 500000),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists provas_professor_idx on public.provas (professor, escola, criado_em desc);

drop trigger if exists provas_atualizada on public.provas;
create trigger provas_atualizada
  before update on public.provas
  for each row execute function public.marcar_atualizacao();

alter table public.provas enable row level security;
revoke all on public.provas from anon, authenticated;
grant select, insert, delete on public.provas to authenticated;
grant update (titulo, conteudo) on public.provas to authenticated;

drop policy if exists "professor vê as próprias provas" on public.provas;
create policy "professor vê as próprias provas" on public.provas
  for select to authenticated using (professor = auth.uid());
drop policy if exists "professor cria provas na escola dele" on public.provas;
create policy "professor cria provas na escola dele" on public.provas
  for insert to authenticated with check (professor = auth.uid() and eh_membro(escola));
drop policy if exists "professor edita as próprias provas" on public.provas;
create policy "professor edita as próprias provas" on public.provas
  for update to authenticated using (professor = auth.uid()) with check (professor = auth.uid());
drop policy if exists "professor apaga as próprias provas" on public.provas;
create policy "professor apaga as próprias provas" on public.provas
  for delete to authenticated using (professor = auth.uid());
