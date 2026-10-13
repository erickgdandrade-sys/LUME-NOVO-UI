create or replace function public.painel_gestor(p_escola uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  inicio timestamptz := inicio_do_mes();
begin
  if not eh_gestor(p_escola) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return json_build_object(
    'meses', (
      select coalesce(json_agg(m order by m.mes), '[]'::json) from (
        select
          to_char(g.mes, 'YYYY-MM-DD') as mes,
          (select coalesce(sum(u.creditos), 0) from usos_ia u
           where u.escola = p_escola
             and u.criado_em >= (g.mes::timestamp at time zone 'America/Sao_Paulo')
             and u.criado_em < ((g.mes + interval '1 month')::timestamp at time zone 'America/Sao_Paulo')) as usos_ia,
          (select count(*) from planejamentos pl
           where pl.escola = p_escola
             and pl.criado_em >= (g.mes::timestamp at time zone 'America/Sao_Paulo')
             and pl.criado_em < ((g.mes + interval '1 month')::timestamp at time zone 'America/Sao_Paulo')) as planejamentos,
          (select round(avg(p.participacao))::int from participacoes p
           join alunos a on a.id = p.aluno
           where a.escola = p_escola and p.mes = g.mes) as participacao_media
        from generate_series(mes_atual() - interval '5 months', mes_atual(), interval '1 month') as g(mes)
      ) m
    ),
    'professores', (
      select coalesce(json_agg(pr order by pr.nome), '[]'::json) from (
        select
          v.usuario,
          coalesce(nullif(pe.nome, ''), pe.email, 'Professor') as nome,
          pe.email,
          v.ativo,
          pe.ultimo_acesso,
          (select count(*) from turma_professores tp join turmas t on t.id = tp.turma
           where tp.professor = v.usuario and t.escola = p_escola and t.ativa) as turmas,
          (select count(distinct a.id) from alunos a
           join turma_professores tp on tp.turma = a.turma
           where tp.professor = v.usuario and a.escola = p_escola) as alunos,
          (select count(*) from planejamentos pl
           where pl.professor = v.usuario and pl.escola = p_escola and pl.criado_em >= inicio) as planejamentos_mes,
          (select coalesce(sum(u.creditos), 0) from usos_ia u
           where u.usuario = v.usuario and u.escola = p_escola and u.criado_em >= inicio) as creditos_mes,
          (select coalesce((select count(*) from jsonb_object_keys(pp.licoes)), 0)
           from progresso_professor pp where pp.usuario = v.usuario) as licoes_concluidas
        from vinculos v
        left join perfis pe on pe.id = v.usuario
        where v.escola = p_escola and v.papel = 'professor'
      ) pr
    ),
    'turmas_sem_professor', (
      select count(*) from turmas t
      where t.escola = p_escola and t.ativa
        and not exists (select 1 from turma_professores tp where tp.turma = t.id)
    ),
    'alunos_sem_registro_mes', (
      select count(*) from alunos a
      where a.escola = p_escola and a.turma is not null
        and not exists (select 1 from participacoes p where p.aluno = a.id and p.mes = mes_atual())
    )
  );
end;
$$;

revoke execute on function public.painel_gestor(uuid) from public, anon;
