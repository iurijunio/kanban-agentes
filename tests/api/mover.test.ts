import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AUTHORIZATION_INVALIDA,
  autorizacaoAgente,
  contexto,
  criarRequisicao,
  encerrarAmbiente,
  lerJson,
  prepararAmbiente,
  rotasCardId,
  rotasCards,
  rotasMover,
  semearCard,
} from "./utils";

interface CardApi {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  coluna: string;
  criado_em: string;
  atualizado_em: string;
}

interface HistoricoApi {
  id: number;
  card_id: string;
  de: string | null;
  para: string;
  ator: string;
  data_hora: string;
}

interface DetalheApi {
  card: CardApi;
  historico: HistoricoApi[];
}

describe("API /api/cards/[id]/mover", () => {
  beforeEach(() => {
    prepararAmbiente();
  });

  afterEach(() => {
    encerrarAmbiente();
  });

  it("com Bearer válido move o card e registra histórico de agente", async () => {
    const card = semearCard({ titulo: "Mover", coluna: "backlog" }, "agente");
    const { POST: MOVER } = await rotasMover();
    const { GET } = await rotasCardId();

    const resposta = await MOVER(
      criarRequisicao("POST", `/api/cards/${card.id}/mover`, {
        authorization: autorizacaoAgente(),
        corpo: { para: "em_andamento" },
      }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(200);
    const movido = await lerJson<CardApi>(resposta);
    expect(movido).toMatchObject({ id: card.id, coluna: "em_andamento" });

    const detalhe = await GET(
      criarRequisicao("GET", `/api/cards/${card.id}`, { authorization: autorizacaoAgente() }),
      contexto(card.id),
    );
    const { card: lido, historico } = await lerJson<DetalheApi>(detalhe);
    expect(lido.coluna).toBe("em_andamento");
    expect(historico).toHaveLength(2);
    expect(historico[0]).toMatchObject({ de: null, para: "backlog", ator: "agente" });
    expect(historico[1]).toMatchObject({
      card_id: card.id,
      de: "backlog",
      para: "em_andamento",
      ator: "agente",
    });
    expect(typeof historico[1].data_hora).toBe("string");
    expect(historico[1].data_hora.length).toBeGreaterThan(0);
  });

  it("sem Authorization move como ator humano", async () => {
    const card = semearCard({ titulo: "Humano", coluna: "a_fazer" });
    const { POST: MOVER } = await rotasMover();
    const { GET } = await rotasCardId();

    const resposta = await MOVER(
      criarRequisicao("POST", `/api/cards/${card.id}/mover`, {
        corpo: { para: "em_revisao" },
      }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(200);
    expect(await lerJson<CardApi>(resposta)).toMatchObject({ coluna: "em_revisao" });

    const detalhe = await lerJson<DetalheApi>(
      await GET(criarRequisicao("GET", `/api/cards/${card.id}`), contexto(card.id)),
    );
    expect(detalhe.historico).toHaveLength(2);
    expect(detalhe.historico[1]).toMatchObject({
      de: "a_fazer",
      para: "em_revisao",
      ator: "humano",
    });
  });

  it("mover para coluna inexistente responde 400 e não altera card nem histórico", async () => {
    const card = semearCard({ titulo: "Intacto", coluna: "backlog" }, "agente");
    const { POST: MOVER } = await rotasMover();
    const { GET: GET_DETALHE } = await rotasCardId();
    const { GET: GET_LISTA } = await rotasCards();

    const resposta = await MOVER(
      criarRequisicao("POST", `/api/cards/${card.id}/mover`, {
        authorization: autorizacaoAgente(),
        corpo: { para: "column-fantasma" },
      }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(400);
    expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
      erro: expect.any(String),
    });

    const detalhe = await lerJson<DetalheApi>(
      await GET_DETALHE(
        criarRequisicao("GET", `/api/cards/${card.id}`),
        contexto(card.id),
      ),
    );
    expect(detalhe.card).toMatchObject({ id: card.id, coluna: "backlog" });
    expect(detalhe.historico).toHaveLength(1);
    expect(detalhe.historico[0]).toMatchObject({ de: null, para: "backlog" });

    const lista = await lerJson<CardApi[]>(await GET_LISTA(criarRequisicao("GET", "/api/cards")));
    expect(lista).toHaveLength(1);
  });

  it("mover sem 'para' responde 400 e não altera o card", async () => {
    const card = semearCard({ titulo: "Sem destino", coluna: "backlog" });
    const { POST: MOVER } = await rotasMover();
    const { GET } = await rotasCardId();

    const resposta = await MOVER(
      criarRequisicao("POST", `/api/cards/${card.id}/mover`, { corpo: {} }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(400);
    expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
      erro: expect.any(String),
    });

    const detalhe = await lerJson<DetalheApi>(
      await GET(criarRequisicao("GET", `/api/cards/${card.id}`), contexto(card.id)),
    );
    expect(detalhe.card.coluna).toBe("backlog");
    expect(detalhe.historico).toHaveLength(1);
  });

  it("Bearer inválido responde 401 e não altera o card", async () => {
    const card = semearCard({ titulo: "Protegido", coluna: "backlog" });
    const { POST: MOVER } = await rotasMover();
    const { GET } = await rotasCardId();

    const resposta = await MOVER(
      criarRequisicao("POST", `/api/cards/${card.id}/mover`, {
        authorization: AUTHORIZATION_INVALIDA,
        corpo: { para: "concluido" },
      }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(401);
    expect(await lerJson(resposta)).toEqual({ erro: "nao_autenticado" });

    const detalhe = await lerJson<DetalheApi>(
      await GET(criarRequisicao("GET", `/api/cards/${card.id}`), contexto(card.id)),
    );
    expect(detalhe.card.coluna).toBe("backlog");
    expect(detalhe.historico).toHaveLength(1);
  });

  it("mover card inexistente responde 404 com {erro}", async () => {
    const { POST: MOVER } = await rotasMover();
    const id = "id-que-nao-existe";

    const resposta = await MOVER(
      criarRequisicao("POST", `/api/cards/${id}/mover`, { corpo: { para: "backlog" } }),
      contexto(id),
    );

    expect(resposta.status).toBe(404);
    expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
      erro: expect.any(String),
    });
  });

  it("mover para a mesma coluna é permitido e registra histórico", async () => {
    const card = semearCard({ titulo: "Parado", coluna: "backlog" });
    const { POST: MOVER } = await rotasMover();
    const { GET } = await rotasCardId();

    const resposta = await MOVER(
      criarRequisicao("POST", `/api/cards/${card.id}/mover`, {
        corpo: { para: "backlog" },
      }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(200);
    expect(await lerJson<CardApi>(resposta)).toMatchObject({ coluna: "backlog" });

    const detalhe = await lerJson<DetalheApi>(
      await GET(criarRequisicao("GET", `/api/cards/${card.id}`), contexto(card.id)),
    );
    expect(detalhe.historico).toHaveLength(2);
    expect(detalhe.historico[1]).toMatchObject({
      de: "backlog",
      para: "backlog",
      ator: "humano",
    });
  });
});
