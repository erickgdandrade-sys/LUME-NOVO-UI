create table if not exists public.uso_chat_lumis (
  usuario  uuid not null references auth.users (id) on delete cascade,
  dia      date not null,
  perguntas int not null default 0 check (perguntas >= 0),
  primary key (usuario, dia)
);

alter table public.uso_chat_lumis enable row level security;
revoke all on public.uso_chat_lumis from anon, authenticated;
grant select on public.uso_chat_lumis to authenticated;

drop policy if exists "cada um vê o próprio uso do chat" on public.uso_chat_lumis;
create policy "cada um vê o próprio uso do chat" on public.uso_chat_lumis
  for select to authenticated using (usuario = auth.uid());

create or replace function public.contar_pergunta_lumis(p_usuario uuid, p_limite int) returns json
language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  atual int;
begin
  insert into uso_chat_lumis (usuario, dia, perguntas) values (p_usuario, hoje, 0)
  on conflict (usuario, dia) do nothing;
  select perguntas into atual from uso_chat_lumis where usuario = p_usuario and dia = hoje for update;
  if atual >= p_limite then
    return json_build_object('ok', false, 'usadas', atual, 'limite', p_limite);
  end if;
  update uso_chat_lumis set perguntas = perguntas + 1 where usuario = p_usuario and dia = hoje;
  return json_build_object('ok', true, 'usadas', atual + 1, 'limite', p_limite);
end;
$$;

revoke execute on function public.contar_pergunta_lumis(uuid, int) from public, anon, authenticated;
