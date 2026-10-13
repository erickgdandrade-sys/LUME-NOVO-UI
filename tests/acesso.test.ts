import { describe, expect, it } from "vitest";
import { inicioDa, nomeDaVisao, rotaPermitida, type Visao } from "@/lib/acesso";

const admin: Visao = { tipo: "admin" };
const gestor: Visao = { tipo: "gestor", escola: "e1", escolaNome: "Escola Piloto" };
const professor: Visao = { tipo: "professor", escola: "e1", escolaNome: "Escola Piloto" };
const semAcesso: Visao = { tipo: "sem-acesso" };

describe("inicioDa", () => {
  it("leva cada papel para a sua página inicial", () => {
    expect(inicioDa(admin)).toBe("/admin");
    expect(inicioDa(gestor)).toBe("/gestor");
    expect(inicioDa(professor)).toBe("/");
    expect(inicioDa(semAcesso)).toBe("/sem-acesso");
    expect(inicioDa(null)).toBe("/");
  });
});

describe("rotaPermitida", () => {
  it("Admin só abre o painel Admin e as páginas comuns", () => {
    expect(rotaPermitida(admin, "/admin/equipe")).toBe(true);
    expect(rotaPermitida(admin, "/sobre")).toBe(true);
    expect(rotaPermitida(admin, "/gestor")).toBe(false);
    expect(rotaPermitida(admin, "/alunos")).toBe(false);
  });

  it("gestor não abre o painel Admin nem as telas do professor", () => {
    expect(rotaPermitida(gestor, "/gestor/turmas")).toBe(true);
    expect(rotaPermitida(gestor, "/admin")).toBe(false);
    expect(rotaPermitida(gestor, "/planejamento")).toBe(false);
  });

  it("professor não abre os painéis de gestão", () => {
    expect(rotaPermitida(professor, "/planejamento")).toBe(true);
    expect(rotaPermitida(professor, "/alunos/123")).toBe(true);
    expect(rotaPermitida(professor, "/admin")).toBe(false);
    expect(rotaPermitida(professor, "/gestor")).toBe(false);
  });

  it("conta sem escola só vê o aviso e as páginas comuns", () => {
    expect(rotaPermitida(semAcesso, "/sem-acesso")).toBe(true);
    expect(rotaPermitida(semAcesso, "/nova-senha")).toBe(true);
    expect(rotaPermitida(semAcesso, "/")).toBe(false);
  });
});

describe("nomeDaVisao", () => {
  it("mostra o papel e a escola", () => {
    expect(nomeDaVisao(gestor)).toBe("Gestão · Escola Piloto");
    expect(nomeDaVisao(admin)).toBe("Admin Lume");
  });
});
