import type { RecipeApiClient } from '../client.js';
import { RecipeApiError, TimeoutError } from '../errors.js';
import type { GenerateRequest, GenerateDryRunResponse, RecipeResponse, Recipe, Usage } from '../generated/types.js';

export interface GenerationSubmission {
  data: { id: string; status: 'pending'; poll_url: string };
  usage?: Usage;
}
export interface GenerationJobResponse {
  data: {
    id: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    recipe?: Recipe;
    error?: { code: string; message: string; refund_status?: 'refunded' } | null;
    created_at?: string;
  };
}
export interface GenerationWaitOptions {
  /** Overall wait deadline, including polling requests. Default: 10 minutes. */
  timeout?: number;
  /** Poll interval in milliseconds. Default: 1 second. */
  pollInterval?: number;
  /** Stops waiting only; it does not cancel or refund server-side generation. */
  signal?: AbortSignal;
}

/** The job continues on the server. Resume with generate.wait(error.jobId). */
export class GenerationWaitTimeoutError extends TimeoutError {
  constructor(public readonly jobId: string) {
    super(`Stopped waiting for generation ${jobId}. Resume with generate.wait(jobId); do not submit another generation.`);
    this.name = 'GenerationWaitTimeoutError';
    Object.setPrototypeOf(this, GenerationWaitTimeoutError.prototype);
  }
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(signal?.reason ?? new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export class GenerateResource {
  constructor(private client: RecipeApiClient) {}

  /** Synchronous generation. Prefer submit()/wait() for proxy timeout recovery. */
  async create(request: GenerateRequest): Promise<RecipeResponse> {
    this.validateRequest(request);
    return this.client.request('POST', '/api/v1/generate', {
      body: JSON.stringify(request), timeout: 300_000,
    });
  }

  /** Persist a generation job. Never automatically retries a charged POST. */
  async submit(request: GenerateRequest): Promise<GenerationSubmission> {
    this.validateRequest(request);
    return this.client.request('POST', '/api/v1/generate', {
      headers: { Prefer: 'respond-async' }, body: JSON.stringify(request),
    });
  }

  async poll(jobId: string, options: { signal?: AbortSignal; timeout?: number } = {}): Promise<GenerationJobResponse> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      throw new Error('Generation job ID must be a UUID');
    }
    return this.client.request('GET', `/api/v1/generate/${jobId}`, { ...options, retries: 0 });
  }

  /** Wait for an existing job; transient read failures never resubmit work. */
  async wait(jobId: string, options: GenerationWaitOptions = {}): Promise<RecipeResponse> {
    const timeout = options.timeout ?? 600_000;
    const interval = options.pollInterval ?? 1_000;
    if (!Number.isFinite(timeout) || timeout <= 0 || !Number.isFinite(interval) || interval <= 0) {
      throw new Error('Generation wait timeout and pollInterval must be positive finite milliseconds');
    }
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (options.signal?.aborted) throw options.signal.reason ?? new DOMException('Aborted', 'AbortError');
      try {
        const { data } = await this.poll(jobId, { signal: options.signal, timeout: Math.min(30_000, deadline - Date.now()) });
        if (data.status === 'succeeded') {
          if (!data.recipe) throw new RecipeApiError('INVALID_RESPONSE', 'Completed job has no recipe', 200);
          return { data: data.recipe };
        }
        if (data.status === 'failed') {
          throw new RecipeApiError(data.error?.code ?? 'GENERATION_FAILED', data.error?.message ?? 'Generation failed', 422, { job_id: jobId, refund_status: data.error?.refund_status });
        }
      } catch (error) {
        if (options.signal?.aborted) throw options.signal.reason ?? error;
        const retryable = error instanceof TimeoutError || (error instanceof RecipeApiError && [429, 502, 503, 504].includes(error.statusCode ?? 0));
        if (!retryable) throw error;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await pause(Math.min(interval, remaining), options.signal);
    }
    throw new GenerationWaitTimeoutError(jobId);
  }

  /** Diagnostic mode; available only when explicitly enabled on the server. */
  async dryRun(request: GenerateRequest): Promise<GenerateDryRunResponse> {
    this.validateRequest(request);
    return this.client.request('POST', '/api/v1/generate?dry_run=true', {
      body: JSON.stringify(request), timeout: 300_000,
    });
  }

  private validateRequest(request: GenerateRequest): void {
    if (!request.title?.trim()) throw new Error('Recipe title is required');
    if (!request.key_ingredients?.length) throw new Error('At least one key ingredient is required');
  }
}
