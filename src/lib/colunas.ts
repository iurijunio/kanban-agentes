export const COLUNAS = ["backlog", "a_fazer", "em_andamento", "em_revisao", "concluido"] as const;

export type Coluna = (typeof COLUNAS)[number];

export const ROTULOS: Record<Coluna, string> = {
  backlog: "Backlog",
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  em_revisao: "Em revisão",
  concluido: "Concluído",
};

export function ehColuna(valor: unknown): valor is Coluna {
  return typeof valor === "string" && (COLUNAS as readonly string[]).includes(valor);
}

const TIPOS = ["bug", "feature"] as const;

export type Tipo = (typeof TIPOS)[number];

export function ehTipo(valor: unknown): valor is Tipo {
  return typeof valor === "string" && (TIPOS as readonly string[]).includes(valor);
}
