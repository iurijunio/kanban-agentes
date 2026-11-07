import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TempDb {
  /** Diretório temporário exclusivo deste teste. */
  dir: string;
  /** Caminho do arquivo SQLite dentro do diretório temporário. */
  caminho: string;
  /** Remove o diretório inteiro; idempotente. */
  limpar: () => void;
}

/**
 * Cria um arquivo SQLite em diretório temporário exclusivo.
 * Nunca aponta para data/kanban.db, garantindo isolamento entre testes.
 */
export function criarTempDb(): TempDb {
  const dir = mkdtempSync(join(tmpdir(), "kanban-testes-"));
  const caminho = join(dir, "kanban.db");
  let limpo = false;

  return {
    dir,
    caminho,
    limpar() {
      if (limpo) return;
      limpo = true;
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
