alter table public.alunos add column if not exists exemplo boolean not null default false;

create table if not exists public.progresso_professor (
  usuario       uuid primary key references auth.users (id) on delete cascade,
  xp            int not null default 0 check (xp >= 0),
  dias          date[] not null default '{}',
  respostas     int not null default 0 check (respostas >= 0),
  acertos       int not null default 0 check (acertos >= 0),
  licoes        jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

drop trigger if exists progresso_professor_atualizado on public.progresso_professor;
create trigger progresso_professor_atualizado
  before update on public.progresso_professor
  for each row execute function public.marcar_atualizacao();

alter table public.progresso_professor enable row level security;
revoke all on public.progresso_professor from anon, authenticated;
grant select, insert, update (usuario, xp, dias, respostas, acertos, licoes) on public.progresso_professor to authenticated;

drop policy if exists "cada um vê o próprio progresso" on public.progresso_professor;
create policy "cada um vê o próprio progresso" on public.progresso_professor
  for select to authenticated using (usuario = auth.uid());
drop policy if exists "cada um cria o próprio progresso" on public.progresso_professor;
create policy "cada um cria o próprio progresso" on public.progresso_professor
  for insert to authenticated with check (usuario = auth.uid());
drop policy if exists "cada um atualiza o próprio progresso" on public.progresso_professor;
create policy "cada um atualiza o próprio progresso" on public.progresso_professor
  for update to authenticated using (usuario = auth.uid()) with check (usuario = auth.uid());
