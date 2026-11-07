"use client";

import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from "react";

import { Card } from "@/components/card";
import { CardForm, type DadosCard } from "@/components/card-form";
import { DetalheCard } from "@/components/detalhe-card";
import type { Card as CardDados, Historico } from "@/db/cards";
import { COLUNAS, ROTULOS, type Coluna } from "@/lib/colunas";

interface DetalheAberto {
  id: string;
  card: CardDados;
  historico: Historico[];
}

const BOTAO_COLUNA =
  "rounded border border-dashed border-slate-400 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800";

async function lerErro(resposta: Response): Promise<string> {
  try {
    const dados: unknown = await resposta.json();
    if (typeof dados === "object" && dados !== null && "erro" in dados) {
      const erro = (dados as { erro: unknown }).erro;
      if (typeof erro === "string" && erro.length > 0) {
        return erro;
      }
    }
  } catch {
    // resposta sem corpo JSON
  }
  return `Falha na requisição (${resposta.status}).`;
}

type ResultadoCards = { ok: true; cards: CardDados[] } | { ok: false; erro: string };

interface PainelLateralProps {
  idTitulo: string;
  titulo: string;
  descricao: string;
  rotuloFechar: string;
  onFechar: () => void;
  children: ReactNode;
}

function PainelLateral({
  idTitulo,
  titulo,
  descricao,
  rotuloFechar,
  onFechar,
  children,
}: PainelLateralProps) {
  return (
    <div
      onClick={onFechar}
      onKeyDown={(evento) => {
        if (evento.key === "Escape") {
          onFechar();
        }
      }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/70"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className="painel-entrar h-full w-full overflow-y-auto border-l border-slate-200 bg-white shadow-2xl sm:max-w-md dark:border-neutral-800 dark:bg-neutral-950"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2
              id={idTitulo}
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-neutral-100"
            >
              {titulo}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">{descricao}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label={rotuloFechar}
            title="Fechar"
            className="rounded p-2 text-2xl leading-none text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

async function buscarCards(): Promise<ResultadoCards> {
  try {
    const resposta = await fetch("/api/cards", { cache: "no-store" });
    if (!resposta.ok) {
      return { ok: false, erro: await lerErro(resposta) };
    }
    return { ok: true, cards: (await resposta.json()) as CardDados[] };
  } catch {
    return { ok: false, erro: "Não foi possível carregar os cards." };
  }
}

export function Board() {
  const [cards, setCards] = useState<CardDados[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [criandoEm, setCriandoEm] = useState<Coluna | null>(null);
  const [editando, setEditando] = useState<CardDados | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheAberto | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);

  const carregarCards = useCallback(async () => {
    const resultado = await buscarCards();
    if (resultado.ok) {
      setCards(resultado.cards);
      setErro(null);
    } else {
      setErro(resultado.erro);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;

    void buscarCards().then((resultado) => {
      if (!ativo) {
        return;
      }
      if (resultado.ok) {
        setCards(resultado.cards);
        setErro(null);
      } else {
        setErro(resultado.erro);
      }
      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, []);

  async function carregarDetalhe(id: string) {
    setCarregandoDetalhe(true);
    setErroDetalhe(null);
    try {
      const resposta = await fetch(`/api/cards/${id}`, { cache: "no-store" });
      if (!resposta.ok) {
        setErroDetalhe(await lerErro(resposta));
        return;
      }
      const dados = (await resposta.json()) as { card: CardDados; historico: Historico[] };
      setDetalhe((atual) =>
        atual && atual.id === id
          ? { id, card: dados.card, historico: dados.historico }
          : atual,
      );
    } catch {
      setErroDetalhe("Não foi possível carregar o card.");
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  function abrirDetalhe(card: CardDados) {
    setDetalhe({ id: card.id, card, historico: [] });
    void carregarDetalhe(card.id);
  }

  async function criar(dados: DadosCard): Promise<string | null> {
    try {
      const resposta = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: dados.titulo,
          tipo: dados.tipo,
          descricao: dados.descricao,
          coluna: dados.coluna ?? criandoEm,
        }),
      });
      if (!resposta.ok) {
        return await lerErro(resposta);
      }
      setCriandoEm(null);
      await carregarCards();
      return null;
    } catch {
      return "Não foi possível criar o card.";
    }
  }

  async function salvarEdicao(dados: DadosCard): Promise<string | null> {
    if (!editando) {
      return "Nenhum card em edição.";
    }

    try {
      const resposta = await fetch(`/api/cards/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: dados.titulo,
          tipo: dados.tipo,
          descricao: dados.descricao,
        }),
      });
      if (!resposta.ok) {
        return await lerErro(resposta);
      }
      const id = editando.id;
      setEditando(null);
      await carregarCards();
      if (detalhe?.id === id) {
        await carregarDetalhe(id);
      }
      return null;
    } catch {
      return "Não foi possível salvar o card.";
    }
  }

  async function excluir(card: CardDados) {
    if (!window.confirm(`Excluir o card "${card.titulo}"?`)) {
      return;
    }

    setErro(null);
    try {
      const resposta = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (!resposta.ok) {
        setErro(await lerErro(resposta));
        return;
      }
      if (detalhe?.id === card.id) {
        setDetalhe(null);
      }
      await carregarCards();
    } catch {
      setErro("Não foi possível excluir o card.");
    }
  }

  async function mover(card: CardDados, para: Coluna) {
    setErro(null);
    try {
      const resposta = await fetch(`/api/cards/${card.id}/mover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ para }),
      });
      if (!resposta.ok) {
        setErro(await lerErro(resposta));
        return;
      }
      await carregarCards();
      if (detalhe?.id === card.id) {
        await carregarDetalhe(card.id);
      }
    } catch {
      setErro("Não foi possível mover o card.");
    }
  }

  function aoSoltar(evento: DragEvent<HTMLElement>, coluna: Coluna) {
    evento.preventDefault();
    const id = evento.dataTransfer.getData("text/plain");
    if (!id) {
      return;
    }
    const card = cards.find((item) => item.id === id);
    if (!card || card.coluna === coluna) {
      return;
    }
    void mover(card, coluna);
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-neutral-100">
            Kanban — Tasks com Agentes
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setCarregando(true);
            void carregarCards();
          }}
          disabled={carregando}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          {carregando ? "Atualizando…" : "Atualizar"}
        </button>
      </header>

      {erro ? (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
        >
          {erro}
        </p>
      ) : null}

      {criandoEm ? (
        <PainelLateral
          idTitulo="novo-card-titulo"
          titulo="Novo card"
          descricao={`Coluna: ${ROTULOS[criandoEm]}`}
          rotuloFechar="Fechar novo card"
          onFechar={() => setCriandoEm(null)}
        >
          <CardForm
            key={criandoEm}
            modo="criar"
            colunaInicial={criandoEm}
            onSalvar={criar}
            onCancelar={() => setCriandoEm(null)}
          />
        </PainelLateral>
      ) : null}

      {editando ? (
        <PainelLateral
          idTitulo="editar-card-titulo"
          titulo="Editar card"
          descricao={`Coluna: ${ROTULOS[editando.coluna]}`}
          rotuloFechar="Fechar edição do card"
          onFechar={() => setEditando(null)}
        >
          <CardForm
            key={editando.id}
            modo="editar"
            card={editando}
            onSalvar={salvarEdicao}
            onCancelar={() => setEditando(null)}
          />
        </PainelLateral>
      ) : null}

      {carregando && cards.length === 0 ? (
        <p role="status" className="text-sm text-slate-600 dark:text-neutral-400">
          Carregando cards…
        </p>
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUNAS.map((coluna, indice) => {
          const cardsDaColuna = cards.filter((card) => card.coluna === coluna);

          return (
            <section
              key={coluna}
              onDragOver={(evento) => {
                evento.preventDefault();
                evento.dataTransfer.dropEffect = "move";
              }}
              onDrop={(evento) => aoSoltar(evento, coluna)}
              className="flex w-72 min-w-72 shrink-0 flex-col gap-3 rounded-xl bg-slate-200/70 p-3 dark:bg-neutral-900/70"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-neutral-300">
                  {ROTULOS[coluna]}
                </h2>
                <span
                  className="rounded-full bg-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-neutral-800 dark:text-neutral-300"
                  aria-label={`${cardsDaColuna.length} cards em ${ROTULOS[coluna]}`}
                >
                  {cardsDaColuna.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditando(null);
                  setCriandoEm(coluna);
                }}
                aria-label={`Criar card em ${ROTULOS[coluna]}`}
                title={`Criar card em ${ROTULOS[coluna]}`}
                className={BOTAO_COLUNA}
              >
                + Novo card
              </button>

              {cardsDaColuna.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
                  Nenhum card.
                </p>
              ) : (
                cardsDaColuna.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    podeMoverAnterior={indice > 0}
                    podeMoverProximo={indice < COLUNAS.length - 1}
                    onAbrir={abrirDetalhe}
                    onEditar={(item) => {
                      setCriandoEm(null);
                      setEditando(item);
                    }}
                    onExcluir={(item) => void excluir(item)}
                    onMoverAnterior={(item) => void mover(item, COLUNAS[indice - 1])}
                    onMoverProximo={(item) => void mover(item, COLUNAS[indice + 1])}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>

      {detalhe ? (
        <DetalheCard
          card={detalhe.card}
          historico={detalhe.historico}
          carregando={carregandoDetalhe}
          erro={erroDetalhe}
          onFechar={() => setDetalhe(null)}
        />
      ) : null}
    </div>
  );
}
