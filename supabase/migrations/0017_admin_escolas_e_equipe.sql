drop policy if exists admins_ver on public.admins_lume;
create policy admins_ver on public.admins_lume for select to authenticated
  using (usuario = auth.uid() or eh_admin());

create or replace function public.definir_escola_ativa(p_escola uuid, p_ativa boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update escolas set ativa = p_ativa where id = p_escola;
  if not found then
    raise exception 'escola não encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.definir_escola_ativa(uuid, boolean) from public, anon;
grant execute on function public.definir_escola_ativa(uuid, boolean) to authenticated;

drop policy if exists escolas_excluir on public.escolas;
create policy escolas_excluir on public.escolas for delete to authenticated
  using (eh_admin() and not ativa);
