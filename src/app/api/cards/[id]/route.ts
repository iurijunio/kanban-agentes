import { resolverAtor } from "@/lib/auth";
import { editarCard, excluirCard, historicoDeCard, obterCard } from "@/db/cards";

interface Contexto {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, ctx: Contexto) {
  const ator = resolverAtor(request);
  if (!("ator" in ator)) {
    return Response.json({ erro: ator.erro }, { status: ator.status });
  }

  const { id } = await ctx.params;

  const card = obterCard(id);
  if (!card.ok) {
    return Response.json({ erro: card.erro }, { status: card.status });
  }

  const historico = historicoDeCard(id);
  if (!historico.ok) {
    return Response.json({ erro: historico.erro }, { status: historico.status });
  }

  return Response.json({ card: card.dados, historico: historico.dados }, { status: 200 });
}

export async function PATCH(request: Request, ctx: Contexto) {
  const ator = resolverAtor(request);
  if (!("ator" in ator)) {
    return Response.json({ erro: ator.erro }, { status: ator.status });
  }

  const { id } = await ctx.params;

  let dados: unknown;
  try {
    dados = await request.json();
  } catch {
    return Response.json({ erro: "corpo invalido" }, { status: 400 });
  }

  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) {
    return Response.json({ erro: "corpo invalido" }, { status: 400 });
  }

  // A coluna é ignorada: mudança de coluna só acontece em POST /mover.
  const resultado = editarCard(id, dados as Record<string, unknown>);
  if (!resultado.ok) {
    return Response.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return Response.json(resultado.dados, { status: 200 });
}

export async function DELETE(request: Request, ctx: Contexto) {
  const ator = resolverAtor(request);
  if (!("ator" in ator)) {
    return Response.json({ erro: ator.erro }, { status: ator.status });
  }

  const { id } = await ctx.params;

  const resultado = excluirCard(id);
  if (!resultado.ok) {
    return Response.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return new Response(null, { status: 204 });
}
