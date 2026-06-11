// Main client
export { RecipeApiClient, type ClientOptions } from './client.js';

// Error classes
export {
  RecipeApiError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  LimitExceededError,
  NetworkError,
} from './errors.js';

// Resources
export { RecipesResource } from './resources/recipes.js';
export { IngredientsResource } from './resources/ingredients.js';
export { DiscoveryResource } from './resources/discovery.js';
export { GenerateResource } from './resources/generate.js';

// Type definitions
export type {
  Recipe,
  RecipeListItem,
  RecipeMeta,
  Dietary,
  Storage,
  Equipment,
  IngredientGroup,
  Ingredient,
  Instruction,
  StructuredStep,
  Troubleshooting,
  Nutrition,
  NutritionData,
  NutritionSummary,
  Usage,
  GenerateRequest,
  RecipeResponse,
  RecipeListResponse,
  DiscoveryResponse,
  IngredientItem,
  IngredientListResponse,
  CategoryItem,
  HealthResponse,
  ApiError,
  FilterDifficulty,
  RecipeSearchFilters,
  IngredientSearchFilters,
} from './generated/types.js';
