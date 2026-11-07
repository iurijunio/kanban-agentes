import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { criarDb, fecharDb } from "@/db";
import { criarCard, type Ator, type Card } from "@/db/cards";
import type { Coluna, Tipo } from "@/lib/colunas";

/** Token configurado em AGENT_API_TOKEN durante os testes de API. */
export const TOKEN_VALIDO = "token-de-teste-api";

/** Header presente, mas com token que não confere com o ambiente. */
export const AUTHORIZATION_INVALIDA = "Bearer token-errado";

let dirAtual: string | null = null;
let caminhoAtual = "";
let tokenAnterior: string | undefined;
let caminhoBancoAnterior: string | undefined;

function restaurarEnv(nome: string, valor: string | undefined): void {
  if (valor === undefined) {
    delete process.env[nome];
  } else {
    process.env[nome] = valor;
  }
}

/**
 * Prepara um banco SQLite temporário exclusivo do teste e configura o env que
 * as rotas leem. Deve rodar no `beforeEach`, ANTES de importar os handlers.
 * Nunca aponta para data/kanban.db.
 */
export function prepararAmbiente(): void {
  dirAtual = mkdtempSync(join(tmpdir(), "kanban-api-"));
  caminhoAtual = join(dirAtual, "kanban.db");
  tokenAnterior = process.env.AGENT_API_TOKEN;
  caminhoBancoAnterior = process.env.KANBAN_DB_PATH;

  process.env.AGENT_API_TOKEN = TOKEN_VALIDO;
  process.env.KANBAN_DB_PATH = caminhoAtual;
  criarDb(caminhoAtual);
}

/** Fecha a conexão do teste, restaura o env e apaga o arquivo temporário. */
export function encerrarAmbiente(): void {
  fecharDb();
  restaurarEnv("AGENT_API_TOKEN", tokenAnterior);
  restaurarEnv("KANBAN_DB_PATH", caminhoBancoAnterior);
  tokenAnterior = undefined;
  caminhoBancoAnterior = undefined;

  if (dirAtual) {
    rmSync(dirAtual, { recursive: true, force: true });
  }
  dirAtual = null;
  caminhoAtual = "";
}

/** Caminho do banco temporário em uso (para provar que não é o default). */
export function caminhoDoBanco(): string {
  return caminhoAtual;
}

/** Valor de Authorization para um agente autenticado. */
export function autorizacaoAgente(): string {
  return `Bearer ${TOKEN_VALIDO}`;
}

export interface OpcoesRequisicao {
  /** Corpo serializado como JSON; omitido quando `undefined`. */
  corpo?: unknown;
  /** Valor cru do header Authorization; omitido quando `undefined`. */
  authorization?: string;
}

/** Monta um `Request` em memória, sem rede. */
export function criarRequisicao(
  metodo: string,
  caminho: string,
  opcoes: OpcoesRequisicao = {},
): Request {
  const headers = new Headers();
  if (opcoes.corpo !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (opcoes.authorization !== undefined) {
    headers.set("authorization", opcoes.authorization);
  }

  const init: RequestInit = { method: metodo, headers };
  if (opcoes.corpo !== undefined) {
    init.body = JSON.stringify(opcoes.corpo);
  }

  return new Request(`http://localhost${caminho}`, init);
}

/** `ctx` do Next 16: params é uma Promise. */
export function contexto(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

export function lerJson<T>(resposta: Response): Promise<T> {
  return resposta.json() as Promise<T>;
}

/**
 * Semeia um card direto no repositório (banco temporário já aberto), útil para
 * montar estado sem passar pelas rotas.
 */
export function semearCard(
  dados: { titulo?: string; tipo?: Tipo; coluna?: Coluna; descricao?: string } = {},
  ator: Ator = "humano",
): Card {
  const resultado = criarCard(
    { titulo: "Card semeado", tipo: "feature", coluna: "backlog", ...dados },
    { ator },
  );

  if (!resultado.ok) {
    throw new Error(`semearCard falhou (${resultado.status}): ${resultado.erro}`);
  }

  return resultado.dados;
}

// Imports dinâmicos: o banco temporário precisa estar aberto e o env posto
// antes de os módulos de rota serem avaliados.

export function rotasCards() {
  return import("@/app/api/cards/route");
}

export function rotasCardId() {
  return import("@/app/api/cards/[id]/route");
}

export function rotasMover() {
  return import("@/app/api/cards/[id]/mover/route");
}
