import {
  RecipeApiError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  LimitExceededError,
  NetworkError,
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
      maxRetries: options.maxRetries || 3,
      initialDelayMs: options.retryDelay || 500,
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
   * Make HTTP request with automatic retry on 429 and 5xx errors
   */
  async request<T>(
    method: string,
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(method, url, options);
        return response;
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (
          error instanceof RateLimitError ||
          (error instanceof RecipeApiError && error.statusCode === 502)
        ) {
          if (attempt < this.retryConfig.maxRetries) {
            const delayMs = this.calculateBackoffDelay(attempt);
            await this.sleep(delayMs);
            continue;
          }
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

  private async executeRequest<T>(
    method: string,
    url: string,
    options?: RequestInit,
  ): Promise<T> {
    const headers = this.buildHeaders(options?.headers);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...options,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleErrorResponse(response.status, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new NetworkError(`Request failed: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildHeaders(customHeaders?: Record<string, string> | Headers): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'recipe-api-sdk/1.0.0',
      ...this.flattenHeaders(customHeaders),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
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
  ): never {
    const errorCode = data?.error?.code;
    const errorMessage = data?.error?.message || 'Unknown error';

    switch (statusCode) {
      case 400:
        throw new ValidationError(
          errorMessage,
          data?.error?.context || data,
        );
      case 401:
        throw new UnauthorizedError(errorMessage);
      case 402:
        throw new LimitExceededError(errorMessage);
      case 403:
        throw new ForbiddenError(errorMessage);
      case 404:
        throw new NotFoundError(errorMessage);
      case 429:
        throw new RateLimitError(
          errorMessage,
          undefined,
        );
      default:
        throw new RecipeApiError(
          errorCode || `HTTP_${statusCode}`,
          errorMessage,
          statusCode,
        );
    }
  }

  private calculateBackoffDelay(attempt: number): number {
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
