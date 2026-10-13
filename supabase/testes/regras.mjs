import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated; grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);
const pastaMigracoes = new URL("../migrations/", import.meta.url);
for (const arquivo of readdirSync(pastaMigracoes)
  .filter((a) => a.endsWith(".sql"))
  .sort()) {
  await db.exec(readFileSync(new URL(arquivo, pastaMigracoes), "utf8"));
}

async function conta(email, nome) {
  await db.exec("reset role");
  const r = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, { nome }],
  );
  return r.rows[0].id;
}
async function como(id) {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  await db.exec("set role authenticated");
}
let ok = 0;
let falhas = 0;
async function espera(descricao, deveFuncionar, fn) {
  let funcionou;
  try {
    const r = await fn();
    funcionou = typeof r === "boolean" ? r : true;
  } catch {
    funcionou = false;
  }
  const certo = funcionou === deveFuncionar;
  if (certo) ok++;
  else falhas++;
  console.log(
    `${certo ? "OK  " : "ERRO"}  ${descricao} -> ${funcionou ? "permitido" : "bloqueado"}`,
  );
}
const linhas = async (q, p) => (await db.query(q, p)).rows;

const admin = await conta("erickgdandrade@gmail.com", "Erick");
await como(admin);
await espera(
  "Admin e reconhecido como Admin Lume",
  true,
  async () => (await linhas("select eh_admin() a"))[0].a,
);
const [escA] = await linhas("insert into escolas (nome) values ('Escola A') returning id");
const [escB] = await linhas("insert into escolas (nome) values ('Escola B') returning id");
await linhas(
  "insert into convites (escola,email,papel,convidado_por) values ($1,'gestora.a@x.com','gestor',$3),($2,'gestor.b@x.com','gestor',$3)",
  [escA.id, escB.id, admin],
);

const gestoraA = await conta("gestora.a@x.com", "Gestora A");
const gestorB = await conta("gestor.b@x.com", "Gestor B");

await como(gestoraA);
await espera(
  "Gestora A (convidada) virou gestora da Escola A",
  true,
  async () => (await linhas("select eh_gestor($1) g", [escA.id]))[0].g,
);
await espera("Gestora A convida PROFESSOR", true, () =>
  linhas(
    "insert into convites (escola,email,papel,convidado_por) values ($1,'prof.maria@x.com','professor',$2)",
    [escA.id, gestoraA],
  ),
);
await espera("Gestora A tenta convidar outro GESTOR", false, () =>
  linhas(
    "insert into convites (escola,email,papel,convidado_por) values ($1,'intruso@x.com','gestor',$2)",
    [escA.id, gestoraA],
  ),
);
await espera("Gestora A tenta criar escola", false, () =>
  linhas("insert into escolas (nome) values ('Escola Falsa')"),
);
await espera("Gestora A tenta mudar o plano contratado", false, () =>
  linhas("update escolas set plano='premium' where id=$1", [escA.id]),
);
await espera(
  "Gestora A edita o endereco da propria escola",
  true,
  async () =>
    (await linhas("update escolas set endereco='Rua 1' where id=$1 returning id", [escA.id]))
      .length === 1,
);
const [turma] = await linhas(
  "insert into turmas (escola,nome,serie) values ($1,'4o Ano A','4o ano') returning id",
  [escA.id],
);

const maria = await conta("prof.maria@x.com", "Maria");
const intruso = await conta("intruso@x.com", "Intruso");

await como(gestoraA);
await espera("Gestora A vincula a professora Maria a turma", true, () =>
  linhas("insert into turma_professores (turma,professor,disciplina) values ($1,$2,'Portugues')", [
    turma.id,
    maria,
  ]),
);
await espera("Gestora A tenta vincular quem nao e professor da escola", false, () =>
  linhas("insert into turma_professores (turma,professor) values ($1,$2)", [turma.id, intruso]),
);

await como(maria);
await espera(
  "Maria ve a turma dela",
  true,
  async () => (await linhas("select * from turmas")).length === 1,
);
await espera("Maria tenta criar turma", false, () =>
  linhas("insert into turmas (escola,nome) values ($1,'Turma pirata')", [escA.id]),
);
const [aluno] = await linhas(
  "insert into alunos (escola,turma,nome,necessidades,diagnosticos,criado_por) values ($1,$2,'Lucas A.','{Apoio visual}','{TEA}',$3) returning id",
  [escA.id, turma.id, maria],
);
await espera(
  "Maria ve o perfil do aluno da turma dela",
  true,
  async () => (await linhas("select * from alunos")).length === 1,
);
await espera("Maria registra participacao do aluno", true, () =>
  linhas(
    "insert into participacoes (aluno,mes,participacao,registrado_por) values ($1,'2026-09-01',70,$2)",
    [aluno.id, maria],
  ),
);
await espera("Maria salva um planejamento da turma", true, () =>
  linhas(
    "insert into planejamentos (escola,turma,professor,titulo,plano_original,resultado) values ($1,$2,$3,'Fracoes','Aula de fracoes','{}')",
    [escA.id, turma.id, maria],
  ),
);
await espera("Maria registra uso da IA direto pelo navegador (deve ser bloqueado)", false, () =>
  linhas("insert into usos_ia (escola,usuario) values ($1,$2)", [escA.id, maria]),
);
await db.exec("reset role");
await linhas("select consumir_creditos($1::uuid,$2::uuid,1,'adaptar_aula')", [escA.id, maria]);
await como(maria);
await espera("Maria tenta se promover a gestora", false, () =>
  linhas("insert into vinculos (usuario,escola,papel) values ($1,$2,'gestor')", [maria, escA.id]),
);
await espera("Maria tenta virar Admin Lume", false, () =>
  linhas("insert into admins_lume (usuario) values ($1)", [maria]),
);

