import { RecipeApiClient, RateLimitError } from './src/index';

async function testAuthenticatedEndpoints() {
  // Set your API key here
  const apiKey = process.env.RECIPE_API_KEY || 'YOUR_API_KEY_HERE';

  if (apiKey === 'YOUR_API_KEY_HERE') {
    console.log('=== Phase 3: Authenticated Testing ===\n');
    console.log('⚠️  Skipping Phase 3 - API key not set\n');
    console.log('To test authenticated endpoints:');
    console.log('  export RECIPE_API_KEY="rapi_your_key_here"');
    console.log('  npx tsx test-phase3-template.ts\n');
    return;
  }

  console.log('=== Phase 3: Authenticated Testing ===\n');

  const client = new RecipeApiClient({
    apiKey,
    baseUrl: 'https://recipe-api.com',
    timeout: 10000,
    maxRetries: 3,
  });

  try {
    console.log('✓ Step 1: Testing discovery - categories...');
    const categories = await client.discovery.categories();
    console.log(`  ✅ Got ${categories.data.length} categories`);
    console.log(`  ✅ Example: ${categories.data[0].name} (${categories.data[0].count} recipes)`);

    console.log('\n✓ Step 2: Testing discovery - cuisines...');
    const cuisines = await client.discovery.cuisines();
    console.log(`  ✅ Got ${cuisines.data.length} cuisines`);
    console.log(`  ✅ Example: ${cuisines.data[0].name} (${cuisines.data[0].count} recipes)`);

    console.log('\n✓ Step 3: Testing recipe search...');
    const recipes = await client.recipes.search('pasta', 1, 5);
    console.log(`  ✅ Found ${recipes.data.length} recipes`);
    if (recipes.data.length > 0) {
      console.log(`  ✅ First result: "${recipes.data[0].name}" by ${recipes.data[0].cuisine}`);
    }

    console.log('\n✓ Step 4: Testing ingredient search...');
    const ingredients = await client.ingredients.search('chicken', 1, 5);
    console.log(`  ✅ Found ${ingredients.data.length} ingredients`);
    if (ingredients.data.length > 0) {
      console.log(`  ✅ First result: "${ingredients.data[0].name}" (${ingredients.data[0].category})`);
    }

    console.log('\n✓ Step 5: Testing dietary filters...');
    const vegetarian = await client.recipes.byDietary('Vegetarian', 1, 3);
    console.log(`  ✅ Found ${vegetarian.data.length} vegetarian recipes`);

    console.log('\n✓ Step 6: Testing macro filters...');
    const highProtein = await client.recipes.byMacros(30, 50, undefined, undefined, undefined, undefined, 1, 3);
    console.log(`  ✅ Found ${highProtein.data.length} high-protein recipes`);

    console.log('\n✓ Step 7: Testing full recipe fetch (costs 1 credit)...');
    if (recipes.data.length > 0) {
      const recipeId = recipes.data[0].id;
      const fullRecipe = await client.recipes.get(recipeId);
      console.log(`  ✅ Got full recipe: "${fullRecipe.data.name}"`);
      console.log(`  ✅ Instructions: ${fullRecipe.data.instructions.length} steps`);
      console.log(`  ✅ Nutrition: ${fullRecipe.data.nutrition.per_serving.calories} cal`);
      console.log(`  ✅ Credits remaining: ${fullRecipe.usage?.monthly_remaining}/${fullRecipe.usage?.monthly_limit}`);
    }

    console.log('\n✅ Phase 3 Complete: All authenticated endpoints working\n');

  } catch (error) {
    if (error instanceof RateLimitError) {
      console.error('❌ Rate limited - please wait before retrying');
    } else {
      console.error('❌ Phase 3 Failed:', error);
    }
    process.exit(1);
  }
}

testAuthenticatedEndpoints();
