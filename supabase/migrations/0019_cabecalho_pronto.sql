alter table public.escolas
  add column if not exists cabecalho_modo   text not null default 'campos' check (cabecalho_modo in ('campos', 'pronto')),
  add column if not exists cabecalho_imagem text check (char_length(cabecalho_imagem) <= 1500000);

grant update (cabecalho_modo, cabecalho_imagem) on public.escolas to authenticated;