await como(gestoraA);
await espera(
  "Gestora A ve o perfil detalhado do aluno (deve ser bloqueado)",
  false,
  async () => (await linhas("select * from alunos")).length > 0,
);
await espera(
  "Gestora A ve o planejamento da Maria",
  true,
  async () => (await linhas("select * from planejamentos")).length === 1,
);
const [res] = await linhas("select resumo_escola($1) r", [escA.id]);
console.log("      resumo da Escola A:", JSON.stringify(res.r));
await espera(
  "Resumo: 1 professor, 1 aluno com necessidades, 1 uso da IA",
  true,
  async () =>
    res.r.alunos_com_necessidades === 1 && res.r.usos_ia_mes === 1 && res.r.professores === 1,
);
await espera(
  "Gestora A ve nome/e-mail da Maria (lista de professores)",
  true,
  async () => (await linhas("select * from perfis where id=$1", [maria])).length === 1,
);
await espera(
  "Gestora A desativa a professora Maria",
  true,
  async () =>
    (
      await linhas("update vinculos set ativo=false where usuario=$1 and escola=$2 returning id", [
        maria,
        escA.id,
      ])
    ).length === 1,
);

await como(maria);
await espera(
  "Maria desativada ainda ve o aluno (deve ser bloqueado)",
  false,
  async () => (await linhas("select * from alunos")).length > 0,
);

await como(gestorB);
await espera(
  "Gestor B ve turmas da Escola A (deve ser bloqueado)",
  false,
  async () => (await linhas("select * from turmas")).length > 0,
);
await espera(
  "Gestor B ve planejamentos da Escola A (deve ser bloqueado)",
  false,
  async () => (await linhas("select * from planejamentos")).length > 0,
);
await espera("Gestor B pede o resumo da Escola A (deve ser bloqueado)", false, () =>
  linhas("select resumo_escola($1)", [escA.id]),
);
await espera(
  "Gestor B ve o perfil da Maria (deve ser bloqueado)",
  false,
  async () => (await linhas("select * from perfis where id=$1", [maria])).length > 0,
);

await como(admin);
await espera(
  "Admin Lume le perfis de alunos (deve ser bloqueado)",
  false,
  async () => (await linhas("select * from alunos")).length > 0,
);
await espera("Admin Lume ve o resumo (numeros) da escola", true, () =>
  linhas("select resumo_escola($1)", [escA.id]),
);

await db.exec("reset role");
await db.exec("set role anon");
await espera("Visitante sem login le escolas (deve ser bloqueado)", false, () =>
  linhas("select * from escolas"),
);

await db.exec("reset role");
const [pedido] = await linhas(
  "insert into pedidos_demonstracao (nome,email,telefone,escola,cargo,estado,cidade) values ('Ana Souza','ana@x.com','(48) 99999-0000','Colégio X','Diretor(a)','SC','Criciúma') returning id",
);
await db.exec("set role anon");
await espera("Visitante sem login grava pedido direto no banco (deve ser bloqueado)", false, () =>
  linhas(
    "insert into pedidos_demonstracao (nome,email,telefone,escola,cargo,estado,cidade) values ('Robo','r@x.com','1','X','Y','SC','Z')",
  ),
);
await espera("Visitante sem login le pedidos (deve ser bloqueado)", false, () =>
  linhas("select * from pedidos_demonstracao"),
);
await como(maria);
await espera(
  "Professora le pedidos de demonstracao (nao ve nenhum)",
  true,
  async () => (await linhas("select * from pedidos_demonstracao")).length === 0,
);
await como(gestoraA);
await espera(
  "Gestora muda a situacao de um pedido (nao muda nada)",
  true,
  async () =>
    (
      await linhas("update pedidos_demonstracao set situacao='agendado' where id=$1 returning id", [
        pedido.id,
      ])
    ).length === 0,
);
await espera(
  "Gestora le o e-mail que recebe os pedidos (nao ve)",
  true,
  async () => (await linhas("select * from configuracoes")).length === 0,
);
await como(admin);
await espera(
  "Admin Lume ve os pedidos",
  true,
  async () => (await linhas("select * from pedidos_demonstracao")).length === 1,
);
await espera(
  "Admin Lume marca o pedido como contatado",
  true,
  async () =>
    (
      await linhas(
        "update pedidos_demonstracao set situacao='contatado', observacao='Ligou dia 1' where id=$1 returning id",
        [pedido.id],
      )
    ).length === 1,
);
await espera("Admin Lume troca o nome da escola do pedido (deve ser bloqueado)", false, () =>
  linhas("update pedidos_demonstracao set escola='Outra' where id=$1", [pedido.id]),
);
await espera(
  "Admin Lume troca o e-mail que recebe os pedidos",
  true,
  async () =>
    (
      await linhas(
        `update configuracoes set valor='["a@x.com","b@x.com"]' where chave='emails_pedidos_demonstracao' returning chave`,
      )
    ).length === 1,
);

await como(gestoraA);
await espera(
  "Gestora exclui um pedido (nao exclui nada)",
  true,
  async () =>
    (await linhas("delete from pedidos_demonstracao where id=$1 returning id", [pedido.id]))
      .length === 0,
);
await como(admin);
await espera(
  "Admin Lume exclui um pedido",
  true,
  async () =>
    (await linhas("delete from pedidos_demonstracao where id=$1 returning id", [pedido.id]))
      .length === 1,
);

await db.exec("reset role");
await linhas("insert into convites_admin (email, convidado_por) values ('nova.admin@x.com', $1)", [
  admin,
]);
const novaAdmin = await conta("Nova.Admin@x.com", "Nova");
await como(novaAdmin);
await espera(
  "Convidada para Admin vira Admin ao criar a conta",
  true,
  async () => (await linhas("select eh_admin() a"))[0].a,
);
await espera(
  "Admin ve a equipe inteira (2 Admins)",
  true,
  async () => (await linhas("select * from admins_lume")).length === 2,
);
await como(gestoraA);
await espera(
  "Gestora ve a lista de Admins (so ve vazio)",
  true,
  async () => (await linhas("select * from admins_lume")).length === 0,
);
await espera("Gestora se coloca como Admin (deve ser bloqueado)", false, () =>
  linhas("insert into admins_lume (usuario) values ($1)", [gestoraA]),
);
await espera("Gestora cria convite de Admin (deve ser bloqueado)", false, () =>
  linhas("insert into convites_admin (email) values ('eu@x.com')"),
);
await como(admin);
await espera(
  "Admin remove Admin direto pelo navegador (so pelo servidor)",
  true,
  async () =>
    (await linhas("delete from admins_lume where usuario=$1 returning usuario", [novaAdmin]))
      .length === 0,
);
await db.exec("reset role");
await espera(
  "Servidor remove a segunda Admin",
  true,
  async () =>
    (await linhas("delete from admins_lume where usuario=$1 returning usuario", [novaAdmin]))
      .length === 1,
);
await espera("Servidor remove o ultimo Admin (deve ser bloqueado)", false, () =>
  linhas("delete from admins_lume where usuario=$1", [admin]),
);

