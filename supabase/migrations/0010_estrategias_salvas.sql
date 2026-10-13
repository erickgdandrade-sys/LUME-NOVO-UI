alter table public.progresso_professor
  add column if not exists estrategias_salvas text[] not null default '{}';

grant update (estrategias_salvas) on public.progresso_professor to authenticated;
