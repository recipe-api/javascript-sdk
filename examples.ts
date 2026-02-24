/**
 * Recipe API SDK - Usage Examples
 *
 * Run examples with: npx tsx examples.ts
 */

import {
  RecipeApiClient,
  RateLimitError,
  ValidationError,
  UnauthorizedError,
} from './src/index';

// Initialize client
const apiKey = process.env.RECIPE_API_KEY || 'your-api-key-here';
const client = new RecipeApiClient({
  apiKey,
  timeout: 30000,
  maxRetries: 3,
});

/**
 * Example 1: Get a sample recipe (no API key required)
 */
async function exampleGetDinner() {
  console.log('\n=== Example 1: Get Sample Dinner ===');
  try {
    const recipe = await client.recipes.getDinner();
    console.log(`Recipe: ${recipe.name}`);
    console.log(`Cuisine: ${recipe.cuisine}`);
    console.log(`Difficulty: ${recipe.difficulty}`);
    console.log(`Total Time: ${recipe.meta.total_time}`);
    console.log(`Calories: ${recipe.nutrition.per_serving.calories}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 2: Search recipes
 */
async function exampleSearchRecipes() {
  console.log('\n=== Example 2: Search Recipes ===');
  try {
    const results = await client.recipes.search('pasta', 1, 5);
    console.log(`Found ${results.data.length} recipes:`);
    results.data.forEach((recipe) => {
      console.log(`  - ${recipe.name} (${recipe.cuisine})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 3: Filter by macros
 */
async function exampleFilterByMacros() {
  console.log('\n=== Example 3: High-Protein, Low-Carb Recipes ===');
  try {
    const results = await client.recipes.byMacros(
      30, // min protein
      100, // max protein
      0, // min carbs
      50, // max carbs
      undefined,
      undefined,
      1,
      5,
    );
    console.log(`Found ${results.data.length} recipes matching criteria`);
    results.data.forEach((recipe) => {
      const nutrition = recipe.nutrition_summary;
      console.log(
        `  - ${recipe.name}: ${nutrition.protein_g}g protein, ${nutrition.carbohydrates_g}g carbs`,
      );
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 4: Discover categories
 */
async function exampleDiscoverCategories() {
  console.log('\n=== Example 4: Discover Recipe Categories ===');
  try {
    const categories = await client.discovery.getCategoryList();
    console.log('Available categories:');
    categories.slice(0, 8).forEach((cat) => {
      console.log(`  - ${cat.name}: ${cat.count} recipes`);
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      console.error('API key is missing or invalid');
    } else {
      console.error('Error:', error);
    }
  }
}

/**
 * Example 5: Get recipe details (costs 1 credit)
 */
async function exampleGetRecipeDetail() {
  console.log('\n=== Example 5: Get Full Recipe Detail ===');
  try {
    // First, search for a recipe
    const results = await client.recipes.search('chicken', 1, 1);

    if (results.data.length > 0) {
      const recipeId = results.data[0].id;
      console.log(`Fetching details for: ${results.data[0].name}`);

      const recipe = await client.recipes.get(recipeId);
      console.log(`\nRecipe: ${recipe.data.name}`);
      console.log(`Description: ${recipe.data.description}`);
      console.log(`Instructions: ${recipe.data.instructions.length} steps`);
      console.log(`Nutrition (per serving):`);
      console.log(
        `  - Calories: ${recipe.data.nutrition.per_serving.calories}`,
      );
      console.log(`  - Protein: ${recipe.data.nutrition.per_serving.protein_g}g`);
      console.log(
        `  - Carbs: ${recipe.data.nutrition.per_serving.carbohydrates_g}g`,
      );
      console.log(`  - Fat: ${recipe.data.nutrition.per_serving.fat_g}g`);
      console.log(
        `\nUsage: ${recipe.usage?.monthly_remaining}/${recipe.usage?.monthly_limit} remaining this month`,
      );
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      console.error('API key required for this endpoint');
    } else if (error instanceof ValidationError) {
      console.error('Invalid recipe ID');
    } else {
      console.error('Error:', error);
    }
  }
}

/**
 * Example 6: Generate a recipe
 */
async function exampleGenerateRecipe() {
  console.log('\n=== Example 6: Generate a Recipe ===');
  try {
    const generated = await client.generate.create({
      title: 'Quick Mediterranean Chicken',
      key_ingredients: ['chicken breast', 'lemon', 'garlic', 'olive oil'],
      cuisine: 'Mediterranean',
      difficulty: 'Easy',
      equipment: ['skillet', 'knife'],
      time: 25,
      notes: 'Healthy weeknight dinner',
    });

    console.log(`Generated: ${generated.data.name}`);
    console.log(`Instructions: ${generated.data.instructions.length} steps`);
    console.log(
      `Estimated Calories: ${generated.data.nutrition.per_serving.calories}`,
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      console.error('API key required for generation');
    } else {
      console.error('Error:', error);
    }
  }
}

/**
 * Example 7: Search ingredients
 */
async function exampleSearchIngredients() {
  console.log('\n=== Example 7: Search Ingredients ===');
  try {
    const results = await client.ingredients.search('chicken', 1, 10);
    console.log(`Found ${results.data.length} chicken-related ingredients:`);
    results.data.forEach((ing) => {
      console.log(`  - ${ing.name} (${ing.category})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 8: Error handling
 */
async function exampleErrorHandling() {
  console.log('\n=== Example 8: Error Handling ===');
  try {
    // Try to fetch with invalid ID
    await client.recipes.get('invalid-id');
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('Validation error caught:', error.message);
    } else if (error instanceof RateLimitError) {
      console.log('Rate limited. Retry after:', error.retryAfter, 'ms');
    } else {
      console.log('Generic error:', error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Example 9: Pagination
 */
async function examplePagination() {
  console.log('\n=== Example 9: Pagination ===');
  try {
    const page1 = await client.recipes.search('salad', 1, 3);
    console.log(`Page 1: ${page1.data.length} recipes`);
    console.log(`Total matching: ${page1.meta.total}`);
    console.log(`Total pages: ${Math.ceil(page1.meta.total / page1.meta.per_page)}`);

    if (page1.meta.total > 3) {
      const page2 = await client.recipes.search('salad', 2, 3);
      console.log(`Page 2: ${page2.data.length} recipes`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 10: Filter by dietary restrictions
 */
async function exampleDietaryFilters() {
  console.log('\n=== Example 10: Dietary Filters ===');
  try {
    const vegan = await client.recipes.byDietary('Vegan', 1, 5);
    console.log(`Found ${vegan.data.length} vegan recipes`);

    const veganGlutenFree = await client.recipes.byDietary(
      'Vegan,Gluten-Free',
      1,
      5,
    );
    console.log(
      `Found ${veganGlutenFree.data.length} vegan & gluten-free recipes`,
    );
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🍽️  Recipe API SDK Examples');
  console.log('=============================\n');

  // Examples that don't require API key
  await exampleGetDinner();
  await exampleSearchRecipes();
  await exampleFilterByMacros();
  await examplePagination();

  // Examples that require API key
  if (apiKey && apiKey !== 'your-api-key-here') {
    await exampleDiscoverCategories();
    await exampleSearchIngredients();
    await exampleDietaryFilters();
    await exampleGetRecipeDetail();
    await exampleGenerateRecipe();
  } else {
    console.log(
      '\n⚠️  Skipping API-key-required examples (set RECIPE_API_KEY env var)',
    );
  }

  await exampleErrorHandling();

  console.log('\n=============================');
  console.log('✅ Examples completed!\n');
}

// Run examples
runAllExamples().catch(console.error);
