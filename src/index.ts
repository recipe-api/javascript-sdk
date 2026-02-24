// Main client
export { RecipeApiClient, type ClientOptions } from './client';

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
} from './errors';

// Resources
export { RecipesResource } from './resources/recipes';
export { IngredientsResource } from './resources/ingredients';
export { DiscoveryResource } from './resources/discovery';
export { GenerateResource } from './resources/generate';

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
} from './generated/types';
