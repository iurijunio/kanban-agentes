"use client";

import type { DragEvent } from "react";

import type { Card as CardDados } from "@/db/cards";

interface CardProps {
  card: CardDados;
  podeMoverAnterior: boolean;
  podeMoverProximo: boolean;
  onAbrir: (card: CardDados) => void;
  onEditar: (card: CardDados) => void;
  onExcluir: (card: CardDados) => void;
  onMoverAnterior: (card: CardDados) => void;
  onMoverProximo: (card: CardDados) => void;
}

const BOTAO_ACAO =
  "rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function Card({
  card,
  podeMoverAnterior,
  podeMoverProximo,
  onAbrir,
  onEditar,
  onExcluir,
  onMoverAnterior,
  onMoverProximo,
}: CardProps) {
  function iniciarArrasto(evento: DragEvent<HTMLElement>) {
    evento.dataTransfer.setData("text/plain", card.id);
    evento.dataTransfer.effectAllowed = "move";
  }

  return (
    <article
      draggable
      onDragStart={iniciarArrasto}
      onClick={() => onAbrir(card)}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-neutral-100">{card.titulo}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
            card.tipo === "bug"
              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {card.tipo}
        </span>
      </div>

      {card.descricao ? (
        <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-neutral-400">{card.descricao}</p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={`Mover "${card.titulo}" para a coluna anterior`}
            title="Mover para a coluna anterior"
            disabled={!podeMoverAnterior}
            onClick={(evento) => {
              evento.stopPropagation();
              onMoverAnterior(card);
            }}
            className={BOTAO_ACAO}
          >
            ←
          </button>
          <button
            type="button"
            aria-label={`Mover "${card.titulo}" para a próxima coluna`}
            title="Mover para a próxima coluna"
            disabled={!podeMoverProximo}
            onClick={(evento) => {
              evento.stopPropagation();
              onMoverProximo(card);
            }}
            className={BOTAO_ACAO}
          >
            →
          </button>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            aria-label={`Editar "${card.titulo}"`}
            title="Editar card"
            onClick={(evento) => {
              evento.stopPropagation();
              onEditar(card);
            }}
            className={BOTAO_ACAO}
          >
            Editar
          </button>
          <button
            type="button"
            aria-label={`Excluir "${card.titulo}"`}
            title="Excluir card"
            onClick={(evento) => {
              evento.stopPropagation();
              onExcluir(card);
            }}
            className={`${BOTAO_ACAO} text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/60`}
          >
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
}
