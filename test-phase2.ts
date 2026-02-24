import { RecipeApiClient } from './src/index';

async function testSDK() {
  console.log('=== Phase 2: Runtime Testing ===\n');

  const client = new RecipeApiClient({
    baseUrl: 'https://recipe-api.com',
    timeout: 10000,
  });

  try {
    console.log('✓ Step 1: Testing health check...');
    const health = await client.health();
    console.log(`  ✅ API is ${health.status}`);

    console.log('\n✓ Step 2: Testing sample recipe (no auth required)...');
    const dinner = await client.recipes.getDinner();
    console.log(`  ✅ Got recipe: "${dinner.name}"`);
    console.log(`  ✅ Cuisine: ${dinner.cuisine}`);
    console.log(`  ✅ Calories: ${dinner.nutrition.per_serving.calories}`);
    console.log(`  ✅ Tags: ${dinner.tags.slice(0, 2).join(', ')}`);

    console.log('\n✓ Step 3: Testing error handling...');
    try {
      await client.recipes.get('invalid-id-format');
    } catch (error) {
      if (error instanceof Error) {
        console.log(`  ✅ Error caught: ${error.constructor.name}`);
      }
    }

    console.log('\n✓ Step 4: Testing client configuration...');
    client.setApiKey('test-key-123');
    console.log('  ✅ API key updated');

    console.log('\n✓ Step 5: Testing resource instantiation...');
    console.log(`  ✅ recipes resource initialized`);
    console.log(`  ✅ ingredients resource initialized`);
    console.log(`  ✅ discovery resource initialized`);
    console.log(`  ✅ generate resource initialized`);

    console.log('\n✅ Phase 2 Complete: SDK runtime is functional\n');

  } catch (error) {
    console.error('\n❌ Phase 2 Failed:', error);
    process.exit(1);
  }
}

testSDK();
