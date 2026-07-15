import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  RecipeApiClient,
  UnauthorizedError,
  ValidationError,
  RateLimitError,
  RecipeApiError,
  TimeoutError,
} from '../index.js';

describe('RecipeApiClient', () => {
  it('should initialize without API key', () => {
    const client = new RecipeApiClient();
    expect(client).toBeDefined();
  });

  it('should initialize with options', () => {
    const client = new RecipeApiClient({
      apiKey: 'test-key',
      timeout: 5000,
      maxRetries: 5,
    });
    expect(client).toBeDefined();
  });

  it('should allow setting API key', () => {
    const client = new RecipeApiClient();
    client.setApiKey('new-key');
    expect(client).toBeDefined();
  });

  it('should have all resource methods', () => {
    const client = new RecipeApiClient();
    expect(client.recipes).toBeDefined();
    expect(client.recipes.list).toBeDefined();
    expect(client.recipes.get).toBeDefined();
    expect(client.recipes.search).toBeDefined();

    expect(client.ingredients).toBeDefined();
    expect(client.ingredients.list).toBeDefined();
    expect(client.ingredients.search).toBeDefined();

    expect(client.discovery).toBeDefined();
    expect(client.discovery.categories).toBeDefined();
    expect(client.discovery.cuisines).toBeDefined();
    expect(client.discovery.dietaryFlags).toBeDefined();

    expect(client.generate).toBeDefined();
    expect(client.generate.create).toBeDefined();
  });

  it('should export error classes', () => {
    expect(UnauthorizedError).toBeDefined();
    expect(ValidationError).toBeDefined();
    expect(TimeoutError).toBeDefined();
  });
});

describe('RecipeApiClient request behavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  }

  it('retries GET requests on transient 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: 'RATE_LIMITED', message: 'slow down' } }, 429),
      )
      .mockResolvedValueOnce(jsonResponse({ status: 'ok', timestamp: 'now' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new RecipeApiClient({ retryDelay: 1 });
    const result = await client.health();
    expect(result.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries POST requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'RATE_LIMITED', message: 'slow down' } }, 429),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RecipeApiClient({ retryDelay: 1 });
    await expect(
      client.request('POST', '/api/v1/generate', { body: '{}' }),
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry hard-cap 429 codes even on GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: { code: 'UNIQUE_RECIPE_LIMIT_EXCEEDED', message: 'cap hit' } },
        429,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RecipeApiClient({ retryDelay: 1 });
    const error = await client
      .request('GET', '/api/v1/recipes/abc')
      .catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.code).toBe('UNIQUE_RECIPE_LIMIT_EXCEEDED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('parses Retry-After header into RateLimitError.retryAfter (seconds, capped)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'RATE_LIMITED', message: 'slow down' } },
          429,
          { 'Retry-After': '120' },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RecipeApiClient({ maxRetries: 0 });
    const error = await client.health().catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfter).toBe(60);
  });

  it('maps non-JSON error bodies to a typed error with the status code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html>Bad Gateway</html>', {
        status: 503,
        headers: { 'content-type': 'text/html' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RecipeApiClient({ maxRetries: 0 });
    const error = await client.health().catch((e) => e);
    expect(error).toBeInstanceOf(RecipeApiError);
    expect(error.statusCode).toBe(503);
  });

  it('keeps X-API-Key when caller supplies custom headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new RecipeApiClient({ apiKey: 'test-key' });
    await client.request('GET', '/api/v1/recipes', {
      headers: { 'X-Custom': 'yes', 'content-type': 'text/plain' },
    });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe('test-key');
    expect(headers['X-Custom']).toBe('yes');
    // Caller-supplied Content-Type overrides the default, case-insensitively
    expect(headers['content-type']).toBe('text/plain');
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('surfaces timeouts as TimeoutError', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new RecipeApiClient();
    await expect(
      client.request('GET', '/health', { timeout: 10 }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });
});
