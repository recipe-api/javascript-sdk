# Recipe API JavaScript/TypeScript SDK

Official SDK for [Recipe API](https://recipe-api.com) – the B2B recipe API with USDA-backed nutrition data.

## Features

- **📦 Zero dependencies** - Pure JavaScript/TypeScript, no external libs
- **⚡ Full TypeScript support** - Complete type definitions from OpenAPI spec
- **🔄 Automatic retry logic** - Exponential backoff for rate limits (429) and 5xx errors
- **⏱️ Request timeout** - Configurable timeout with sensible defaults
- **🍴 Complete API coverage** - Browse, search, filter, and generate recipes
- **🥗 Nutrition filtering** - Filter by calories, macros, dietary flags
- **🔐 API key management** - Set/update API key at any time

## Installation

```bash
npm install @recipe-api/sdk
# or
yarn add @recipe-api/sdk
# or
pnpm add @recipe-api/sdk
```

## Quick Start

```typescript
import { RecipeApiClient } from '@recipe-api/sdk';

// Create a client
const client = new RecipeApiClient({
  apiKey: 'your-api-key',
});

// Get a sample dinner recipe (no API key required)
const dinner = await client.recipes.getDinner();
console.log(dinner.name); // "Texas Chili con Carne"

// Search recipes
const results = await client.recipes.search('pasta', 1, 10);
console.log(results.data.length); // 10 recipe summaries

// Get full recipe details (costs 1 credit)
const recipe = await client.recipes.get('recipe-id-here');
console.log(recipe.data.nutrition.per_serving.calories);

// Discover available categories
const categories = await client.discovery.getCategoryList();
console.log(categories[0].name); // "Dinner"

// Filter recipes by macros
const highProtein = await client.recipes.byMacros(
  30, // min protein (g)
  50, // max protein (g)
  undefined,
  undefined,
  undefined,
  25, // max fat (g)
);

// Generate a recipe
const generated = await client.generate.create({
  title: 'Lemon Herb Chicken',
  key_ingredients: ['chicken breast', 'lemon', 'garlic'],
  cuisine: 'Mediterranean',
  difficulty: 'Easy',
  equipment: ['skillet'],
  time: 35,
  notes: 'Weeknight-friendly',
});
console.log(generated.data.nutrition.per_serving.calories);
```

## Configuration

```typescript
const client = new RecipeApiClient({
  apiKey: 'rapi_your_key_here', // Optional - required for authenticated endpoints
  baseUrl: 'https://recipe-api.com', // Optional - defaults to production
  timeout: 30000, // Optional - request timeout in ms (default: 30000)
  maxRetries: 3, // Optional - max retries for rate limits (default: 3)
  retryDelay: 500, // Optional - initial retry delay in ms (default: 500)
});

// Update API key at runtime
client.setApiKey('new-api-key');
```

## API Resources

### Recipes

Browse, search, and fetch recipe details.

```typescript
// Search with filters
await client.recipes.list({
  q: 'pasta',
  category: 'Dinner',
  cuisine: 'Italian',
  difficulty: 'Easy',
  dietary: 'Vegetarian,Gluten-Free',
  min_calories: 300,
  max_calories: 600,
  page: 1,
  per_page: 20,
});

// Convenience methods
await client.recipes.search('chicken');
await client.recipes.byCategory('Breakfast');
await client.recipes.byCuisine('Thai');
await client.recipes.byDifficulty('Intermediate');
await client.recipes.byDietary('Vegan,Keto');
await client.recipes.byCalories(200, 500);
await client.recipes.byProtein(20, 40);
await client.recipes.byMacros(25, 35, 100, 150, 15, 25);
await client.recipes.byIngredients(['ingredient-id-1', 'ingredient-id-2']);

// Get recipe detail (costs 1 credit)
const recipe = await client.recipes.get('recipe-uuid');
```

### Discovery

Browse available categories, cuisines, and dietary options without credits.

```typescript
// Get lists with counts
const categories = await client.discovery.categories();
const cuisines = await client.discovery.cuisines();
const dietary = await client.discovery.dietaryFlags();

// Convenience getters
const categoryList = await client.discovery.getCategoryList();
const cuisineList = await client.discovery.getCuisineList();
const dietaryList = await client.discovery.getDietaryFlagList();

// Response structure:
// { data: [{ name: "Dinner", count: 847 }, ...] }
```

### Ingredients

Browse 10,000+ ingredients with USDA nutrition data.

```typescript
// Search and filter
await client.ingredients.search('chicken');
await client.ingredients.byCategory('Meats');

// With pagination
await client.ingredients.list({
  q: 'olive oil',
  page: 2,
  per_page: 50,
});

// Get ingredient categories
const categories = await client.ingredients.getCategories();
```

### Generate

Create new recipes with AI and USDA-verified nutrition.

```typescript
// Generate recipe
const recipe = await client.generate.create({
  title: 'Spicy Tofu Stir-Fry',
  key_ingredients: ['tofu', 'soy sauce', 'ginger', 'vegetables'],
  cuisine: 'Asian',
  difficulty: 'Intermediate',
  equipment: ['wok', 'spatula'],
  time: 25,
  notes: 'High protein vegan option',
});

// Dry-run mode (no credits consumed)
const draft = await client.generate.dryRun({
  title: 'Test Recipe',
  key_ingredients: ['eggs', 'flour'],
  cuisine: 'Mediterranean',
  difficulty: 'Easy',
  equipment: ['bowl'],
  time: 10,
});
```

## Type Definitions

All response types are fully typed:

```typescript
import type {
  Recipe,
  RecipeListItem,
  Nutrition,
  GenerateRequest,
  IngredientItem,
  CategoryItem,
} from '@recipe-api/sdk';

const recipe: Recipe = await client.recipes.get('id');
const nutrition: Nutrition = recipe.nutrition;
console.log(nutrition.per_serving.calories);
```

## Error Handling

The SDK throws specific error types for better error handling:

```typescript
import {
  RecipeApiError,
  UnauthorizedError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  LimitExceededError,
} from '@recipe-api/sdk';

try {
  const recipe = await client.recipes.get('invalid-id');
} catch (error) {
  if (error instanceof UnauthorizedError) {
    console.log('API key missing or invalid');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}ms`);
  } else if (error instanceof NotFoundError) {
    console.log('Recipe not found');
  } else if (error instanceof ValidationError) {
    console.log('Invalid request:', error.context);
  } else if (error instanceof ForbiddenError) {
    console.log('Endpoint requires paid plan');
  } else if (error instanceof LimitExceededError) {
    console.log('Monthly credit limit exceeded');
  } else if (error instanceof RecipeApiError) {
    console.log(`Error [${error.code}]:`, error.message);
  }
}
```

## Retry Logic

The SDK automatically retries requests that hit rate limits (429) or 5xx server errors with exponential backoff:

```typescript
// Automatic retry with exponential backoff
// Attempt 1: 500ms delay
// Attempt 2: 1000ms delay
// Attempt 3: 2000ms delay
// Jittered to prevent thundering herd

