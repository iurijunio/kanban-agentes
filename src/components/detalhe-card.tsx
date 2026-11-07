"use client";

import type { Card as CardDados, Historico } from "@/db/cards";
import { ROTULOS } from "@/lib/colunas";

interface DetalheCardProps {
  card: CardDados;
  historico: Historico[];
  carregando: boolean;
  erro: string | null;
  onFechar: () => void;
}

function formatarData(valor: string): string {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR");
}

export function DetalheCard({
  card,
  historico,
  carregando,
  erro,
  onFechar,
}: DetalheCardProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalhe-titulo"
      onClick={onFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 dark:bg-black/70"
    >
      <div
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-neutral-900"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="detalhe-titulo" className="text-lg font-bold text-slate-900 dark:text-neutral-100">
            {card.titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar detalhe do card"
            title="Fechar"
            className="rounded px-2 py-0.5 text-xl leading-none text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            ×
          </button>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-neutral-400">Tipo</dt>
            <dd className="font-medium text-slate-800 dark:text-neutral-300">{card.tipo}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-neutral-400">Coluna</dt>
            <dd className="font-medium text-slate-800 dark:text-neutral-300">{ROTULOS[card.coluna]}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500 dark:text-neutral-400">Descrição</dt>
            <dd className="whitespace-pre-wrap text-slate-800 dark:text-neutral-300">
              {card.descricao && card.descricao.trim().length > 0 ? card.descricao : "—"}
            </dd>
          </div>
        </dl>

        <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
          Histórico
        </h3>

        {carregando ? (
          <p role="status" className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
            Carregando histórico…
          </p>
        ) : null}

        {erro ? (
          <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
            {erro}
          </p>
        ) : null}

        {!carregando && !erro && historico.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">Sem movimentos registrados.</p>
        ) : null}

        {!carregando && !erro && historico.length > 0 ? (
          <ol className="mt-2 space-y-2">
            {historico.map((item) => (
              <li key={item.id} className="rounded border border-slate-200 p-2 text-sm dark:border-neutral-800">
                <p className="font-medium text-slate-800 dark:text-neutral-300">
                  {item.de ? ROTULOS[item.de] : "criação"} → {ROTULOS[item.para]}
                </p>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {item.ator} · {formatarData(item.data_hora)}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
