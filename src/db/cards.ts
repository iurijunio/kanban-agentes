import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import { COLUNAS, ehColuna, ehTipo, type Coluna, type Tipo } from "@/lib/colunas";

export type Ator = "humano" | "agente";

export interface Card {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: Tipo;
  coluna: Coluna;
  criado_em: string;
  atualizado_em: string;
}

export interface Historico {
  id: number;
  card_id: string;
  de: Coluna | null;
  para: Coluna;
  ator: Ator;
  data_hora: string;
}

export type Resultado<T> = { ok: true; dados: T } | { ok: false; status: number; erro: string };

const TAMANHO_MAX_TITULO = 200;

const ORDEM_COLUNA = `CASE coluna ${COLUNAS.map((coluna, indice) => `WHEN '${coluna}' THEN ${indice}`).join(" ")} END`;

function mapearCard(linha: Record<string, unknown>): Card {
  return {
    id: String(linha.id),
    titulo: String(linha.titulo),
    descricao: linha.descricao === null ? null : String(linha.descricao),
    tipo: linha.tipo as Tipo,
    coluna: linha.coluna as Coluna,
    criado_em: String(linha.criado_em),
    atualizado_em: String(linha.atualizado_em),
  };
}

function mapearHistorico(linha: Record<string, unknown>): Historico {
  return {
    id: Number(linha.id),
    card_id: String(linha.card_id),
    de: linha.de === null ? null : (linha.de as Coluna),
    para: linha.para as Coluna,
    ator: linha.ator as Ator,
    data_hora: String(linha.data_hora),
  };
}

function validar(
  dados: Record<string, unknown>,
  contexto: "criar" | "editar" | "mover",
): string | null {
  if (contexto === "mover") {
    return ehColuna(dados.para) ? null : "coluna invalida";
  }

  if (contexto === "criar" || dados.titulo !== undefined) {
    if (typeof dados.titulo !== "string" || dados.titulo.trim().length === 0) {
      return "titulo obrigatorio";
    }
    if (dados.titulo.trim().length > TAMANHO_MAX_TITULO) {
      return `titulo deve ter no maximo ${TAMANHO_MAX_TITULO} caracteres`;
    }
  }

  if ((contexto === "criar" || dados.tipo !== undefined) && !ehTipo(dados.tipo)) {
    return "tipo invalido";
  }

  if (dados.descricao !== undefined && typeof dados.descricao !== "string") {
    return "descricao invalida";
  }

  if (contexto === "criar" && !ehColuna(dados.coluna)) {
    return "coluna invalida";
  }

  return null;
}

export function listarCards(): Resultado<Card[]> {
  const linhas = getDb()
    .prepare(`SELECT * FROM cards ORDER BY ${ORDEM_COLUNA}, criado_em`)
    .all();
  return { ok: true, dados: linhas.map(mapearCard) };
}

export function obterCard(id: string): Resultado<Card> {
  const linha = getDb().prepare("SELECT * FROM cards WHERE id = ?").get(id);
  if (!linha) {
    return { ok: false, status: 404, erro: "card nao encontrado" };
  }
  return { ok: true, dados: mapearCard(linha) };
}

export function criarCard(
  dados: Record<string, unknown>,
  { ator }: { ator: Ator },
): Resultado<Card> {
  const erro = validar(dados, "criar");
  if (erro) {
    return { ok: false, status: 400, erro };
  }

  const db = getDb();
  const id = randomUUID();
  const agora = new Date().toISOString();
  const titulo = (dados.titulo as string).trim();
  const tipo = dados.tipo as Tipo;
  const coluna = dados.coluna as Coluna;
  const descricao = (dados.descricao as string | undefined) ?? null;

  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO cards (id, titulo, descricao, tipo, coluna, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, titulo, descricao, tipo, coluna, agora, agora);
    db.prepare(
      "INSERT INTO historico (card_id, de, para, ator, data_hora) VALUES (?, ?, ?, ?, ?)",
    ).run(id, null, coluna, ator, agora);
    db.exec("COMMIT");
  } catch (erroTransacao) {
    db.exec("ROLLBACK");
    throw erroTransacao;
  }

  return {
    ok: true,
    dados: { id, titulo, descricao, tipo, coluna, criado_em: agora, atualizado_em: agora },
  };
}

export function editarCard(id: string, dados: Record<string, unknown>): Resultado<Card> {
  const erro = validar(dados, "editar");
  if (erro) {
    return { ok: false, status: 400, erro };
  }

  const existente = obterCard(id);
  if (!existente.ok) {
    return existente;
  }

  const campos: string[] = [];
  const valores: string[] = [];

  if (dados.titulo !== undefined) {
    campos.push("titulo = ?");
    valores.push((dados.titulo as string).trim());
  }
  if (dados.descricao !== undefined) {
    campos.push("descricao = ?");
    valores.push(dados.descricao as string);
  }
  if (dados.tipo !== undefined) {
    campos.push("tipo = ?");
    valores.push(dados.tipo as Tipo);
  }

  if (campos.length === 0) {
    return { ok: false, status: 400, erro: "nenhum campo para atualizar" };
  }

  campos.push("atualizado_em = ?");
  valores.push(new Date().toISOString());

  getDb()
    .prepare(`UPDATE cards SET ${campos.join(", ")} WHERE id = ?`)
    .run(...valores, id);

  return obterCard(id);
}

export function excluirCard(id: string): Resultado<null> {
  const resultado = getDb().prepare("DELETE FROM cards WHERE id = ?").run(id);
  if (Number(resultado.changes) === 0) {
    return { ok: false, status: 404, erro: "card nao encontrado" };
  }
  return { ok: true, dados: null };
}

export function moverCard(
  id: string,
  para: string,
  { ator }: { ator: Ator },
): Resultado<Card> {
  const erro = validar({ para }, "mover");
  if (erro) {
    return { ok: false, status: 400, erro };
  }

  const existente = obterCard(id);
  if (!existente.ok) {
    return existente;
  }

  const destino = para as Coluna;
  const agora = new Date().toISOString();
  const db = getDb();

  db.exec("BEGIN");
  try {
    db.prepare("UPDATE cards SET coluna = ?, atualizado_em = ? WHERE id = ?").run(
      destino,
      agora,
      id,
    );
    db.prepare(
      "INSERT INTO historico (card_id, de, para, ator, data_hora) VALUES (?, ?, ?, ?, ?)",
    ).run(id, existente.dados.coluna, destino, ator, agora);
    db.exec("COMMIT");
  } catch (erroTransacao) {
    db.exec("ROLLBACK");
    throw erroTransacao;
  }

  return obterCard(id);
}

export function historicoDeCard(id: string): Resultado<Historico[]> {
  const linhas = getDb()
    .prepare("SELECT * FROM historico WHERE card_id = ? ORDER BY id")
    .all(id);
  return { ok: true, dados: linhas.map(mapearHistorico) };
}
