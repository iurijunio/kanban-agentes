import { resolverAtor } from "@/lib/auth";
import { moverCard } from "@/db/cards";

interface Contexto {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, ctx: Contexto) {
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

  const corpo = dados as Record<string, unknown>;
  const resultado = moverCard(id, corpo.para as string, { ator: ator.ator });
  if (!resultado.ok) {
    return Response.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return Response.json(resultado.dados, { status: 200 });
}