await db.exec("reset role");
await linhas("insert into convites_admin (email) values ('segredo@x.com')");
await db.exec("set role anon");
await espera("Visitante le a lista de convites de Admin (deve ser bloqueado)", false, () =>
  linhas("select emails_admin_lume()"),
);
await como(gestoraA);
await espera("Gestora le a lista de convites de Admin (deve ser bloqueado)", false, () =>
  linhas("select emails_admin_lume()"),
);
await db.exec("reset role");
const [criada] = await linhas(
  "insert into auth.users (email) values ('segredo@x.com') returning id",
);
await espera(
  "Convite de Admin ainda funciona na criacao da conta",
  true,
  async () =>
    (await linhas("select 1 from admins_lume where usuario=$1", [criada.id])).length === 1,
);

await db.exec("reset role");
await linhas("update vinculos set ativo=true where usuario=$1 and escola=$2", [maria, escA.id]);
await como(gestoraA);
await espera(
  "Plano Piloto: gestora cria a 2a e a 3a turma",
  true,
  async () =>
    (
      await linhas(
        "insert into turmas (escola,nome) values ($1,'5o Ano'),($1,'6o Ano') returning id",
        [escA.id],
      )
    ).length === 2,
);
await espera("Plano Piloto: 4a turma ativa (deve ser bloqueado)", false, () =>
  linhas("insert into turmas (escola,nome) values ($1,'7o Ano')", [escA.id]),
);
await espera("Gestora muda o plano da escola (deve ser bloqueado)", false, () =>
  linhas("select definir_plano_escola($1::uuid,'rede',null,null)", [escA.id]),
);
await espera("Gestora muda o plano direto na tabela (deve ser bloqueado)", false, () =>
  linhas("update escolas set plano='rede' where id=$1", [escA.id]),
);
await espera("Gestora gasta credito pela funcao do servidor (deve ser bloqueado)", false, () =>
  linhas("select consumir_creditos($1::uuid,$2::uuid,1,'x')", [escA.id, maria]),
);
await como(admin);
await espera("Admin troca a escola para o plano Essencial", true, () =>
  linhas("select definir_plano_escola($1::uuid,'essencial',null,2)", [escA.id]),
);
await como(gestoraA);
await espera("Plano Essencial: 4a turma ativa", true, () =>
  linhas("insert into turmas (escola,nome) values ($1,'7o Ano')", [escA.id]),
);
await db.exec("reset role");
const consumir = async () =>
  (
    await linhas("select consumir_creditos($1::uuid,$2::uuid,1,'adaptar_aula') r", [escA.id, maria])
  )[0].r;
await espera("Servidor gasta o 2o credito (limite de 2)", true, async () => (await consumir()).ok);
await espera(
  "Servidor tenta o 3o credito: escola sem creditos",
  true,
  async () => (await consumir()).motivo === "escola_sem_creditos",
);
await como(admin);
await linhas("select definir_plano_escola($1::uuid,'essencial',null,null)", [escA.id]);
await como(gestoraA);
await espera(
  "Gestora define teto de 2 creditos para a Maria",
  true,
  async () =>
    (
      await linhas(
        "update vinculos set teto_creditos=2 where usuario=$1 and escola=$2 returning id",
        [maria, escA.id],
      )
    ).length === 1,
);
await db.exec("reset role");
await espera(
  "Maria no teto dela: credito negado",
  true,
  async () => (await consumir()).motivo === "professor_no_teto",
);
await como(maria);
await espera("Maria ve a situacao do plano dela", true, async () => {
  const r = (await linhas("select situacao_plano($1::uuid) s", [escA.id]))[0].s;
  return r.plano === "essencial" && r.meus_creditos_usados === 2 && r.meu_teto === 2;
});
await como(intruso);
await espera("Intruso ve a situacao do plano da Escola A (deve ser bloqueado)", false, () =>
  linhas("select situacao_plano($1::uuid)", [escA.id]),
);
await como(gestoraA);
await espera(
  "Gestora ve o uso de cada professor",
  true,
  async () => (await linhas("select * from uso_por_professor($1::uuid)", [escA.id])).length >= 1,
);
await espera(
  "Gestora altera o limite do plano para todas as escolas (nao altera)",
  true,
  async () =>
    (await linhas("update planos set creditos_mes=99999 where id='piloto' returning id")).length ===
    0,
);

await db.exec("reset role");
await linhas("update vinculos set teto_creditos=null where usuario=$1 and escola=$2", [
  maria,
  escA.id,
]);
await como(admin);
await linhas("select definir_plano_escola($1::uuid,'essencial',null,2)", [escA.id]);
await db.exec("reset role");
await espera(
  "Creditos do plano acabaram e o uso extra nao foi liberado",
  true,
  async () => (await consumir()).motivo === "escola_sem_creditos",
);
await como(maria);
await espera("Professora libera o uso extra (deve ser bloqueado)", false, () =>
  linhas("select liberar_uso_extra($1::uuid, 2)", [escA.id]),
);
await como(gestorB);
await espera("Gestor de outra escola libera o uso extra (deve ser bloqueado)", false, () =>
  linhas("select liberar_uso_extra($1::uuid, 2)", [escA.id]),
);
await como(gestoraA);
await espera("Gestora libera ate 2 creditos extras", true, () =>
  linhas("select liberar_uso_extra($1::uuid, 2)", [escA.id]),
);
await db.exec("reset role");
await espera("1o credito extra e marcado para cobranca", true, async () => {
  const r = await consumir();
  return r.ok && r.extra === true;
});
await espera("2o credito extra", true, async () => (await consumir()).ok);
await espera(
  "3o credito extra passa do combinado: bloqueado",
  true,
  async () => (await consumir()).motivo === "extra_esgotado",
);
await como(gestoraA);
await espera("Gestora ve 2 creditos extras usados no mes", true, async () => {
  const r = (await linhas("select situacao_plano($1::uuid) s", [escA.id]))[0].s;
  return r.extra_liberado === true && r.creditos_extra_usados === 2 && r.extra_limite === 2;
});
await espera("Gestora para o uso extra", true, () =>
  linhas("select encerrar_uso_extra($1::uuid)", [escA.id]),
);
await db.exec("reset role");
await espera(
  "Depois de parar, volta a bloquear",
  true,
  async () => (await consumir()).motivo === "escola_sem_creditos",
);
await como(gestoraA);
await espera("Gestora ve os extras de todas as escolas (deve ser bloqueado)", false, () =>
  linhas("select * from extras_por_escola(current_date)"),
);
await como(admin);
await espera("Admin ve os creditos extras a cobrar de cada escola", true, async () => {
  const r = await linhas("select * from extras_por_escola(mes_atual())");
  return r.length === 1 && Number(r[0].creditos_extra) === 2;
});