const client = new RecipeApiClient({
  maxRetries: 3, // Total attempts = 1 initial + 3 retries
  retryDelay: 500, // Initial backoff delay
});
```

Other errors (4xx, validation) are thrown immediately without retry.

## Examples

### Build a Recipe Search App

```typescript
const client = new RecipeApiClient({ apiKey: process.env.RECIPE_API_KEY });

async function searchRecipes(query: string, dietary?: string) {
  try {
    const results = await client.recipes.search(query);

    if (dietary) {
      // Refetch with dietary filter for more specific results
      const filtered = await client.recipes.list({
        q: query,
        dietary,
        per_page: 5,
      });
      return filtered.data;
    }

    return results.data;
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.log('Rate limited, please try again later');
    }
    throw error;
  }
}

// Usage
const results = await searchRecipes('pasta', 'Vegetarian');
```

### Filter by Macros

```typescript
// Find high-protein, low-carb recipes
const recipes = await client.recipes.byMacros(
  30, // min protein (g)
  100, // max protein (g)
  0, // min carbs (g)
  50, // max carbs (g)
);
```

### Generate with Your Constraints

```typescript
const recipe = await client.generate.create({
  title: 'Quick Weeknight Dinner',
  key_ingredients: ['salmon', 'asparagus', 'olive oil'],
  cuisine: 'Mediterranean',
  difficulty: 'Easy',
  equipment: ['baking sheet'],
  time: 20,
  notes: 'Healthy omega-3 source',
});

console.log(recipe.data.name);
console.log(recipe.data.instructions);
console.log(recipe.data.nutrition.per_serving);
```

## Pagination

Most list endpoints support pagination:

```typescript
// Get page 2 with 50 items per page
const recipes = await client.recipes.list({
  q: 'pasta',
  page: 2,
  per_page: 50,
});

console.log(recipes.meta.total); // Total matching recipes
console.log(recipes.meta.page); // Current page
console.log(recipes.meta.per_page); // Items per page
console.log(recipes.meta.total_capped); // True if results capped at 500
```

## Rate Limits

The SDK automatically retries rate-limited requests (429), but you should implement backoff in your application:

```typescript
import { RateLimitError } from '@recipe-api/sdk';

for (let i = 0; i < recipeIds.length; i++) {
  try {
    const recipe = await client.recipes.get(recipeIds[i]);
    // Process recipe
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Wait before retrying manually
      await new Promise(resolve => setTimeout(resolve, 5000));
      i--; // Retry this recipe
    }
  }
}
```

## Authentication

Get your API key from [recipe-api.com/signup](https://recipe-api.com/signup).

```typescript
const client = new RecipeApiClient({
  apiKey: process.env.RECIPE_API_KEY || 'rapi_...',
});
```

Some endpoints (like `/api/v1/dinner`) don't require authentication:

```typescript
// Works without API key
const dinner = await client.recipes.getDinner();
```

## Roadmap

- [ ] Node.js streams for large dataset processing
- [ ] Batch request support
- [ ] Request caching layer
- [ ] Webhook support
- [ ] GraphQL layer

## Contributing

Contributions welcome! Please check the main [Recipe API GitHub](https://github.com/recipe-api/javascript-sdk) for contribution guidelines.

## Support

- 📧 Email: [paul@recipe-api.com](mailto:paul@recipe-api.com)
- 🌐 Website: [recipe-api.com](https://recipe-api.com)
- 📖 Docs: [recipe-api.com/docs](https://recipe-api.com/docs)

## License

MIT
