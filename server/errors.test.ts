import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "./errors.js";

test("DomainError carries a safe HTTP status and message", () => {
  const error = new DomainError(410, "Create a new plan.");
  assert.equal(error.status, 410);
  assert.equal(error.message, "Create a new plan.");
});
