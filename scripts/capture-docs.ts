import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page, type Route } from "playwright";

const port = 4189;
const origin = `http://127.0.0.1:${port}`;
const assets = join(process.cwd(), "docs", "assets");
const scratch = await mkdtemp(join(tmpdir(), "orka-explorer-docs-"));
let preview: ChildProcess | undefined;

const now = "2026-11-21T06:00:00.000Z";
const report = {
  context: {
    name: "kind-orka-lab",
    cluster: "kind-orka-lab",
    server: "https://127.0.0.1:6443",
    namespace: "orka-system",
    current: true,
  },
  crawledAt: now,
  kubernetesVersion: "v1.36.5",
  nodeCount: 3,
  defaultStorageClass: "standard",
  orka: {
    state: "ready",
    installed: true,
    namespace: "orka-system",
    releaseName: "orka",
    version: "0.3.0",
    crdCount: 27,
    expectedCrdCount: 27,
    controllerReady: true,
    message: "Orka is installed and the controller is ready.",
  },
  counts: {
    tasks: 5,
    agents: 4,
    providers: 2,
    monitors: 1,
    runtimePools: 2,
  },
  tasks: [
    {
      uid: "task-review",
      name: "review-auth-flow",
      namespace: "orka-system",
      type: "agent",
      phase: "Running",
      agentName: "luna",
      createdAt: "2026-11-21T05:42:00.000Z",
      startedAt: "2026-11-21T05:43:00.000Z",
      attempts: 1,
    },
    {
      uid: "task-issue",
      name: "implement-issue-482",
      namespace: "orka-system",
      type: "agent",
      phase: "Pending",
      agentName: "mako",
      createdAt: "2026-11-21T05:51:00.000Z",
      attempts: 0,
    },
    {
      uid: "task-smoke",
      name: "console-smoke-550e8400",
      namespace: "orka-system",
      type: "container",
      phase: "Succeeded",
      createdAt: "2026-11-21T05:30:00.000Z",
      startedAt: "2026-11-21T05:30:02.000Z",
      completedAt: "2026-11-21T05:30:09.000Z",
      attempts: 1,
    },
    {
      uid: "task-docs",
      name: "publish-docs",
      namespace: "orka-system",
      type: "ai",
      phase: "Failed",
      agentName: "pip",
      createdAt: "2026-11-21T05:20:00.000Z",
      completedAt: "2026-11-21T05:23:00.000Z",
      attempts: 1,
    },
    {
      uid: "task-nightly",
      name: "nightly-security-scan",
      namespace: "orka-system",
      type: "agent",
      phase: "Scheduled",
      agentName: "nori",
      createdAt: "2026-11-20T22:00:00.000Z",
      attempts: 0,
    },
  ],
  agents: [
    { uid: "agent-luna", name: "luna", namespace: "orka-system", ready: true, runtime: "codex", taskType: "agent", model: "gpt-5.3-codex", activeTasks: 1, lastUsed: now },
    { uid: "agent-mako", name: "mako", namespace: "orka-system", ready: true, runtime: "opencode", taskType: "agent", model: "gpt-5.2", activeTasks: 1, lastUsed: now },
    { uid: "agent-pip", name: "pip", namespace: "orka-system", ready: false, runtime: "native", taskType: "ai", model: "claude-sonnet-4-5", activeTasks: 0, lastUsed: now },
    { uid: "agent-nori", name: "nori", namespace: "orka-system", ready: true, runtime: "claude", taskType: "agent", model: "claude-opus-4-5", activeTasks: 0, lastUsed: now },
  ],
  components: [
    { name: "orka-controller", kind: "Deployment", ready: true, detail: "1/1 replicas ready" },
    { name: "orka-workspace-publisher", kind: "Deployment", ready: true, detail: "1/1 replicas ready" },
    { name: "orka-scm-egress-proxy", kind: "Deployment", ready: true, detail: "1/1 replicas ready" },
    { name: "orka", kind: "Service", ready: true, detail: "ClusterIP API service" },
    { name: "orka-store", kind: "PersistentVolumeClaim", ready: true, detail: "Bound" },
  ],
  permissions: [
    { resource: "tasks.core.orka.ai", verb: "list", allowed: true },
    { resource: "tasks.core.orka.ai", verb: "create", allowed: true },
    { resource: "agents.core.orka.ai", verb: "list", allowed: true },
  ],
  warnings: [],
};

try {
  await mkdir(assets, { recursive: true });
  preview = spawn("bunx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  try {
    const screenshotPage = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
    await configurePage(screenshotPage);
    await screenshotPage.goto(`${origin}/#cap=documentation-capture-capability-000000000000`, { waitUntil: "networkidle" });
    await screenshotPage.getByRole("heading", { name: "Orka is ready for action." }).waitFor();
    await screenshotPage.screenshot({ path: join(assets, "overview.png"), fullPage: true, animations: "disabled" });
    await screenshotPage.close();

    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    await configurePage(page);
    await page.goto(`${origin}/#cap=documentation-capture-capability-000000000000`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Orka is ready for action." }).waitFor();
    let frame = 0;
    frame = await captureFrames(page, scratch, frame, 5);
    await page.getByRole("link", { name: "Agent pod" }).click();
    await page.getByRole("heading", { name: "The Orka pod" }).waitFor();
    frame = await captureFrames(page, scratch, frame, 8);
    await page.getByRole("button", { name: "Cast status rod" }).click();
    frame = await captureFrames(page, scratch, frame, 8);
    await page.getByRole("button", { name: "luna" }).click();
    await page.getByText("Status caught").waitFor();
    frame = await captureFrames(page, scratch, frame, 16);
    await captureFrames(page, scratch, frame, 10, 0);
    await page.close();
    await makeGif(join(scratch, "frame-%03d.png"), join(assets, "agent-pod.gif"));
  } finally {
    await browser.close();
  }

  const files = await readdir(assets);
  console.log(`Captured documentation assets: ${files.sort().join(", ")}`);
} finally {
  preview?.kill("SIGTERM");
  await rm(scratch, { recursive: true, force: true });
}

async function configurePage(page: Page): Promise<void> {
  await page.addInitScript((timestamp) => {
    Date.now = () => timestamp;
  }, Date.parse(now));
  await page.route("**/api/console/**", routeConsoleApi);
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

async function routeConsoleApi(route: Route): Promise<void> {
  const path = new URL(route.request().url()).pathname;
  if (path === "/api/console/contexts") {
    await route.fulfill({ json: { items: [report.context] } });
    return;
  }
  if (path === "/api/console/crawl") {
    await route.fulfill({ json: report });
    return;
  }
  await route.fulfill({ status: 404, json: { message: "Not part of documentation capture." } });
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite preview did not start in time.");
}

async function makeGif(input: string, output: string): Promise<void> {
  const filter = "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle";
  await run("ffmpeg", ["-y", "-framerate", "10", "-i", input, "-vf", filter, "-loop", "0", output]);
}

async function captureFrames(page: Page, directory: string, start: number, count: number, delayMs = 70): Promise<number> {
  let frame = start;
  for (let index = 0; index < count; index += 1) {
    await page.screenshot({ path: join(directory, `frame-${String(frame).padStart(3, "0")}.png`) });
    frame += 1;
    if (delayMs > 0) await page.waitForTimeout(delayMs);
  }
  return frame;
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}
