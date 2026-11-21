import assert from "node:assert/strict";
import test from "node:test";
import { runSchema } from "./schemas.js";

const base = {
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  context: "cluster",
  namespace: "orka-system",
  mode: "agent" as const,
  prompt: "review this",
};

test("Agent names accept Kubernetes DNS subdomains", () => {
  assert.equal(runSchema.safeParse({ ...base, agentName: "review.agent" }).success, true);
  assert.equal(runSchema.safeParse({ ...base, agentName: `${"a".repeat(63)}.${"b".repeat(63)}` }).success, true);
});

test("Agent names reject invalid DNS subdomains", () => {
  assert.equal(runSchema.safeParse({ ...base, agentName: "Review_Agent" }).success, false);
  assert.equal(runSchema.safeParse({ ...base, agentName: `a.${"b".repeat(64)}` }).success, false);
});
