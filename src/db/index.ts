import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cards (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  tipo          TEXT NOT NULL CHECK (tipo IN ('bug','feature')),
  coluna        TEXT NOT NULL CHECK (coluna IN ('backlog','a_fazer','em_andamento','em_revisao','concluido')),
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS historico (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id   TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  de        TEXT,
  para      TEXT NOT NULL CHECK (para IN ('backlog','a_fazer','em_andamento','em_revisao','concluido')),
  ator      TEXT NOT NULL CHECK (ator IN ('humano','agente')),
  data_hora TEXT NOT NULL
);
`;

let db: DatabaseSync | null = null;

function abrir(caminho: string): DatabaseSync {
  const absoluto = resolve(caminho);
  mkdirSync(dirname(absoluto), { recursive: true });

  const conexao = new DatabaseSync(absoluto);
  conexao.exec("PRAGMA foreign_keys = ON");
  conexao.exec(SCHEMA);
  return conexao;
}

/** Abre (ou reabre) o banco no caminho informado e o torna o singleton atual. */
export function criarDb(caminho: string): DatabaseSync {
  fecharDb();
  db = abrir(caminho);
  return db;
}

/** Conexão singleton usada pelas rotas; abre no primeiro uso. */
export function getDb(): DatabaseSync {
  if (!db) {
    db = abrir(process.env.KANBAN_DB_PATH ?? "data/kanban.db");
  }
  return db;
}

/** Fecha a conexão atual (se houver) e limpa o singleton. */
export function fecharDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
