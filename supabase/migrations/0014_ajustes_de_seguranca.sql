revoke execute on function public.resumo_escola(uuid) from public, anon;
revoke execute on function public.resumo_turmas(uuid) from public, anon;
grant execute on function public.resumo_escola(uuid) to authenticated;
grant execute on function public.resumo_turmas(uuid) to authenticated;

revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.eh_gestor(uuid) from public, anon;
revoke execute on function public.eh_membro(uuid) from public, anon;
revoke execute on function public.leciona(uuid) from public, anon;
revoke execute on function public.pode_ver_aluno(uuid) from public, anon;
revoke execute on function public.turma_da_escola(uuid, uuid) from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_gestor(uuid) to authenticated;
grant execute on function public.eh_membro(uuid) to authenticated;
grant execute on function public.leciona(uuid) to authenticated;
grant execute on function public.pode_ver_aluno(uuid) to authenticated;
grant execute on function public.turma_da_escola(uuid, uuid) to authenticated;

drop policy if exists anotacoes_acesso on public.anotacoes_aluno;
drop policy if exists anotacoes_ver on public.anotacoes_aluno;
create policy anotacoes_ver on public.anotacoes_aluno for select to authenticated
  using (pode_ver_aluno(aluno));
drop policy if exists anotacoes_criar on public.anotacoes_aluno;
create policy anotacoes_criar on public.anotacoes_aluno for insert to authenticated
  with check (pode_ver_aluno(aluno) and autor = auth.uid());
drop policy if exists anotacoes_excluir on public.anotacoes_aluno;
create policy anotacoes_excluir on public.anotacoes_aluno for delete to authenticated
  using (autor = auth.uid() and pode_ver_aluno(aluno));
revoke update on public.anotacoes_aluno from authenticated;

drop policy if exists vinculos_criar on public.vinculos;
create policy vinculos_criar on public.vinculos for insert to authenticated
  with check (eh_admin());
revoke update on public.vinculos from authenticated;
grant update (ativo, teto_creditos) on public.vinculos to authenticated;

revoke update on public.planejamentos from authenticated;
grant update (titulo) on public.planejamentos to authenticated;
