import { resolverAtor } from "@/lib/auth";
import { criarCard, listarCards } from "@/db/cards";

export async function GET(request: Request) {
  const ator = resolverAtor(request);
  if (!("ator" in ator)) {
    return Response.json({ erro: ator.erro }, { status: ator.status });
  }

  const resultado = listarCards();
  if (!resultado.ok) {
    return Response.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return Response.json(resultado.dados, { status: 200 });
}

export async function POST(request: Request) {
  const ator = resolverAtor(request);
  if (!("ator" in ator)) {
    return Response.json({ erro: ator.erro }, { status: ator.status });
  }

  let dados: unknown;
  try {
    dados = await request.json();
  } catch {
    return Response.json({ erro: "corpo invalido" }, { status: 400 });
  }

  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) {
    return Response.json({ erro: "corpo invalido" }, { status: 400 });
  }

  const resultado = criarCard(dados as Record<string, unknown>, { ator: ator.ator });
  if (!resultado.ok) {
    return Response.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return Response.json(resultado.dados, { status: 201 });
}
