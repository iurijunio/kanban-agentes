"use client";

import { useState, type FormEvent } from "react";

import type { Card as CardDados } from "@/db/cards";
import { COLUNAS, ROTULOS, type Coluna, type Tipo } from "@/lib/colunas";

export interface DadosCard {
  titulo: string;
  tipo: Tipo;
  descricao: string;
  coluna?: Coluna;
}

interface CardFormProps {
  modo: "criar" | "editar";
  colunaInicial?: Coluna;
  card?: CardDados;
  onSalvar: (dados: DadosCard) => Promise<string | null>;
  onCancelar: () => void;
}

const CAMPO =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export function CardForm({
  modo,
  colunaInicial,
  card,
  onSalvar,
  onCancelar,
}: CardFormProps) {
  const criar = modo === "criar";
  const [titulo, setTitulo] = useState(card?.titulo ?? "");
  const [tipo, setTipo] = useState<Tipo>(card?.tipo ?? "feature");
  const [descricao, setDescricao] = useState(card?.descricao ?? "");
  const [coluna, setColuna] = useState<Coluna>(colunaInicial ?? "backlog");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (titulo.trim().length === 0) {
      setErro("O título é obrigatório.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const mensagem = await onSalvar({
      titulo: titulo.trim(),
      tipo,
      descricao,
      ...(modo === "criar" ? { coluna } : {}),
    });

    setEnviando(false);
    if (mensagem) {
      setErro(mensagem);
    }
  }

  const rotulo = "flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-neutral-400";

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4">
        <label className={rotulo}>
          Título
          <input
            type="text"
            value={titulo}
            aria-required="true"
            maxLength={200}
            autoFocus
            onChange={(evento) => setTitulo(evento.target.value)}
            className={CAMPO}
          />
        </label>

        <label className={rotulo}>
          Tipo
          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as Tipo)}
            className={CAMPO}
          >
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
          </select>
        </label>

        {criar ? (
          <label className={rotulo}>
            Coluna inicial
            <select
              value={coluna}
              onChange={(evento) => setColuna(evento.target.value as Coluna)}
              className={CAMPO}
            >
              {COLUNAS.map((slug) => (
                <option key={slug} value={slug}>
                  {ROTULOS[slug]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={rotulo}>
          Descrição
          <textarea
            value={descricao}
            rows={4}
            onChange={(evento) => setDescricao(evento.target.value)}
            className={CAMPO}
          />
        </label>
      </div>

      {erro ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {enviando ? "Salvando…" : criar ? "Criar card" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:w-auto"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
