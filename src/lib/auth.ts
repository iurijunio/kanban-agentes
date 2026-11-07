import type { Ator } from "@/db/cards";

export type AtorResolvido = { ator: Ator } | { status: 401; erro: "nao_autenticado" };

/**
 * Sem header Authorization: ator humano (a UI não envia token).
 * `Bearer <AGENT_API_TOKEN>`: ator agente.
 * Qualquer outro header (vazio, sem token, errado) ou env ausente: 401.
 */
export function resolverAtor(request: Request): AtorResolvido {
  const authorization = request.headers.get("authorization");

  if (authorization === null) {
    return { ator: "humano" };
  }

  const token = process.env.AGENT_API_TOKEN;
  if (token && authorization === `Bearer ${token}`) {
    return { ator: "agente" };
  }

  return { status: 401, erro: "nao_autenticado" };
}