await como(maria);
await espera("Maria salva o proprio progresso da capacitacao", true, () =>
  linhas(
    'insert into progresso_professor (usuario, xp, licoes) values ($1, 50, \'{"introducao-1":{"total":4}}\')',
    [maria],
  ),
);
await espera("Maria grava progresso no nome de outra pessoa (deve ser bloqueado)", false, () =>
  linhas("insert into progresso_professor (usuario, xp) values ($1, 999)", [intruso]),
);
await espera(
  "Maria marca um aluno como exemplo",
  true,
  async () =>
    (
      await linhas(
        "insert into alunos (escola,nome,exemplo,criado_por) values ($1,'Exemplo','true',$2) returning id",
        [escA.id, maria],
      )
    ).length === 1,
);
await como(intruso);
await espera(
  "Intruso le o progresso da Maria (nao ve nada)",
  true,
  async () => (await linhas("select * from progresso_professor")).length === 0,
);
await como(gestoraA);
await espera(
  "Gestora le o progresso da Maria (nao ve nada)",
  true,
  async () => (await linhas("select * from progresso_professor")).length === 0,
);

await como(maria);
await espera(
  "Maria atualiza o progresso do jeito que o site salva (upsert)",
  true,
  async () =>
    (
      await linhas(
        "insert into progresso_professor (usuario, xp, dias, respostas, acertos, licoes) values ($1, 80, '{2026-10-01}', 3, 2, '{}') on conflict (usuario) do update set usuario = excluded.usuario, xp = excluded.xp, dias = excluded.dias, respostas = excluded.respostas, acertos = excluded.acertos, licoes = excluded.licoes returning xp",
        [maria],
      )
    )[0].xp === 80,
);
await espera("Maria registra participacao do jeito que o site salva (upsert)", true, () =>
  linhas(
    "insert into participacoes (aluno, mes, participacao, registrado_por) values ($1, '2026-09-01', 85, $2) on conflict (aluno, mes) do update set aluno = excluded.aluno, mes = excluded.mes, participacao = excluded.participacao, registrado_por = excluded.registrado_por",
    [aluno.id, maria],
  ),
);

await como(gestoraA);
await espera("Gestora ve a lista de alunos com turma (sem dados sensiveis)", true, async () => {
  const r = await linhas("select * from alunos_da_escola($1::uuid)", [escA.id]);
  const colunas = Object.keys(r[0] ?? {});
  return (
    r.length >= 1 &&
    r[0].turma_nome !== undefined &&
    !colunas.includes("diagnosticos") &&
    !colunas.includes("necessidades") &&
    !colunas.includes("familia")
  );
});
await espera(
  "Gestora ve so a quantidade de alunos sem turma",
  true,
  async () => (await linhas("select alunos_sem_turma($1::uuid) n", [escA.id]))[0].n >= 1,
);
await espera(
  "Gestora continua sem ler a tabela de alunos direto",
  true,
  async () => (await linhas("select * from alunos")).length === 0,
);
await como(gestorB);
await espera("Gestor de outra escola ve a lista de alunos (deve ser bloqueado)", false, () =>
  linhas("select * from alunos_da_escola($1::uuid)", [escA.id]),
);
await como(maria);
await espera("Professora ve a lista da escola inteira (deve ser bloqueado)", false, () =>
  linhas("select * from alunos_da_escola($1::uuid)", [escA.id]),
);
await como(admin);
await espera("Admin Lume ve nomes de alunos da escola (deve ser bloqueado)", false, () =>
  linhas("select * from alunos_da_escola($1::uuid)", [escA.id]),
);

await como(gestoraA);
await espera("Gestora ve o painel: 6 meses e a lista de professores", true, async () => {
  const r = (await linhas("select painel_gestor($1::uuid) p", [escA.id]))[0].p;
  const maria = r.professores.find((x) => x.nome === "Maria");
  return (
    r.meses.length === 6 &&
    Number(r.meses[5].usos_ia) >= 1 &&
    maria &&
    Number(maria.licoes_concluidas) >= 0 &&
    typeof r.turmas_sem_professor === "number"
  );
});
await como(maria);
await espera("Professora ve o painel do gestor (deve ser bloqueado)", false, () =>
  linhas("select painel_gestor($1::uuid)", [escA.id]),
);
await como(gestorB);
await espera("Gestor de outra escola ve o painel (deve ser bloqueado)", false, () =>
  linhas("select painel_gestor($1::uuid)", [escA.id]),
);

await como(maria);
await espera("Maria salva estrategias favoritas no proprio progresso", true, async () =>
  (
    await linhas(
      "insert into progresso_professor (usuario, estrategias_salvas) values ($1, '{cantinho-da-calma}') on conflict (usuario) do update set usuario = excluded.usuario, estrategias_salvas = excluded.estrategias_salvas returning estrategias_salvas",
      [maria],
    )
  )[0].estrategias_salvas.includes("cantinho-da-calma"),
);

