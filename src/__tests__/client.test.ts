import { describe, it, expect } from 'vitest';
import {
  RecipeApiClient,
  UnauthorizedError,
  ValidationError,
} from '../index';

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
  });
});
