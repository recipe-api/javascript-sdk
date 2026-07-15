import {
  RecipeApiError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  NetworkError,
  TimeoutError,
} from './errors.js';
import { RecipesResource } from './resources/recipes.js';
import { IngredientsResource } from './resources/ingredients.js';
import { DiscoveryResource } from './resources/discovery.js';
import { GenerateResource } from './resources/generate.js';

export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RequestInit {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string | FormData;
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Hard-cap 429 codes: these mean a plan limit is exhausted, not a transient
// throttle, so retrying will never succeed.
const NON_RETRYABLE_429_CODES = new Set([
  'GENERATE_LIMIT_EXCEEDED',
  'UNIQUE_RECIPE_LIMIT_EXCEEDED',
]);

// Cap for server-provided Retry-After values (seconds).
const MAX_RETRY_AFTER_SECONDS = 60;

/**
 * Main Recipe API client with automatic retry logic and rate limit handling
 */
export class RecipeApiClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private retryConfig: RetryConfig;

  public recipes: RecipesResource;
  public ingredients: IngredientsResource;
  public discovery: DiscoveryResource;
  public generate: GenerateResource;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://recipe-api.com';
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;
    this.retryConfig = {
      maxRetries: options.maxRetries ?? 3,
      initialDelayMs: options.retryDelay ?? 500,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };

    // Initialize resource instances
    this.recipes = new RecipesResource(this);
    this.ingredients = new IngredientsResource(this);
    this.discovery = new DiscoveryResource(this);
    this.generate = new GenerateResource(this);
  }

  /**
   * Make HTTP request with automatic retry on transient 429/502 errors.
   *
   * Only idempotent GET requests are retried. POSTs (generate,
   * image-generate) charge usage before the work completes, so retrying
   * them could double-charge; they always fail fast.
   */
  async request<T>(
    method: string,
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const isIdempotent = method.toUpperCase() === 'GET';
    const maxRetries = isIdempotent
      ? options?.retries ?? this.retryConfig.maxRetries
      : 0;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(method, url, options);
        return response;
      } catch (error) {
        lastError = error;

        if (this.isRetryable(error) && attempt < maxRetries) {
          const delayMs = this.calculateBackoffDelay(attempt, error);
          await this.sleep(delayMs);
          continue;
        }

        // Don't retry other errors
        throw error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new NetworkError('Request failed after retries');
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof RateLimitError) {
      // Hard caps (e.g. GENERATE_LIMIT_EXCEEDED) never clear on retry
      return !NON_RETRYABLE_429_CODES.has(error.code);
    }
    return error instanceof RecipeApiError && error.statusCode === 502;
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    options?: RequestInit,
  ): Promise<T> {
    const headers = this.buildHeaders(options?.headers);
    const timeoutMs = options?.timeout ?? this.timeout;

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
    const signal = this.combineSignals(timeoutController.signal, options?.signal);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body,
        signal,
      });

      return await this.parseResponse<T>(response);
    } catch (error) {
      if ((error as Error | null)?.name === 'AbortError') {
        if (options?.signal?.aborted) {
          // Caller-initiated abort: surface it unchanged
          throw error;
        }
        throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
      }
      if (error instanceof TypeError) {
        throw new NetworkError(`Request failed: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Body may be non-JSON (e.g. proxy HTML error pages); never let a
      // parse failure mask the HTTP error itself.
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }
      this.handleErrorResponse(response.status, data, response.headers);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new RecipeApiError(
        'INVALID_RESPONSE',
        'Failed to parse response body as JSON',
        response.status,
      );
    }
  }

  private combineSignals(
    timeoutSignal: AbortSignal,
    callerSignal?: AbortSignal,
  ): AbortSignal {
    if (!callerSignal) return timeoutSignal;
    if (typeof AbortSignal.any === 'function') {
      return AbortSignal.any([timeoutSignal, callerSignal]);
    }
    // Fallback for runtimes without AbortSignal.any
    const controller = new AbortController();
    if (timeoutSignal.aborted || callerSignal.aborted) {
      controller.abort();
    } else {
      const abort = () => controller.abort();
      timeoutSignal.addEventListener('abort', abort, { once: true });
      callerSignal.addEventListener('abort', abort, { once: true });
    }
    return controller.signal;
  }

  private buildHeaders(customHeaders?: Record<string, string> | Headers): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'recipe-api-sdk/1.0.0',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Merge caller headers into the defaults: built-in headers survive
    // unless the caller explicitly sets that header (case-insensitive).
    const custom = this.flattenHeaders(customHeaders);
    for (const [key, value] of Object.entries(custom)) {
      const existing = Object.keys(headers).find(
        (k) => k.toLowerCase() === key.toLowerCase(),
      );
      if (existing && existing !== key) {
        delete headers[existing];
      }
      headers[key] = value;
    }

    return headers;
  }

  private flattenHeaders(headers?: Record<string, string> | Headers): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    return headers as Record<string, string>;
  }

  private handleErrorResponse(
    statusCode: number,
    data: any,
    responseHeaders: Headers,
  ): never {
    const errorCode = data?.error?.code;
    const errorMessage = data?.error?.message || `HTTP ${statusCode} error`;

    switch (statusCode) {
      case 400:
        throw new ValidationError(
          errorMessage,
          data?.error?.context || data,
          errorCode,
        );
      case 401:
        throw new UnauthorizedError(errorMessage);
      case 403:
        throw new ForbiddenError(errorMessage);
      case 404:
        throw new NotFoundError(errorMessage);
      case 429:
        throw new RateLimitError(
          errorMessage,
          this.parseRetryAfter(responseHeaders),
          errorCode,
        );
      default:
        throw new RecipeApiError(
          errorCode || `HTTP_${statusCode}`,
          errorMessage,
          statusCode,
        );
    }
  }

  private parseRetryAfter(headers: Headers): number | undefined {
    const raw = headers.get('retry-after');
    if (!raw) return undefined;
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) return undefined;
    return Math.min(seconds, MAX_RETRY_AFTER_SECONDS);
  }

  private calculateBackoffDelay(attempt: number, error?: unknown): number {
    // Honor the server's Retry-After hint when present (already capped)
    if (
      error instanceof RateLimitError &&
      typeof error.retryAfter === 'number'
    ) {
      return error.retryAfter * 1000;
    }

    const exponentialDelay =
      this.retryConfig.initialDelayMs *
      Math.pow(this.retryConfig.backoffMultiplier, attempt);
    const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
    return Math.min(delayWithJitter, this.retryConfig.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Set or update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check API health
   */
  async health(): Promise<{ status: string; timestamp: string }> {
    return this.request('GET', '/health');
  }
}