await db.exec("reset role");
const perguntar = async () =>
  (await linhas("select contar_pergunta_lumis($1::uuid, 2) r", [maria]))[0].r;
await espera("Chat da Lumis: 1a pergunta do dia", true, async () => (await perguntar()).ok);
await espera("Chat da Lumis: 2a pergunta do dia", true, async () => (await perguntar()).ok);
await espera(
  "Chat da Lumis: 3a pergunta passa do limite e e bloqueada",
  true,
  async () => (await perguntar()).ok === false,
);
await como(maria);
await espera("Professora conta pergunta pela API (deve ser bloqueado)", false, () =>
  linhas("select contar_pergunta_lumis($1::uuid, 100)", [maria]),
);
await espera("Professora ve so o proprio uso do chat", true, async () =>
  (await linhas("select * from uso_chat_lumis")).every((r) => r.usuario === maria),
);
await como(intruso);
await espera(
  "Intruso ve o uso do chat da Maria (nao ve)",
  true,
  async () => (await linhas("select * from uso_chat_lumis")).length === 0,
);

await db.exec("reset role");
const visitante = async () =>
  (await linhas("select contar_pergunta_visitante('abc123', 1) r"))[0].r;
await espera("Chat no login: 1a pergunta do visitante", true, async () => (await visitante()).ok);
await espera(
  "Chat no login: passou do limite do dia e e bloqueado",
  true,
  async () => (await visitante()).ok === false,
);
await db.exec("set role anon");
await espera("Visitante conta pergunta pela API (deve ser bloqueado)", false, () =>
  linhas("select contar_pergunta_visitante('x', 1000)"),
);
await espera("Visitante le a contagem de outros visitantes (deve ser bloqueado)", false, () =>
  linhas("select * from uso_chat_visitantes"),
);

await como(maria);
const [prova] = await linhas(
  "insert into provas (escola, professor, titulo, conteudo) values ($1, $2, 'Fracoes', '{\"questoes\":[]}') returning id",
  [escA.id, maria],
);
await espera("Maria cria uma prova na escola dela", true, async () => Boolean(prova?.id));
await espera(
  "Maria edita a propria prova",
  true,
  async () =>
    (
      await linhas("update provas set titulo = 'Fracoes 2' where id = $1 returning titulo", [
        prova.id,
      ])
    ).length === 1,
);
await espera("Maria cria prova em escola que nao e dela (deve ser bloqueado)", false, () =>
  linhas("insert into provas (escola, professor, titulo, conteudo) values ($1, $2, 'X', '{}')", [
    escB.id,
    maria,
  ]),
);
await espera("Maria muda o dono da prova (deve ser bloqueado)", false, () =>
  linhas("update provas set professor = $2 where id = $1", [prova.id, intruso]),
);
await como(intruso);
await espera(
  "Intruso ve a prova da Maria (nao ve)",
  true,
  async () => (await linhas("select * from provas")).length === 0,
);
await espera(
  "Intruso apaga a prova da Maria (nao apaga)",
  true,
  async () =>
    (await linhas("delete from provas where id = $1 returning id", [prova.id])).length === 0,
);
await como(gestoraA);
await espera(
  "Gestora ve as provas da professora (nao ve)",
  true,
  async () => (await linhas("select * from provas")).length === 0,
);
await db.exec("set role anon");
await espera("Visitante le provas (deve ser bloqueado)", false, () =>
  linhas("select * from provas"),
);
await como(maria);
await espera(
  "Maria apaga a propria prova",
  true,
  async () =>
    (await linhas("delete from provas where id = $1 returning id", [prova.id])).length === 1,
);

await como(gestoraA);
await linhas(
  "insert into convites (escola,email,papel,convidado_por) values ($1,'prof.joana@x.com','professor',$2)",
  [escA.id, gestoraA],
);
const joana = await conta("prof.joana@x.com", "Joana");
await como(gestoraA);
await linhas("insert into turma_professores (turma,professor) values ($1,$2)", [turma.id, joana]);
await como(maria);
const [nota] = await linhas(
  "insert into anotacoes_aluno (aluno, autor, titulo, texto) values ($1, $2, 'Obs', 'Gosta de desenhar') returning id",
  [aluno.id, maria],
);
await como(joana);
await espera(
  "Colega da mesma turma le a anotacao da Maria",
  true,
  async () => (await linhas("select * from anotacoes_aluno where id = $1", [nota.id])).length === 1,
);
await espera(
  "Colega apaga a anotacao da Maria (nao apaga)",
  true,
  async () =>
    (await linhas("delete from anotacoes_aluno where id = $1 returning id", [nota.id])).length ===
    0,
);
await espera("Colega reescreve a anotacao da Maria (deve ser bloqueado)", false, () =>
  linhas("update anotacoes_aluno set texto = 'x', autor = $2 where id = $1", [nota.id, joana]),
);
await espera("Colega cria anotacao em nome da Maria (deve ser bloqueado)", false, () =>
  linhas(
    "insert into anotacoes_aluno (aluno, autor, titulo, texto) values ($1, $2, 'Falsa', 'x')",
    [aluno.id, maria],
  ),
);
await como(maria);
await espera(
  "Maria apaga a propria anotacao",
  true,
  async () =>
    (await linhas("delete from anotacoes_aluno where id = $1 returning id", [nota.id])).length ===
    1,
);
await como(gestoraA);
await espera("Gestora cria vinculo direto, sem convite (deve ser bloqueado)", false, () =>
  linhas("insert into vinculos (usuario,escola,papel) values ($1,$2,'professor')", [
    intruso,
    escA.id,
  ]),
);
await espera("Gestora troca a pessoa de um vinculo (deve ser bloqueado)", false, () =>
  linhas("update vinculos set usuario = $1 where usuario = $2 and escola = $3", [
    intruso,
    joana,
    escA.id,
  ]),
);
await espera(
  "Gestora desativa um professor",
  true,
  async () =>
    (
      await linhas(
        "update vinculos set ativo = false where usuario = $1 and escola = $2 returning id",
        [joana, escA.id],
      )
    ).length === 1,
);
await como(maria);
await espera(
  "Maria edita o proprio planejamento",
  true,
  async () =>
    (
      await linhas(
        'update planejamentos set resultado = \'{"titulo":"Editado"}\' where professor = $1 returning id',
        [maria],
      )
    ).length > 0,
);
await como(joana);
await espera(
  "Colega edita o planejamento da Maria (nao edita)",
  true,
  async () =>
    (
      await linhas("update planejamentos set resultado = '{}' where professor = $1 returning id", [
        maria,
      ])
    ).length === 0,
);
await como(maria);
await espera("Maria muda a turma de um planejamento (deve ser bloqueado)", false, () =>
  linhas("update planejamentos set turma = null where professor = $1", [maria]),
);
await db.exec("set role anon");
await espera("Visitante chama o resumo da escola (deve ser bloqueado)", false, () =>
  linhas("select resumo_escola($1::uuid)", [escA.id]),
);
await espera("Visitante chama as funcoes de permissao (deve ser bloqueado)", false, () =>
  linhas("select eh_admin()"),
);

