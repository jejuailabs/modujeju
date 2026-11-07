import type { Companion, Region } from "../types";
import { regionRankingMessages, validateAiRegionOrder, type RegionCandidate } from "./ai-regions";

export type BrowserAiErrorCode = "unsupported" | "invalid-result" | "download-or-memory" | "cancelled";
export class BrowserAiError extends Error {
  constructor(public readonly code: BrowserAiErrorCode, message: string = code) { super(message); this.name = "BrowserAiError"; }
}

const INITIALIZATION_TIMEOUT_MS = 10 * 60 * 1000;
const INFERENCE_TIMEOUT_MS = 3 * 60 * 1000;

/** No inference server or API key: model files are fetched only after the user starts this job. */
export async function rankRegionsInBrowser(
  candidates: RegionCandidate[], companions: Companion[], preference: string,
  options: { signal: AbortSignal; onProgress: (progress: number) => void },
): Promise<Region[]> {
  if (options.signal.aborted) throw new BrowserAiError("cancelled");
  let worker: Worker | null = null;
  let closed = false;
  let stoppedError: BrowserAiError | null = null;
  let rejectStopped!: (error: BrowserAiError) => void;
  const stopped = new Promise<never>((_, reject) => { rejectStopped = reject; });
  const stop = (error: BrowserAiError) => {
    if (closed || stoppedError) return;
    stoppedError = error;
    worker?.terminate();
    rejectStopped(error);
  };
  const cancel = () => stop(new BrowserAiError("cancelled"));
  const workerError = (event: ErrorEvent) => stop(new BrowserAiError("download-or-memory", event.message || "Model worker failed"));
  const workerMessageError = () => stop(new BrowserAiError("download-or-memory", "Model worker message could not be decoded"));
  const ensureActive = () => {
    if (options.signal.aborted || closed) throw new BrowserAiError("cancelled");
    if (stoppedError) throw stoppedError;
  };
  const stage = (name: string) => {
    // Stage names only: no place names, prompts, preferences, or model output in logs.
    console.info(`[modujeju:browser-ai] ${name}`);
  };
  const bounded = async <T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    const timer = setTimeout(() => stop(new BrowserAiError("download-or-memory", `${label} timed out`)), timeoutMs);
    try { return await Promise.race([operation, stopped]); }
    finally { clearTimeout(timer); }
  };
  options.signal.addEventListener("abort", cancel, { once: true });
  const initialize = async () => {
    ensureActive();
    if (typeof navigator === "undefined" || typeof window === "undefined") throw new BrowserAiError("unsupported");
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<{ features: { has: (name: string) => boolean } } | null> } }).gpu;
    if (!gpu || !window.isSecureContext) throw new BrowserAiError("unsupported");
    stage("requesting-gpu-adapter");
    const adapter = await gpu.requestAdapter();
    ensureActive();
    if (!adapter) throw new BrowserAiError("unsupported");
    stage("loading-runtime");
    const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
    // An import cannot itself be aborted; never start a late worker after cancellation or timeout.
    ensureActive();
    const activeWorker = new Worker(new URL("../../workers/trip-ai.worker.ts", import.meta.url), { type: "module" });
    worker = activeWorker;
    activeWorker.addEventListener("error", workerError);
    activeWorker.addEventListener("messageerror", workerMessageError);
    const model = adapter.features.has("shader-f16")
      ? "Qwen2.5-0.5B-Instruct-q4f16_1-MLC" : "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";
    stage("loading-model");
    return CreateWebWorkerMLCEngine(activeWorker, model, {
      initProgressCallback: ({ progress }) => {
        if (!closed && !stoppedError && !options.signal.aborted && Number.isFinite(progress)) options.onProgress(Math.max(0, Math.min(1, progress)));
      },
      logLevel: "ERROR",
    }, { context_window_size: 2048 });
  };
  // Subscribe to abort before GPU detection, dynamic import, or worker/model startup.
  try {
    const engine = await bounded(initialize(), INITIALIZATION_TIMEOUT_MS, "Browser model initialization");
    ensureActive();
    const allowed = candidates.map(({ region }) => region);
    stage("running-inference");
    const response = await bounded(engine.chat.completions.create({
      messages: regionRankingMessages(candidates, companions, preference),
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object", schema: JSON.stringify({
        type: "object", properties: { regionOrder: { type: "array", items: { type: "string", enum: allowed }, minItems: allowed.length, maxItems: allowed.length } },
        required: ["regionOrder"], additionalProperties: false,
      }) },
    }), INFERENCE_TIMEOUT_MS, "Browser model inference");
    ensureActive();
    let parsed: unknown;
    try { parsed = JSON.parse(response.choices[0]?.message.content ?? ""); }
    catch { throw new BrowserAiError("invalid-result"); }
    const order = validateAiRegionOrder(parsed, allowed);
    if (!order) throw new BrowserAiError("invalid-result");
    stage("completed");
    return order;
  } catch (error) {
    const failure = error instanceof BrowserAiError ? error : new BrowserAiError("download-or-memory");
    stage(`stopped-${failure.code}`);
    throw failure;
  } finally {
    closed = true;
    options.signal.removeEventListener("abort", cancel);
    if (worker !== null) {
      // Assignments happen in the async initializer; keep the cleanup reference explicit.
      const activeWorker = worker as Worker;
      activeWorker.removeEventListener("error", workerError);
      activeWorker.removeEventListener("messageerror", workerMessageError);
      activeWorker.terminate();
    }
  }
}
