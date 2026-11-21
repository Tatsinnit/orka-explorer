import { z } from "zod";

export const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
export const dnsSubdomain = z.string().max(253).refine(
  (value) => value.split(".").every((label) => dnsLabel.test(label)),
  "Agent name must be a Kubernetes DNS subdomain.",
);

export const crawlSchema = z.object({
  context: z.string().min(1).max(253),
  namespace: z.string().regex(dnsLabel).optional(),
}).strict();

export const runSchema = z.object({
  idempotencyKey: z.string().uuid(),
  context: z.string().min(1).max(253),
  namespace: z.string().regex(dnsLabel),
  mode: z.enum(["smoke", "agent"]),
  agentName: dnsSubdomain.optional(),
  prompt: z.string().trim().min(1).max(8_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.mode === "agent" && (!value.agentName || !value.prompt)) {
    context.addIssue({ code: "custom", message: "Agent runs require an existing agent and prompt." });
  }
});

export const planSchema = z.object({ context: z.string().min(1).max(253) }).strict();
export const installSchema = z.object({
  planId: z.string().min(20).max(64),
  context: z.string().min(1).max(253),
  confirmation: z.string().min(1).max(253),
  acknowledgeClusterAccess: z.literal(true),
  acknowledgePersistence: z.literal(true),
}).strict();
