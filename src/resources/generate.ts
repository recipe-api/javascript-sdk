import type { RecipeApiClient } from '../client.js';
import type {
  GenerateRequest,
  GenerateDryRunResponse,
  RecipeResponse,
} from '../generated/types.js';

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
   * Returns the generated draft and nutrition diagnostics without persisting
   * Only available when the server sets ENABLE_GENERATE_DRY_RUN=true
   * Note: the API still charges generate usage before the dry-run branch runs
   */
  async dryRun(request: GenerateRequest): Promise<GenerateDryRunResponse> {
    this.validateRequest(request);

    return this.client.request('POST', '/api/v1/generate?dry_run=true', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Match the API's requirements: only title and key_ingredients are
  // required; other constraints are optional and clamped server-side.
  private validateRequest(request: GenerateRequest): void {
    if (!request.title || request.title.length === 0) {
      throw new Error('Recipe title is required');
    }
    if (!request.key_ingredients || request.key_ingredients.length === 0) {
      throw new Error('At least one key ingredient is required');
    }
  }
}
