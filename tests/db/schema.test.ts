import type { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";
import { criarDb, fecharDb, getDb } from "@/db";
import {
  criarCard,
  excluirCard,
  historicoDeCard,
  listarCards,
  moverCard,
  obterCard,
  type Card,
  type Historico,
} from "@/db/cards";
import { criarTempDb } from "../helpers";

const COLUNAS = ["backlog", "a_fazer", "em_andamento", "em_revisao", "concluido"] as const;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extrai `dados` de um resultado do repositório ou falha alto. */
function exigirOk<T = unknown>(resultado: unknown): T {
  if (
    typeof resultado !== "object" ||
    resultado === null ||
    (resultado as { ok?: unknown }).ok !== true
  ) {
    throw new Error(`esperava ok=true, recebeu: ${JSON.stringify(resultado)}`);
  }
  return (resultado as { dados: T }).dados;
}

function nomesDeColunas(db: DatabaseSync, tabela: string): string[] {
  return (db.prepare(`PRAGMA table_info(${tabela})`).all() as { name: string }[]).map((c) => String(c.name));
}

describe("schema e inicialização do banco", () => {
  it("criarDb é idempotente e cria cards/historico com colunas e CHECKs", () => {
    const temp = criarTempDb();
    try {
      criarDb(temp.caminho);
      // Segunda abertura no mesmo arquivo não pode lançar nem duplicar schema.
      criarDb(temp.caminho);

      const db = getDb();

      const tabelas = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
        name: string;
      }[]).map((r) => String(r.name));
      expect(tabelas).toContain("cards");
      expect(tabelas).toContain("historico");

      expect(nomesDeColunas(db, "cards")).toEqual(
        expect.arrayContaining(["id", "titulo", "descricao", "tipo", "coluna", "criado_em", "atualizado_em"]),
      );
      expect(nomesDeColunas(db, "historico")).toEqual(
        expect.arrayContaining(["id", "card_id", "de", "para", "ator", "data_hora"]),
      );

      const sqls = db
        .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN ('cards', 'historico')")
        .all() as { name: string; sql: string }[];
      const sqlPorNome: Record<string, string> = Object.fromEntries(
        sqls.map((r) => [String(r.name), String(r.sql)]),
      );
      expect(sqlPorNome.cards).toMatch(/CHECK/i);
      expect(sqlPorNome.historico).toMatch(/CHECK/i);
      for (const coluna of COLUNAS) {
        expect(sqlPorNome.cards).toContain(coluna);
        expect(sqlPorNome.historico).toContain(coluna);
      }
      expect(sqlPorNome.cards).toContain("bug");
      expect(sqlPorNome.cards).toContain("feature");
      expect(sqlPorNome.historico).toContain("humano");
      expect(sqlPorNome.historico).toContain("agente");

      // CHECK funcional: coluna fora da lista é rejeitada pelo SQLite.
      expect(() =>
        db
          .prepare(
            "INSERT INTO cards (id, titulo, tipo, coluna, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .run("id-invalido", "titulo", "bug", "coluna_invalida", "2026-11-06T00:00:00.000Z", "2026-11-06T00:00:00.000Z"),
      ).toThrow(/CHECK/i);

      // FK do histórico aponta para cards com CASCADE.
      const fks = db.prepare("PRAGMA foreign_key_list(historico)").all() as {
        table: string;
        on_delete: string;
      }[];
      const fkCards = fks.find((fk) => String(fk.table) === "cards");
      expect(fkCards).toBeTruthy();
      expect(String(fkCards!.on_delete).toUpperCase()).toBe("CASCADE");

      expect(Number((db.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number }).foreign_keys)).toBe(1);

      // As tabelas são graváveis pela API do repositório.
      const card = exigirOk<Card>(criarCard({ titulo: "Card idempotente", tipo: "bug", coluna: "backlog" }, { ator: "humano" }));
      expect(card.id).toMatch(RE_UUID);
      expect((db.prepare("SELECT COUNT(*) AS n FROM cards").get() as { n: number }).n).toBe(1);
      expect((db.prepare("SELECT COUNT(*) AS n FROM historico").get() as { n: number }).n).toBe(1);
    } finally {
      fecharDb();
      temp.limpar();
    }
  });

  it("persiste card e histórico com coluna/ator após fechar e reabrir o arquivo", () => {
    const temp = criarTempDb();
    try {
      criarDb(temp.caminho);
      const card = exigirOk<Card>(criarCard({ titulo: "Persistente", tipo: "feature", coluna: "backlog" }, { ator: "humano" }));
      exigirOk(moverCard(card.id, "em_andamento", { ator: "agente" }));

      fecharDb();
      criarDb(temp.caminho);

      const relido = exigirOk<Card>(obterCard(card.id));
      expect(relido.id).toBe(card.id);
      expect(relido.titulo).toBe("Persistente");
      expect(relido.coluna).toBe("em_andamento");

      const historico = exigirOk<Historico[]>(historicoDeCard(card.id));
      expect(historico.length).toBeGreaterThanOrEqual(2);
      const movimento = historico.find((h) => h.para === "em_andamento");
      expect(movimento).toBeTruthy();
      if (!movimento) throw new Error("histórico sem movimento para em_andamento");
      expect(movimento.de).toBe("backlog");
      expect(movimento.ator).toBe("agente");
    } finally {
      fecharDb();
      temp.limpar();
    }
  });

  it("excluir card remove o histórico via FK ON DELETE CASCADE", () => {
    const temp = criarTempDb();
    try {
      criarDb(temp.caminho);
      const card = exigirOk<Card>(criarCard({ titulo: "Cascata", tipo: "bug", coluna: "backlog" }, { ator: "humano" }));
      exigirOk(moverCard(card.id, "a_fazer", { ator: "humano" }));

      const db = getDb();
      const antes = (db.prepare("SELECT COUNT(*) AS n FROM historico WHERE card_id = ?").get(card.id) as {
        n: number;
      }).n;
      expect(Number(antes)).toBeGreaterThan(0);

      exigirOk(excluirCard(card.id));

      const depois = (db.prepare("SELECT COUNT(*) AS n FROM historico WHERE card_id = ?").get(card.id) as {
        n: number;
      }).n;
      expect(Number(depois)).toBe(0);
    } finally {
      fecharDb();
      temp.limpar();
    }
  });

  it("isola cada teste em arquivo temporário próprio e nunca usa data/kanban.db", () => {
    const a = criarTempDb();
    const b = criarTempDb();
    try {
      expect(a.caminho).not.toBe(b.caminho);
      for (const temp of [a, b]) {
        expect(temp.caminho.replaceAll("\\", "/")).not.toMatch(/\/data\/kanban\.db$/);
      }

      criarDb(a.caminho);
      exigirOk(criarCard({ titulo: "Só no arquivo A", tipo: "feature", coluna: "backlog" }, { ator: "humano" }));
      fecharDb();

      criarDb(b.caminho);
      expect(exigirOk(listarCards())).toEqual([]);
    } finally {
      fecharDb();
      a.limpar();
      b.limpar();
    }
  });
});