await como(maria);
await espera(
  "Maria salva foto, telefone e disciplinas no proprio perfil",
  true,
  async () =>
    (
      await linhas(
        "update perfis set apelido = 'Mari', telefone = '(11) 99999-0000', disciplinas = '{Portugues}', foto = 'data:image/webp;base64,AAA' where id = $1 returning id",
        [maria],
      )
    ).length === 1,
);
await espera("Maria troca o proprio e-mail direto na tabela (deve ser bloqueado)", false, () =>
  linhas("update perfis set email = 'outro@x.com' where id = $1", [maria]),
);
await como(joana);
await espera(
  "Colega le o telefone da Maria (nao le)",
  true,
  async () => (await linhas("select telefone from perfis where id = $1", [maria])).length === 0,
);
await espera(
  "Colega muda o perfil da Maria (nao muda)",
  true,
  async () =>
    (await linhas("update perfis set apelido = 'x' where id = $1 returning id", [maria])).length ===
    0,
);
await como(gestoraA);
await espera(
  "Gestora ve o telefone da professora da escola",
  true,
  async () =>
    (await linhas("select telefone from perfis where id = $1", [maria]))[0]?.telefone ===
    "(11) 99999-0000",
);
await como(gestorB);
await espera(
  "Gestor de outra escola ve o telefone da Maria (nao ve)",
  true,
  async () => (await linhas("select telefone from perfis where id = $1", [maria])).length === 0,
);
await db.exec("reset role");
await linhas("update auth.users set email = 'maria.nova@x.com' where id = $1", [maria]);
await espera(
  "Ao confirmar o e-mail novo, o perfil acompanha",
  true,
  async () =>
    (await linhas("select email from perfis where id = $1", [maria]))[0]?.email ===
    "maria.nova@x.com",
);

const segundaAdmin = await conta("segunda.admin@x.com", "Segunda");
await db.exec("reset role");
await linhas("insert into admins_lume (usuario) values ($1)", [segundaAdmin]);
await como(admin);
await espera(
  "Admin ve os outros Admins na equipe",
  true,
  async () => (await linhas("select usuario from admins_lume")).length >= 2,
);
await como(gestoraA);
await espera(
  "Gestora ve a lista de Admins (nao ve)",
  true,
  async () => (await linhas("select usuario from admins_lume")).length === 0,
);
await espera("Gestora desativa a propria escola (deve ser bloqueado)", false, () =>
  linhas("select definir_escola_ativa($1::uuid, false)", [escA.id]),
);
await como(admin);
const [escC] = await linhas("insert into escolas (nome) values ('Escola C') returning id");
await linhas("insert into turmas (escola, nome) values ($1, 'Turma C')", [escC.id]);
await espera(
  "Admin tenta excluir escola ativa (nao exclui)",
  true,
  async () =>
    (await linhas("delete from escolas where id = $1 returning id", [escC.id])).length === 0,
);
await espera("Admin desativa a escola", true, () =>
  linhas("select definir_escola_ativa($1::uuid, false)", [escC.id]),
);
await espera(
  "Admin exclui a escola desativada, com as turmas dela",
  true,
  async () =>
    (await linhas("delete from escolas where id = $1 returning id", [escC.id])).length === 1 &&
    (await linhas("select id from turmas where escola = $1", [escC.id])).length === 0,
);
await espera(
  "Admin remove um gestor da escola",
  true,
  async () =>
    (
      await linhas(
        "update vinculos set ativo = false where usuario = $1 and escola = $2 and papel = 'gestor' returning id",
        [gestorB, escB.id],
      )
    ).length === 1,
);

await como(gestoraA);
await espera(
  "Gestora preenche telefone, INEP e logo da escola",
  true,
  async () =>
    (
      await linhas(
        "update escolas set telefone = '(11) 3333-0000', inep = '35000000', linha_superior = 'Prefeitura de Teste', logo_url = 'data:image/png;base64,AAA' where id = $1 returning id",
        [escA.id],
      )
    ).length === 1,
);
await espera("Gestora reativa a escola mexendo direto na tabela (deve ser bloqueado)", false, () =>
  linhas("update escolas set ativa = true where id = $1", [escA.id]),
);
await espera(
  "Gestora troca para o cabecalho pronto (imagem do PDF)",
  true,
  async () =>
    (
      await linhas(
        "update escolas set cabecalho_modo = 'pronto', cabecalho_imagem = 'data:image/png;base64,BBB' where id = $1 returning id",
        [escA.id],
      )
    ).length === 1,
);
await espera("Modo de cabecalho invalido (deve ser bloqueado)", false, () =>
  linhas("update escolas set cabecalho_modo = 'outro' where id = $1", [escA.id]),
);
await como(maria);
await espera(
  "Professora ve o cabecalho da escola dela",
  true,
  async () =>
    (await linhas("select logo_url, linha_superior from escolas where id = $1", [escA.id]))[0]
      ?.linha_superior === "Prefeitura de Teste",
);
await espera(
  "Professora muda os dados da escola (nao muda)",
  true,
  async () =>
    (await linhas("update escolas set telefone = 'x' where id = $1 returning id", [escA.id]))
      .length === 0,
);
await como(gestorB);
await espera(
  "Gestor de outra escola ve o cabecalho da Escola A (nao ve)",
  true,
  async () => (await linhas("select id from escolas where id = $1", [escA.id])).length === 0,
);

