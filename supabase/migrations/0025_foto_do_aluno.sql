-- Foto do aluno, opcional. Fica guardada já reduzida (imagem pequena, até ~110 KB).
-- Segue as mesmas regras de quem pode ver e editar o aluno.

alter table public.alunos add column if not exists foto text;

alter table public.alunos drop constraint if exists alunos_foto_valida;
alter table public.alunos add constraint alunos_foto_valida
  check (foto is null or (foto like 'data:image/%' and char_length(foto) <= 150000));
