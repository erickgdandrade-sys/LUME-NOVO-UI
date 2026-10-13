create or replace function public.alunos_da_escola(p_escola uuid)
returns table (
  id                 uuid,
  nome               text,
  idade              int,
  serie              text,
  turma              uuid,
  turma_nome         text,
  suporte            text,
  perfil_completo    boolean,
  participacao_mes   int,
  atualizado_em      timestamptz,
  exemplo            boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_gestor(p_escola) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
    select a.id, a.nome, a.idade, a.serie, a.turma, t.nome, a.suporte,
           (length(trim(a.resumo)) > 0 and cardinality(a.funcionam) > 0),
           (select p.participacao from participacoes p
            where p.aluno = a.id and p.mes = mes_atual()),
           a.atualizado_em, a.exemplo
    from alunos a
    join turmas t on t.id = a.turma
    where a.escola = p_escola
    order by t.nome, a.nome;
end;
$$;

create or replace function public.alunos_sem_turma(p_escola uuid) returns int
language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_gestor(p_escola) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return (select count(*) from alunos where escola = p_escola and turma is null);
end;
$$;

revoke execute on function public.alunos_da_escola(uuid) from public, anon;
revoke execute on function public.alunos_sem_turma(uuid) from public, anon;