await como(admin);
const [turmaDeFora] = await linhas(
  "insert into turmas (escola, nome) values ($1, 'Turma da B') returning id",
  [escB.id],
);
await como(gestoraA);
await linhas(
  "insert into convites (escola, email, papel, convidado_por, turmas) values ($1, 'prof.ana@x.com', 'professor', $2, $3::jsonb)",
  [
    escA.id,
    gestoraA,
    JSON.stringify([
      { turma: turma.id, disciplina: "Ciencias" },
      { turma: turmaDeFora.id, disciplina: "X" },
    ]),
  ],
);
const ana = await conta("prof.ana@x.com", "Ana");
await db.exec("reset role");
const turmasDaAna = await linhas(
  "select turma, disciplina from turma_professores where professor = $1",
  [ana],
);
await espera(
  "Professora convidada com turma ja entra vinculada a turma",
  true,
  async () =>
    turmasDaAna.length === 1 &&
    turmasDaAna[0].turma === turma.id &&
    turmasDaAna[0].disciplina === "Ciencias",
);
await espera(
  "Turma de outra escola colocada no convite e ignorada",
  true,
  async () => !turmasDaAna.some((t) => t.turma === turmaDeFora.id),
);

await como(gestoraA);
await espera(
  "Gestora tira a professora da escola e das turmas",
  true,
  async () =>
    (await linhas("delete from turma_professores where professor = $1 returning turma", [ana]))
      .length === 1 &&
    (
      await linhas(
        "delete from vinculos where usuario = $1 and escola = $2 and papel = 'professor' returning id",
        [ana, escA.id],
      )
    ).length === 1,
);
await como(gestorB);
await espera(
  "Gestor de outra escola tira professora da Escola A (nao tira)",
  true,
  async () =>
    (
      await linhas("delete from vinculos where usuario = $1 and escola = $2 returning id", [
        maria,
        escA.id,
      ])
    ).length === 0,
);

await como(admin);
const [painelGeral] = await linhas("select painel_admin() p");
await espera("Admin ve o painel geral com os numeros de cada escola", true, async () => {
  const p = painelGeral.p;
  const a = p.escolas.find((e) => e.id === escA.id);
  return (
    p.meses.length === 6 &&
    a &&
    typeof a.alunos === "number" &&
    typeof a.creditos_usados === "number" &&
    typeof a.provas_mes === "number"
  );
});
await espera(
  "Painel geral nao traz nomes de alunos",
  true,
  async () => !JSON.stringify(painelGeral.p).includes("Lucas"),
);
await espera("Admin abre o painel de uma escola", true, async () =>
  Array.isArray((await linhas("select painel_gestor($1::uuid) p", [escA.id]))[0].p.meses),
);
await como(gestoraA);
await espera("Gestora abre o painel geral do Admin (deve ser bloqueado)", false, () =>
  linhas("select painel_admin()"),
);
await como(maria);
await espera("Professora abre o painel geral do Admin (deve ser bloqueado)", false, () =>
  linhas("select painel_admin()"),
);

await db.exec("reset role");
const [chamado] = await linhas(
  "insert into tickets (tipo, origem, email, assunto, conversa) values ('duvida', 'chat', 'prof.maria@x.com', 'Nao consigo anexar PDF', '[]') returning id",
);
await como(maria);
await espera(
  "Professora le os chamados da equipe (nao le)",
  true,
  async () => (await linhas("select id from tickets")).length === 0,
);
await espera("Professora cria chamado direto na tabela (deve ser bloqueado)", false, () =>
  linhas(
    "insert into tickets (tipo, origem, email, assunto) values ('duvida', 'chat', 'x@x.com', 'Falso')",
  ),
);
await como(gestoraA);
await espera(
  "Gestora le os chamados (nao le)",
  true,
  async () => (await linhas("select id from tickets")).length === 0,
);
await db.exec("set role anon");
await espera("Visitante le os chamados (deve ser bloqueado)", false, () =>
  linhas("select id from tickets"),
);
await como(admin);
await espera(
  "Admin ve e marca o chamado como respondido",
  true,
  async () =>
    (
      await linhas(
        "update tickets set situacao = 'respondido', observacao = 'Respondi por e-mail' where id = $1 returning situacao",
        [chamado.id],
      )
    )[0]?.situacao === "respondido",
);
await espera("Admin troca o e-mail de quem abriu o chamado (deve ser bloqueado)", false, () =>
  linhas("update tickets set email = 'outro@x.com' where id = $1", [chamado.id]),
);

