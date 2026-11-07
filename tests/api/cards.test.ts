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
  semearCard,
  TOKEN_VALIDO,
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

const CORPO_VALIDO = { titulo: "Tarefa", tipo: "feature", coluna: "backlog" };

describe("API /api/cards", () => {
  beforeEach(() => {
    prepararAmbiente();
  });

  afterEach(() => {
    encerrarAmbiente();
  });

  it("GET lista sem Authorization responde 200 com array vazio", async () => {
    const { GET } = await rotasCards();

    const resposta = await GET(criarRequisicao("GET", "/api/cards"));

    expect(resposta.status).toBe(200);
    expect(await lerJson<CardApi[]>(resposta)).toEqual([]);
  });

  it("POST sem Authorization cria 201 e histórico com ator humano", async () => {
    const { POST } = await rotasCards();

    const resposta = await POST(
      criarRequisicao("POST", "/api/cards", { corpo: CORPO_VALIDO }),
    );

    expect(resposta.status).toBe(201);
    const card = await lerJson<CardApi>(resposta);
    expect(card).toMatchObject({
      titulo: "Tarefa",
      tipo: "feature",
      coluna: "backlog",
    });
    expect(typeof card.id).toBe("string");

    const { GET: GET_DETALHE } = await rotasCardId();
    const detalhe = await GET_DETALHE(
      criarRequisicao("GET", `/api/cards/${card.id}`),
      contexto(card.id),
    );

    expect(detalhe.status).toBe(200);
    const { card: lido, historico } = await lerJson<DetalheApi>(detalhe);
    expect(lido.id).toBe(card.id);
    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({
      card_id: card.id,
      de: null,
      para: "backlog",
      ator: "humano",
    });
    expect(typeof historico[0].data_hora).toBe("string");
  });

  it("Bearer válido cria, lista e detalha com histórico de agente", async () => {
    const { GET, POST } = await rotasCards();
    const auth = { authorization: autorizacaoAgente() };

    const criada = await POST(
      criarRequisicao("POST", "/api/cards", {
        ...auth,
        corpo: { titulo: "Do agente", tipo: "bug", coluna: "a_fazer", descricao: "original" },
      }),
    );
    expect(criada.status).toBe(201);
    const card = await lerJson<CardApi>(criada);

    const lista = await GET(criarRequisicao("GET", "/api/cards", auth));
    expect(lista.status).toBe(200);
    expect((await lerJson<CardApi[]>(lista)).map((item) => item.id)).toContain(card.id);

    const { GET: GET_DETALHE } = await rotasCardId();
    const detalhe = await GET_DETALHE(
      criarRequisicao("GET", `/api/cards/${card.id}`, auth),
      contexto(card.id),
    );
    expect(detalhe.status).toBe(200);
    const corpo = await lerJson<DetalheApi>(detalhe);
    expect(corpo.card).toMatchObject({
      id: card.id,
      titulo: "Do agente",
      descricao: "original",
      tipo: "bug",
      coluna: "a_fazer",
    });
    expect(corpo.historico).toHaveLength(1);
    expect(corpo.historico[0]).toMatchObject({
      de: null,
      para: "a_fazer",
      ator: "agente",
    });
  });

  it("Bearer válido edita titulo/descricao/tipo e mantém a coluna", async () => {
    const card = semearCard(
      { titulo: "Antes", tipo: "feature", coluna: "em_andamento", descricao: "antiga" },
      "agente",
    );
    const { PATCH, GET: GET_DETALHE } = await rotasCardId();
    const auth = { authorization: autorizacaoAgente() };

    const resposta = await PATCH(
      criarRequisicao("PATCH", `/api/cards/${card.id}`, {
        ...auth,
        // coluna vai no corpo de propósito: PATCH não pode mover.
        corpo: { titulo: "Depois", descricao: "nova", tipo: "bug", coluna: "concluido" },
      }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(200);
    const editado = await lerJson<CardApi>(resposta);
    expect(editado).toMatchObject({
      id: card.id,
      titulo: "Depois",
      descricao: "nova",
      tipo: "bug",
      coluna: "em_andamento",
    });

    const detalhe = await GET_DETALHE(
      criarRequisicao("GET", `/api/cards/${card.id}`, auth),
      contexto(card.id),
    );
    const { card: lido, historico } = await lerJson<DetalheApi>(detalhe);
    expect(lido.coluna).toBe("em_andamento");
    // Edição não gera histórico (só criação e movimento).
    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({ de: null, para: "em_andamento" });
  });

  it("DELETE responde 204 sem corpo, remove da lista e o detalhe vira 404", async () => {
    const card = semearCard({ titulo: "Some", coluna: "concluido" });
    const { GET } = await rotasCards();
    const { GET: GET_DETALHE, DELETE } = await rotasCardId();

    const resposta = await DELETE(
      criarRequisicao("DELETE", `/api/cards/${card.id}`),
      contexto(card.id),
    );

    expect(resposta.status).toBe(204);
    expect(await resposta.text()).toBe("");

    const lista = await lerJson<CardApi[]>(await GET(criarRequisicao("GET", "/api/cards")));
    expect(lista.map((item) => item.id)).not.toContain(card.id);

    const detalhe = await GET_DETALHE(
      criarRequisicao("GET", `/api/cards/${card.id}`),
      contexto(card.id),
    );
    expect(detalhe.status).toBe(404);
    expect(await lerJson<{ erro: string }>(detalhe)).toMatchObject({ erro: expect.any(String) });
  });

  it("Bearer inválido em POST responde 401 nao_autenticado e não cria nada", async () => {
    const { GET, POST } = await rotasCards();

    const resposta = await POST(
      criarRequisicao("POST", "/api/cards", {
        authorization: AUTHORIZATION_INVALIDA,
        corpo: CORPO_VALIDO,
      }),
    );

    expect(resposta.status).toBe(401);
    expect(await lerJson(resposta)).toEqual({ erro: "nao_autenticado" });

    const lista = await lerJson<CardApi[]>(await GET(criarRequisicao("GET", "/api/cards")));
    expect(lista).toEqual([]);
  });

  it("Authorization presente mas sem token responde 401", async () => {
    const { POST } = await rotasCards();

    for (const authorization of ["Bearer", "Bearer ", ""]) {
      const resposta = await POST(
        criarRequisicao("POST", "/api/cards", { authorization, corpo: CORPO_VALIDO }),
      );
      expect(resposta.status, `authorization=${JSON.stringify(authorization)}`).toBe(401);
      expect(await lerJson(resposta)).toEqual({ erro: "nao_autenticado" });
    }
  });

  it("sem AGENT_API_TOKEN no env, Bearer qualquer responde 401", async () => {
    delete process.env.AGENT_API_TOKEN;
    const { GET, POST } = await rotasCards();

    try {
      const resposta = await POST(
        criarRequisicao("POST", "/api/cards", {
          authorization: `Bearer ${TOKEN_VALIDO}`,
          corpo: CORPO_VALIDO,
        }),
      );

      expect(resposta.status).toBe(401);
      expect(await lerJson(resposta)).toEqual({ erro: "nao_autenticado" });

      const lista = await lerJson<CardApi[]>(await GET(criarRequisicao("GET", "/api/cards")));
      expect(lista).toEqual([]);
    } finally {
      process.env.AGENT_API_TOKEN = TOKEN_VALIDO;
    }
  });

  it("POST sem titulo (ou só espaços) responde 400 e não cria nada", async () => {
    const { GET, POST } = await rotasCards();

    for (const corpo of [
      { tipo: "feature", coluna: "backlog" },
      { titulo: "   ", tipo: "feature", coluna: "backlog" },
    ]) {
      const resposta = await POST(criarRequisicao("POST", "/api/cards", { corpo }));
      expect(resposta.status).toBe(400);
      expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
        erro: expect.any(String),
      });
    }

    const lista = await lerJson<CardApi[]>(await GET(criarRequisicao("GET", "/api/cards")));
    expect(lista).toEqual([]);
  });

  it("POST com tipo inválido responde 400", async () => {
    const { POST } = await rotasCards();

    const resposta = await POST(
      criarRequisicao("POST", "/api/cards", {
        corpo: { titulo: "Tarefa", tipo: "chore", coluna: "backlog" },
      }),
    );

    expect(resposta.status).toBe(400);
    expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
      erro: expect.any(String),
    });
  });

  it("POST com coluna inválida responde 400", async () => {
    const { GET, POST } = await rotasCards();

    const resposta = await POST(
      criarRequisicao("POST", "/api/cards", {
        corpo: { titulo: "Tarefa", tipo: "feature", coluna: "column-fantasma" },
      }),
    );

    expect(resposta.status).toBe(400);
    expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
      erro: expect.any(String),
    });
    expect(await lerJson<CardApi[]>(await GET(criarRequisicao("GET", "/api/cards")))).toEqual([]);
  });

  it("PATCH com titulo vazio responde 400", async () => {
    const card = semearCard();
    const { PATCH } = await rotasCardId();

    const resposta = await PATCH(
      criarRequisicao("PATCH", `/api/cards/${card.id}`, { corpo: { titulo: "  " } }),
      contexto(card.id),
    );

    expect(resposta.status).toBe(400);
    expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
      erro: expect.any(String),
    });
  });

  it("GET/PATCH/DELETE de id inexistente respondem 404 com {erro}", async () => {
    const { GET, PATCH, DELETE } = await rotasCardId();
    const id = "id-que-nao-existe";

    const respostas = [
      await GET(criarRequisicao("GET", `/api/cards/${id}`), contexto(id)),
      await PATCH(
        criarRequisicao("PATCH", `/api/cards/${id}`, { corpo: { titulo: "Fantasma" } }),
        contexto(id),
      ),
      await DELETE(criarRequisicao("DELETE", `/api/cards/${id}`), contexto(id)),
    ];

    for (const resposta of respostas) {
      expect(resposta.status).toBe(404);
      expect(await lerJson<{ erro: string }>(resposta)).toMatchObject({
        erro: expect.any(String),
      });
    }
  });

  it("GET lista ordena por coluna fixa (backlog primeiro, concluido por último)", async () => {
    // Semeados fora de ordem de propósito.
    const concluido = semearCard({ titulo: "Concluído", coluna: "concluido" });
    const backlog = semearCard({ titulo: "Backlog", coluna: "backlog" });
    const aFazer = semearCard({ titulo: "A fazer", coluna: "a_fazer" });

    const { GET } = await rotasCards();
    const lista = await lerJson<CardApi[]>(await GET(criarRequisicao("GET", "/api/cards")));

    expect(lista.map((card) => card.id)).toEqual([backlog.id, aFazer.id, concluido.id]);
  });
});
