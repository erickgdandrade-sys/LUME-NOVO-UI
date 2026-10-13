alter table public.escolas
  add column if not exists uf              text check (char_length(uf) <= 2),
  add column if not exists telefone        text check (char_length(telefone) <= 30),
  add column if not exists email_contato   text check (char_length(email_contato) <= 120),
  add column if not exists inep            text check (char_length(inep) <= 12),
  add column if not exists linha_superior  text check (char_length(linha_superior) <= 160),
  add column if not exists logo_secundario text check (char_length(logo_secundario) <= 300000);

alter table public.escolas drop constraint if exists escolas_logo_tamanho;
alter table public.escolas add constraint escolas_logo_tamanho check (char_length(logo_url) <= 300000);
alter table public.escolas drop constraint if exists escolas_textos_tamanho;
alter table public.escolas add constraint escolas_textos_tamanho check (
  char_length(nome) <= 160 and char_length(cidade) <= 80 and char_length(endereco) <= 200
);

revoke update on public.escolas from authenticated;
grant update (nome, cidade, endereco, responsaveis, logo_url, uf, telefone, email_contato, inep, linha_superior, logo_secundario)
  on public.escolas to authenticated;
