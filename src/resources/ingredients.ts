import type { RecipeApiClient } from '../client.js';
import type {
  IngredientListResponse,
  IngredientResponse,
  IngredientSearchFilters,
} from '../generated/types.js';

/**
 * Ingredients resource for browsing the ingredient database
 */
export class IngredientsResource {
  constructor(private client: RecipeApiClient) {}

  /**
   * Browse ingredients with optional filtering and pagination
   * No credit cost
   */
  async list(filters?: IngredientSearchFilters): Promise<IngredientListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.q) params.append('q', filters.q);
      if (filters.category) params.append('category', filters.category);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page)
        params.append('per_page', filters.per_page.toString());
    }

    const queryString = params.toString();
    const path = `/api/v1/ingredients${queryString ? `?${queryString}` : ''}`;

    return this.client.request('GET', path);
  }

  /**
   * Search ingredients by name
   */
  async search(
    query: string,
    page = 1,
    perPage = 50,
  ): Promise<IngredientListResponse> {
    return this.list({
      q: query,
      page,
      per_page: perPage,
    });
  }

  /**
   * Get a single ingredient with its full per-100g USDA nutrition.
   * Discovery via list()/search() is free; this fetches the nutrition and
   * costs 1 credit.
   */
  async get(id: string): Promise<IngredientResponse> {
    if (!id || typeof id !== 'string') {
      throw new Error('Ingredient ID must be a valid string');
    }

    return this.client.request('GET', `/api/v1/ingredients/${id}`);
  }

  /**
   * Get ingredients by category
   */
  async byCategory(
    category: string,
    page = 1,
    perPage = 50,
  ): Promise<IngredientListResponse> {
    return this.list({
      category,
      page,
      per_page: perPage,
    });
  }

  /**
   * Get all ingredient categories
   */
  async getCategories(): Promise<{ data: Array<{ name: string; count: number }> }> {
    return this.client.request('GET', '/api/v1/ingredient-categories');
  }
}
