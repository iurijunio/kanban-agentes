// Thin opencode adapter. Comfort only: permissions in the agents still hold if this breaks.
// Every hook is guarded, so a failure here never stops the session.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";

const guard = (fn) => (ev) => {
  try {
    return fn(ev);
  } catch {
    // Never break the user's session because of the harness.
  }
};

export default {
  id: "harness",
  async setup(ctx) {
    const root = ctx.location?.directory || process.cwd();
    const harness = join(root, ".harness");
    const logs = join(harness, "log");
    mkdirSync(logs, { recursive: true });
    const signal = (row) => appendFileSync(join(logs, "signals.jsonl"), JSON.stringify({ t: Date.now(), ...row }) + "\n");
    const text = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
    const config = JSON.parse(text(join(harness, "harness.json")) || "{}");
    const readLimit = config.read_limit_lines || 300;

    writeFileSync(join(logs, "plugin-heartbeat.json"), JSON.stringify({ t: Date.now(), version: ctx.app?.version }));

    await ctx.permission.hook("evaluate", guard((ev) => {
      if (ev.action === "subagent" && ev.effect === "ask" && existsSync(join(harness, "state", "plan-approved"))) ev.effect = "allow";
      if (ev.effect === "deny") signal({ kind: "denied", action: ev.action, session: ev.sessionID });
    }));

    await ctx.tool.hook("execute.before", guard((ev) => {
      const sig = createHash("sha1").update(ev.tool + JSON.stringify(ev.input ?? {})).digest("hex").slice(0, 10);
      signal({ kind: "call", tool: ev.tool, sig, session: ev.sessionID });
      if (ev.tool === "read" && ev.input && ev.input.limit == null && ev.input.offset == null) ev.input.limit = readLimit;
    }));

    await ctx.tool.hook("execute.after", guard((ev) => {
      if (ev.status !== "completed") signal({ kind: "tool_error", tool: ev.tool, session: ev.sessionID });
    }));
  },
};
