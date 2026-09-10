import assert from "node:assert/strict";
import test from "node:test";
import { fetchJson } from "../../src/data-loader.js";

test("retries a transient JSON request and returns the payload", async () => {
  let calls = 0;
  const payload = await fetchJson("levels.json", {
    attempts: 2,
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls++;
      if (calls === 1) throw new Error("offline");
      return { ok: true, async json() { return { ready: true }; } };
    }
  });
  assert.deepEqual(payload, { ready: true });
  assert.equal(calls, 2);
});

test("does not retry a permanent HTTP failure", async () => {
  let calls = 0;
  await assert.rejects(
    fetchJson("missing.json", {
      attempts: 3,
      retryDelayMs: 0,
      fetchImpl: async () => { calls++; return { ok: false, async json() { return {}; } }; }
    }),
    /Request failed: missing\.json/
  );
  assert.equal(calls, 1);
});

test("times out a stalled JSON request", async () => {
  await assert.rejects(
    fetchJson("slow.json", { attempts: 1, timeoutMs: 250, fetchImpl: async () => new Promise(() => {}) }),
    /Request timed out: slow\.json/
  );
});