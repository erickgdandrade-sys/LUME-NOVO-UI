-- O gestor vê o contrato e as mensalidades da própria escola, só para leitura.
-- As observações internas da equipe da Lume ficam de fora.

create or replace function public.mensalidade_da_escola(p_escola uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  contrato json;
  cobrancas json;
begin
  if not (eh_gestor(p_escola) or eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select json_build_object(
    'valor_mensal', c.valor_mensal,
    'dia_vencimento', c.dia_vencimento,
    'valor_credito_extra', c.valor_credito_extra,
    'inicio', c.inicio,
    'ativo', c.ativo
  ) into contrato
  from contratos c where c.escola = p_escola;

  select coalesce(json_agg(x order by x.competencia desc), '[]'::json) into cobrancas
  from (
    select b.id, b.competencia, b.vencimento, b.valor, b.creditos_extra, b.valor_extra,
           b.situacao, b.pago_em, b.forma
    from cobrancas b
    where b.escola = p_escola and b.situacao <> 'cancelada'
    order by b.competencia desc
    limit 12
  ) x;

  return json_build_object('contrato', contrato, 'cobrancas', cobrancas);
end;
$$;

revoke execute on function public.mensalidade_da_escola(uuid) from public, anon;
grant execute on function public.mensalidade_da_escola(uuid) to authenticated;
