/**
 * Run a rig sample with a stub Copilot SDK client that returns shape-conforming output.
 * Usage: npx vitest run scripts/run-sample.test.ts -- --sample 02
 *    or: npm run sample -- 02
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readdirSync } from "fs";
import { resolve } from "path";

const mocks = vi.hoisted(() => {
  let sendAndWaitImpl: (request: { prompt: string }) => unknown | Promise<unknown> = async () => ({ text: "stub response" });
  const createSession = vi.fn(async () => ({
    sendAndWait: async (request: { prompt: string }) => {
      const response = await sendAndWaitImpl(request);
      return typeof response === "string" ? response : JSON.stringify(response);
    },
  }));
  const forUri = vi.fn(() => ({ kind: "uri", url: "localhost:7777" }));
  const forStdio = vi.fn(() => ({ kind: "stdio" }));
  const CopilotClient = function () {
    return { createSession };
  };
  const setSendAndWaitImpl = (impl: (request: { prompt: string }) => unknown | Promise<unknown>) => {
    sendAndWaitImpl = impl;
  };
  return { createSession, forUri, forStdio, CopilotClient, setSendAndWaitImpl };
});

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: mocks.CopilotClient,
  RuntimeConnection: { forUri: mocks.forUri, forStdio: mocks.forStdio },
}));

function generateOutput(prompt: string): unknown {
  const match = prompt.match(/<output_schema>([\s\S]*?)<\/output_schema>/);
  if (!match) return { text: "stub response" };
  const schema = match[1].trim();
  return parseTypeText(schema);
}

function parseTypeText(text: string): unknown {
  text = text.trim();

  // Union/enum: "value1" | "value2" | ...
  if (text.includes("|") && !text.startsWith("{")) {
    const parts = text.split("|").map((s) => s.trim());
    // Pick first non-null
    for (const p of parts) {
      if (p === "null") continue;
      if (p.startsWith('"') && p.endsWith('"')) return p.slice(1, -1);
      if (p === "string") return "stub";
      if (p === "number") return 0;
      if (p === "boolean") return true;
      return p;
    }
    return null;
  }

  // Array: type[]
  if (text.endsWith("[]")) return [];

  // Primitives
  if (text === "string") return "stub";
  if (text === "number") return 0;
  if (text === "boolean") return true;
  if (text === "unknown") return null;

  // Object: { ... }
  if (text.startsWith("{")) {
    const inner = text.slice(1, text.lastIndexOf("}")).trim();
    if (!inner) return {};
    const result: Record<string, unknown> = {};
    const fields = splitFields(inner);
    for (const field of fields) {
      // [key: string]: type  (wildcard/record)
      const wildcardMatch = field.match(/^\[key:\s*string\]\s*:\s*([\s\S]+?);?\s*$/);
      if (wildcardMatch) {
        result["example"] = parseTypeText(wildcardMatch[1].replace(/;\s*$/, "").trim());
        continue;
      }
      // key?: type;  or  key: type;  (type may be multi-line for nested objects)
      const fieldMatch = field.match(/^(\w+)(\?)?\s*:\s*([\s\S]+?);?\s*$/);
      if (fieldMatch) {
        const [, key, , type] = fieldMatch;
        result[key] = parseTypeText(type.replace(/;\s*$/, "").trim());
      }
    }
    if (Object.keys(result).length === 0) return { text: "stub" };
    return result;
  }

  // Quoted literal
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  // Numeric literal
  if (/^\d+$/.test(text)) return Number(text);
  // Boolean literal
  if (text === "true") return true;
  if (text === "false") return false;

  return "stub";
}

function splitFields(inner: string): string[] {
  const fields: string[] = [];
  let depth = 0;
  let current = "";
  for (const line of inner.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    current += (current ? "\n" : "") + trimmed;
    depth += (trimmed.match(/\{/g) || []).length;
    depth -= (trimmed.match(/\}/g) || []).length;
    // A field is complete when we're back to depth 0 and line ends with ;
    if (depth <= 0 && (trimmed.endsWith(";") || trimmed.endsWith("}"))) {
      fields.push(current);
      current = "";
      depth = 0;
    }
  }
  if (current) fields.push(current);
  return fields;
}

// Determine which samples to run
const sampleDir = resolve(__dirname, "../skills/rig/samples");
const allFiles = readdirSync(sampleDir)
  .filter((f) => f.endsWith(".ts"))
  .sort();

const filter = process.env["RIG_SAMPLE"];
const targets = filter
  ? allFiles.filter((f) => f.includes(filter))
  : allFiles;

beforeEach(() => {
  mocks.createSession.mockClear();
  mocks.setSendAndWaitImpl(async ({ prompt }) => generateOutput(prompt));
});

describe("samples", () => {
  for (const file of targets) {
    it(file, async () => {
      // Dynamically import the sample — vitest resolves "rig" via alias
      // Samples use top-level await so the import itself runs them
      const start = performance.now();
      try {
        await import(`../skills/rig/samples/${file}`);
      } catch (e: any) {
        // Timeout/abort errors are expected for samples that test those features
        if (e?.message?.includes("Timed out") || e?.name === "AbortError") {
          // expected
        } else {
          throw e;
        }
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  }
});
