create table if not exists public.uso_chat_visitantes (
  origem    text not null check (char_length(origem) <= 64),
  dia       date not null,
  perguntas int not null default 0 check (perguntas >= 0),
  primary key (origem, dia)
);

alter table public.uso_chat_visitantes enable row level security;
revoke all on public.uso_chat_visitantes from anon, authenticated;

create or replace function public.contar_pergunta_visitante(p_origem text, p_limite int) returns json
language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  atual int;
begin
  delete from uso_chat_visitantes where dia < hoje - 7;
  insert into uso_chat_visitantes (origem, dia, perguntas) values (p_origem, hoje, 0)
  on conflict (origem, dia) do nothing;
  select perguntas into atual from uso_chat_visitantes where origem = p_origem and dia = hoje for update;
  if atual >= p_limite then
    return json_build_object('ok', false, 'usadas', atual, 'limite', p_limite);
  end if;
  update uso_chat_visitantes set perguntas = perguntas + 1 where origem = p_origem and dia = hoje;
  return json_build_object('ok', true, 'usadas', atual + 1, 'limite', p_limite);
end;
$$;

revoke execute on function public.contar_pergunta_visitante(text, int) from public, anon, authenticated;
