import type { RecipeApiClient } from '../client.js';
import type { GenerateRequest, RecipeResponse } from '../generated/types.js';

/**
 * Generate resource for creating new recipes with AI
 */
export class GenerateResource {
  constructor(private client: RecipeApiClient) {}

  /**
   * Generate a recipe with USDA-verified nutrition
   * Creates a new recipe from structured constraints
   */
  async create(request: GenerateRequest): Promise<RecipeResponse> {
    this.validateRequest(request);

    return this.client.request('POST', '/api/v1/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate a recipe (dry run mode)
   * Returns generated content and usage without persisting
   * Only available when ENABLE_GENERATE_DRY_RUN=true
   */
  async dryRun(request: GenerateRequest): Promise<RecipeResponse> {
    this.validateRequest(request);

    return this.client.request('POST', '/api/v1/generate?dry_run=true', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  private validateRequest(request: GenerateRequest): void {
    if (!request.title || request.title.length === 0) {
      throw new Error('Recipe title is required');
    }
    if (request.title.length > 80) {
      throw new Error('Recipe title must be 80 characters or less');
    }
    if (!request.key_ingredients || request.key_ingredients.length === 0) {
      throw new Error('At least one key ingredient is required');
    }
    if (!request.cuisine) {
      throw new Error('Cuisine is required');
    }
    if (!request.difficulty) {
      throw new Error('Difficulty level is required');
    }
    if (
      !['Easy', 'Intermediate', 'Advanced', 'Professional'].includes(
        request.difficulty,
      )
    ) {
      throw new Error(
        'Difficulty must be one of: Easy, Intermediate, Advanced, Professional',
      );
    }
    if (!request.equipment || request.equipment.length === 0) {
      throw new Error('At least one piece of equipment is required');
    }
    if (!request.time || request.time < 5 || request.time > 720) {
      throw new Error('Time must be between 5 and 720 minutes');
    }
  }
}
