import type { RecipeApiClient } from '../client';
import type {
  Recipe,
  RecipeListResponse,
  RecipeResponse,
  RecipeSearchFilters,
} from '../generated/types';

/**
 * Recipes resource for browsing and fetching recipe details
 */
export class RecipesResource {
  constructor(private client: RecipeApiClient) {}

  /**
   * Browse and search recipes with optional filtering
   * Discovery limited to 500 recipes; use filters for larger catalogs.
   * No credit cost.
   */
  async list(filters?: RecipeSearchFilters): Promise<RecipeListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.q) params.append('q', filters.q);
      if (filters.category) params.append('category', filters.category);
      if (filters.cuisine) params.append('cuisine', filters.cuisine);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.dietary) params.append('dietary', filters.dietary);
      if (filters.min_calories !== undefined)
        params.append('min_calories', filters.min_calories.toString());
      if (filters.max_calories !== undefined)
        params.append('max_calories', filters.max_calories.toString());
      if (filters.min_protein !== undefined)
        params.append('min_protein', filters.min_protein.toString());
      if (filters.max_protein !== undefined)
        params.append('max_protein', filters.max_protein.toString());
      if (filters.min_carbs !== undefined)
        params.append('min_carbs', filters.min_carbs.toString());
      if (filters.max_carbs !== undefined)
        params.append('max_carbs', filters.max_carbs.toString());
      if (filters.min_fat !== undefined)
        params.append('min_fat', filters.min_fat.toString());
      if (filters.max_fat !== undefined)
        params.append('max_fat', filters.max_fat.toString());
      if (filters.ingredients) params.append('ingredients', filters.ingredients);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page)
        params.append('per_page', filters.per_page.toString());
    }

    const queryString = params.toString();
    const path = `/api/v1/recipes${queryString ? `?${queryString}` : ''}`;

    return this.client.request('GET', path);
  }

  /**
   * Get full recipe by ID (requires API key)
   * Costs 1 credit
   */
  async get(id: string): Promise<RecipeResponse> {
    if (!id || typeof id !== 'string') {
      throw new Error('Recipe ID must be a valid string');
    }

    return this.client.request('GET', `/api/v1/recipes/${id}`);
  }

  /**
   * Get a sample dinner recipe (no API key required)
   */
  async getDinner(): Promise<Recipe> {
    return this.client.request('GET', '/api/v1/dinner');
  }

  /**
   * Search recipes by name or description
   */
  async search(query: string, page = 1, perPage = 20): Promise<RecipeListResponse> {
    return this.list({
      q: query,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by category
   */
  async byCategory(
    category: string,
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      category,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by cuisine
   */
  async byCuisine(
    cuisine: string,
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      cuisine,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by difficulty level
   */
  async byDifficulty(
    difficulty: 'Easy' | 'Intermediate' | 'Advanced',
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      difficulty,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by dietary flags (comma-separated)
   * Example: "Vegetarian,Gluten-Free"
   */
  async byDietary(
    dietary: string,
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      dietary,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by calorie range
   */
  async byCalories(
    minCalories?: number,
    maxCalories?: number,
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      min_calories: minCalories,
      max_calories: maxCalories,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by protein content
   */
  async byProtein(
    minProtein?: number,
    maxProtein?: number,
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      min_protein: minProtein,
      max_protein: maxProtein,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by macro ranges
   */
  async byMacros(
    minProtein?: number,
    maxProtein?: number,
    minCarbs?: number,
    maxCarbs?: number,
    minFat?: number,
    maxFat?: number,
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      min_protein: minProtein,
      max_protein: maxProtein,
      min_carbs: minCarbs,
      max_carbs: maxCarbs,
      min_fat: minFat,
      max_fat: maxFat,
      page,
      per_page: perPage,
    });
  }

  /**
   * Filter recipes by specific ingredients (comma-separated UUIDs)
   */
  async byIngredients(
    ingredientIds: string[],
    page = 1,
    perPage = 20,
  ): Promise<RecipeListResponse> {
    return this.list({
      ingredients: ingredientIds.join(','),
      page,
      per_page: perPage,
    });
  }
}
