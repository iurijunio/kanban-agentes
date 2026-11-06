#!/usr/bin/env python3
"""Say in plain language what of the harness is working. Run from the project root.

Touches nothing in the project. A red line says what is off and what it costs,
because a broken plugin only leaves a warning in the opencode log.
"""
import datetime as dt
import glob
import json
import os
import shutil
import subprocess
import sys

OK, WARN, FAIL = "[ok]  ", "[aviso]", "[ERRO]"
results = []


def report(level, text):
    results.append(level)
    print(f"{level} {text}")


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def check_files():
    for path, what in [("AGENTS.md", "instruções"), (".harness/harness.json", "configuração")]:
        report(OK if os.path.exists(path) else FAIL, f"{what}: {path}")
    if os.path.isdir(".claude"):
        for path, what in [(".claude/settings.json", "adaptador Claude Code"), (".mcp.json", "servidor MCP no Claude Code")]:
            report(OK if os.path.exists(path) else FAIL, f"{what}: {path}")
    if os.path.isdir(".opencode"):
        report(OK if os.path.exists(".opencode/opencode.json") else FAIL, "adaptador opencode: .opencode/opencode.json")


def check_agents():
    roster = read_json(".harness/agents/roster.json")
    adapters = [d for d in (".claude", ".opencode") if os.path.isdir(d)]
    missing = [name for name in roster if any(not os.path.exists(f"{d}/agents/{name}.md") for d in adapters)]
    if missing:
        report(FAIL, f"agentes sem arquivo no adaptador: {', '.join(missing)}")
    else:
        report(OK, f"{len(roster)} agentes gerados")
    known = {os.path.basename(os.path.dirname(p)) for p in glob.glob(".harness/skills/*/SKILL.md")}
    wanted = {skill for agent in roster.values() for skill in agent.get("skills", [])}
    absent = sorted(wanted - known)
    report(WARN if absent else OK, f"skills citadas e ausentes: {', '.join(absent)}" if absent else f"{len(known)} skills presentes")


def check_mcp():
    request = "\n".join(json.dumps(m) for m in [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18"}},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
    ]) + "\n"
    try:
        run = subprocess.run([sys.executable, ".harness/mcp/server.py"], input=request, capture_output=True, text=True, timeout=30)
        tools = json.loads(run.stdout.splitlines()[1])["result"]["tools"]
        report(OK, f"servidor MCP responde, com {len(tools)} ferramentas")
    except Exception as err:
        report(FAIL, f"servidor MCP não responde ({err}): memória e testes focados ficam indisponíveis")


def check_hooks():
    path = ".harness/log/plugin-heartbeat.json"
    if not os.path.exists(path):
        report(WARN, "os hooks nunca rodaram aqui. Abra uma sessão e rode o doctor de novo. Sem eles: sem sinais, sem teto de leitura, sem pedido de confirmação por agente (as regras de permissão continuam valendo)")
        return
    beat = read_json(path)
    when = dt.datetime.fromtimestamp(beat["t"] / 1000).strftime("%d/%m/%Y %H:%M")
    report(OK, f"hooks rodaram por último em {when}, via {beat.get('adapter', 'opencode')}. Se uma sessão nova não atualizar esta data, eles quebraram")


def check_version(config):
    pairs = [("claude", "tested_claude_code")] if os.path.isdir(".claude") else []
    if os.path.isdir(".opencode"):
        pairs.append(("opencode", "tested_opencode"))
    for binary_name, key in pairs:
        binary = shutil.which(binary_name)
        if not binary:
            report(WARN, f"{binary_name} não encontrado no PATH; versão não conferida")
            continue
        try:
            out = subprocess.run([binary, "--version"], capture_output=True, text=True, timeout=30).stdout.strip()
        except Exception as err:
            report(WARN, f"não consegui ler a versão de {binary_name}: {err}")
            continue
        tested = config.get(key, "?")
        report(OK if tested in out else WARN, f"{binary_name} no PATH: {out or '?'} (testado no {tested})")


def check_tools():
    for module, what in [("graphify", "Graphify (grafo de código)")]:
        found = subprocess.run([sys.executable, "-c", f"import {module}"], capture_output=True).returncode == 0
        report(OK if found else WARN, f"{what}: {'instalado' if found else 'não instalado; a busca cai para grep'}")
    report(OK if os.path.exists("graphify-out/graph.json") else WARN, "grafo gerado" if os.path.exists("graphify-out/graph.json") else "grafo não gerado: rode python -m graphify update .")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if not os.path.exists(".harness/harness.json"):
        print("Rode na raiz do projeto, onde está a pasta .harness.")
        return 2
    config = read_json(".harness/harness.json")
    print(f"Harness {config.get('version')}")
    check_files()
    check_agents()
    check_mcp()
    check_hooks()
    check_version(config)
    check_tools()
    failed = results.count(FAIL)
    print(f"\n{failed} erro(s), {results.count(WARN)} aviso(s).")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
