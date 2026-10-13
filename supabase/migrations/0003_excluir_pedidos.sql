grant delete on public.pedidos_demonstracao to authenticated;

drop policy if exists "admin exclui pedidos" on public.pedidos_demonstracao;
create policy "admin exclui pedidos" on public.pedidos_demonstracao
  for delete to authenticated using (public.eh_admin());