await db.exec("reset role");
await linhas(
  "insert into usos_ia (escola, usuario, tipo, creditos, extra, criado_em) values ($1, $2, 'adaptar_aula', 10, true, ((date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month' + interval '5 days')::timestamp at time zone 'America/Sao_Paulo'))",
  [escA.id, maria],
);
await como(admin);
await espera("Admin cadastra o contrato da escola", true, () =>
  linhas(
    "insert into contratos (escola, valor_mensal, dia_vencimento, valor_credito_extra, inicio) values ($1, 500, 10, 0.5, date_trunc('month', now() - interval '2 months')::date)",
    [escA.id],
  ),
);
const mesAtual = (await linhas("select mes_atual()::text m"))[0].m;
const geradas = (await linhas("select gerar_cobrancas($1::date) n", [mesAtual]))[0].n;
const [cobranca] = await linhas(
  "select valor, valor_extra, creditos_extra, vencimento::text v from cobrancas where escola = $1 and competencia = $2::date",
  [escA.id, mesAtual],
);
await espera(
  "Mensalidade do mes sai com o valor do contrato e os extras do mes anterior",
  true,
  async () =>
    geradas === 1 &&
    Number(cobranca.valor) === 500 &&
    cobranca.creditos_extra === 10 &&
    Number(cobranca.valor_extra) === 5 &&
    cobranca.v.endsWith("-10"),
);
await espera(
  "Gerar de novo nao duplica a mensalidade",
  true,
  async () => (await linhas("select gerar_cobrancas($1::date) n", [mesAtual]))[0].n === 0,
);
await espera(
  "Admin marca a mensalidade como paga",
  true,
  async () =>
    (
      await linhas(
        "update cobrancas set situacao = 'paga', pago_em = current_date, forma = 'Pix' where escola = $1 returning id",
        [escA.id],
      )
    ).length === 1,
);
await como(gestoraA);
await espera(
  "Gestora ve as mensalidades e o contrato (nao ve)",
  true,
  async () =>
    (await linhas("select id from cobrancas")).length === 0 &&
    (await linhas("select escola from contratos")).length === 0,
);
await espera("Gestora gera mensalidades (deve ser bloqueado)", false, () =>
  linhas("select gerar_cobrancas(current_date)"),
);
await espera(
  "Gestora muda o valor do contrato (nao muda)",
  true,
  async () =>
    (
      await linhas("update contratos set valor_mensal = 1 where escola = $1 returning escola", [
        escA.id,
      ])
    ).length === 0,
);
const [{ m: mensalidade }] = await linhas("select mensalidade_da_escola($1) m", [escA.id]);
await espera(
  "Gestora ve a mensalidade da propria escola, sem as observacoes da equipe",
  true,
  async () =>
    Number(mensalidade.contrato.valor_mensal) === 500 &&
    mensalidade.cobrancas.length === 1 &&
    mensalidade.cobrancas[0].situacao === "paga" &&
    !("observacao" in mensalidade.contrato) &&
    !("observacao" in mensalidade.cobrancas[0]),
);
await como(gestorB);
await espera("Gestor de outra escola ve a mensalidade (deve ser bloqueado)", false, () =>
  linhas("select mensalidade_da_escola($1)", [escA.id]),
);
await como(maria);
await espera("Professora ve a mensalidade da escola (deve ser bloqueado)", false, () =>
  linhas("select mensalidade_da_escola($1)", [escA.id]),
);
await db.exec("set role anon");
await espera("Visitante ve a mensalidade (deve ser bloqueado)", false, () =>
  linhas("select mensalidade_da_escola($1)", [escA.id]),
);

await como(maria);
await espera(
  "Maria coloca a foto do aluno",
  true,
  async () =>
    (
      await linhas(
        "update alunos set foto = 'data:image/jpeg;base64,AAAA' where id = $1 returning id",
        [aluno.id],
      )
    ).length === 1,
);
await espera("Maria coloca um link estranho como foto (deve ser bloqueado)", false, () =>
  linhas("update alunos set foto = 'javascript:alert(1)' where id = $1", [aluno.id]),
);
await espera("Maria coloca uma foto enorme (deve ser bloqueado)", false, () =>
  linhas(
    "update alunos set foto = 'data:image/jpeg;base64,' || repeat('A', 200000) where id = $1",
    [aluno.id],
  ),
);
await como(gestorB);
await espera(
  "Gestor de outra escola ve a foto do aluno (nao ve)",
  true,
  async () => (await linhas("select foto from alunos where id = $1", [aluno.id])).length === 0,
);

await como(admin);
const [escR] = await linhas("insert into escolas (nome) values ('Escola Ranking') returning id");
await linhas(
  "insert into convites (escola,email,papel,convidado_por) values ($1,'prof.r1@x.com','professor',$2),($1,'prof.r2@x.com','professor',$2)",
  [escR.id, admin],
);
const profR1 = await conta("prof.r1@x.com", "Rita Ranking");
const profR2 = await conta("prof.r2@x.com", "Rui Ranking");
const salvarXp = (xp) =>
  linhas(
    "insert into progresso_professor (usuario, xp) values (auth.uid(), $1) on conflict (usuario) do update set xp = excluded.xp returning xp",
    [xp],
  );

await como(profR1);
await espera(
  "Rita grava 5000 XP de uma vez (o banco limita a 300)",
  true,
  async () => (await salvarXp(5000))[0].xp === 300,
);
await espera("Rita repete a gravacao falsa varias vezes (para em 1500 no dia)", true, async () => {
  for (let i = 0; i < 8; i++) await salvarXp(5000);
  return (await salvarXp(5000))[0].xp === 1500;
});
await espera(
  "Rita ainda nao aceitou o ranking (nao aparece)",
  true,
  async () => (await linhas("select ranking_professores() r"))[0].r.professores.length === 0,
);
await espera(
  "Rita aceita aparecer no ranking",
  true,
  async () =>
    (
      await linhas("update perfis set aparece_no_ranking = true where id = $1 returning id", [
        profR1,
      ])
    ).length === 1,
);
await espera(
  "Rita tenta colocar o Rui no ranking (nao muda nada)",
  true,
  async () =>
    (
      await linhas("update perfis set aparece_no_ranking = true where id = $1 returning id", [
        profR2,
      ])
    ).length === 0,
);
await como(profR2);
await espera("Rui ve a Rita no ranking, com escola e XP, sem e-mail", true, async () => {
  const { r } = (await linhas("select ranking_professores() r"))[0];
  const rita = r.professores[0];
  return (
    r.professores.length === 1 &&
    rita.nome === "Rita Ranking" &&
    rita.escola === "Escola Ranking" &&
    rita.xp === 1500 &&
    rita.voce === false &&
    !("email" in rita) &&
    r.eu.participa === false &&
    r.eu.posicao === null
  );
});
await espera("Rui ve a Escola Ranking no ranking de escolas", true, async () => {
  const { r } = (await linhas("select ranking_escolas() r"))[0];
  return (
    r.length === 1 &&
    r[0].nome === "Escola Ranking" &&
    r[0].professores === 1 &&
    r[0].xp_total === 1500 &&
    r[0].sua_escola === true
  );
});
await como(intruso);
await espera("Conta sem escola ve o ranking (deve ser bloqueado)", false, () =>
  linhas("select ranking_professores()"),
);
await db.exec("set role anon");
await espera("Visitante ve o ranking (deve ser bloqueado)", false, () =>
  linhas("select ranking_escolas()"),
);

console.log(`\n${ok} verificacoes certas, ${falhas} erradas`);
await db.close();
