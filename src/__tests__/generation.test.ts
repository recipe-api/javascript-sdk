import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecipeApiClient, GenerationWaitTimeoutError } from '../index.js';
const jobId = '11111111-1111-4111-8111-111111111111';
const input = { title: 'Soup', key_ingredients: ['tomatoes'] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { vi.useFakeTimers(); fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('generation lifecycle', () => {
  it('submits once and polls a slow generation without resubmitting', async () => {
    let polls = 0;
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => init.method === 'POST'
      ? json({ data: { id: jobId, status: 'pending', poll_url: `/api/v1/generate/${jobId}` } }, 202)
      : json({ data: polls++ < 45 ? { id: jobId, status: 'processing' } : { id: jobId, status: 'succeeded', recipe: { id: 'recipe-id' } } }));
    const client = new RecipeApiClient();
    const job = await client.generate.submit(input);
    const result = client.generate.wait(job.data.id);
    await vi.advanceTimersByTimeAsync(46_000);
    expect(await result).toEqual({ data: { id: 'recipe-id' } });
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1);
    expect(fetchMock.mock.calls[0][1].headers.Prefer).toBe('respond-async');
  });
  it('exposes a recoverable job ID on timeout and resumes the same job', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: jobId, status: 'processing' } }));
    // Return fresh bodies for each read.
    fetchMock.mockImplementation(async () => json({ data: { id: jobId, status: 'processing' } }));
    const client = new RecipeApiClient();
    const failure = client.generate.wait(jobId, { timeout: 2_000 }).catch(error => error);
    await vi.advanceTimersByTimeAsync(2_001);
    const error = await failure;
    expect(error).toBeInstanceOf(GenerationWaitTimeoutError);
    expect(error.jobId).toBe(jobId);
    fetchMock.mockImplementation(async () => json({ data: { id: jobId, status: 'succeeded', recipe: { id: 'recipe-id' } } }));
    expect(await client.generate.wait(error.jobId)).toEqual({ data: { id: 'recipe-id' } });
    expect(fetchMock.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
  });
  it('tolerates a transient polling outage and surfaces a terminal failure', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'retry' } }, 503))
      .mockResolvedValueOnce(json({ data: { id: jobId, status: 'failed', error: { code: 'INVALID_RECIPE_OUTPUT', message: 'Credit refunded.' } } }));
    const result = new RecipeApiClient().generate.wait(jobId).catch(error => error);
    await vi.advanceTimersByTimeAsync(1_001);
    expect(await result).toMatchObject({ code: 'INVALID_RECIPE_OUTPUT', message: 'Credit refunded.' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('cancels the local wait without sending a cancellation or new submission', async () => {
    fetchMock.mockImplementation(async () => json({ data: { id: jobId, status: 'pending' } }));
    const controller = new AbortController();
    const result = new RecipeApiClient().generate.wait(jobId, { signal: controller.signal }).catch(error => error);
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();
    expect((await result).name).toBe('AbortError');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('allows synchronous generation longer than the default request timeout', async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      setTimeout(() => resolve(json({ data: { id: 'recipe-id' } })), 50_000);
    }));
    const result = new RecipeApiClient().generate.create(input);
    await vi.advanceTimersByTimeAsync(50_001);
    expect(await result).toEqual({ data: { id: 'recipe-id' } });
  });
});
