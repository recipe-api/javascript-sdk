/**
 * Auto-generated type definitions from Recipe API OpenAPI spec
 * Generated at build time - do not edit manually
 */

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  cuisine: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  tags: string[];
  meta: RecipeMeta;
  dietary: Dietary;
  storage: Storage;
  equipment: Equipment[];
  ingredients: IngredientGroup[];
  instructions: Instruction[];
  troubleshooting: Troubleshooting[];
  chef_notes: string[];
  cultural_context?: string;
  nutrition: Nutrition;
}

export interface RecipeListItem {
  id: string;
  name: string;
  description: string;
  category: string;
  cuisine: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  tags: string[];
  meta: RecipeMeta;
  dietary: Dietary;
  nutrition_summary: NutritionSummary;
}

export interface RecipeMeta {
  active_time: string;
  passive_time: string;
  total_time: string;
  overnight_required: boolean;
  yields: string;
  yield_count: number;
  serving_size_g?: number;
}

export interface Dietary {
  flags: string[];
  not_suitable_for: string[];
}

export interface Storage {
  refrigerator?: {
    duration: string;
    notes: string;
  };
  freezer?: {
    duration: string;
    notes: string;
  };
  reheating?: string;
  does_not_keep: boolean;
}

export interface Equipment {
  name: string;
  required: boolean;
  alternative?: string;
}

export interface IngredientGroup {
  group_name: string;
  items: Ingredient[];
}

export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
  preparation?: string;
  notes?: string;
  substitutions: string[];
  ingredient_id?: string;
  nutrition_source?: string;
}

export interface Instruction {
  step_number: number;
  phase: 'prep' | 'cook' | 'assemble' | 'finish';
  text: string;
  structured?: StructuredStep;
  tips: string[];
}

export interface StructuredStep {
  action: string;
  temperature?: {
    celsius: number;
    fahrenheit: number;
  };
  duration?: string;
  doneness_cues?: {
    visual?: string;
    tactile?: string;
  };
}

export interface Troubleshooting {
  symptom: string;
  likely_cause: string;
  prevention: string;
  fix: string;
}

export interface Nutrition {
  per_serving: NutritionData;
  sources: string[];
}

export interface NutritionData {
  calories?: number;
  protein_g?: number;
  carbohydrates_g?: number;
  fat_g?: number;
  saturated_fat_g?: number;
  trans_fat_g?: number;
  monounsaturated_fat_g?: number;
  polyunsaturated_fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  potassium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  magnesium_mg?: number;
  phosphorus_mg?: number;
  zinc_mg?: number;
  vitamin_a_mcg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  vitamin_e_mg?: number;
  vitamin_k_mcg?: number;
  vitamin_b6_mg?: number;
  vitamin_b12_mcg?: number;
  thiamin_mg?: number;
  riboflavin_mg?: number;
  niacin_mg?: number;
  folate_mcg?: number;
  water_g?: number;
  alcohol_g?: number;
  caffeine_mg?: number;
}

export interface NutritionSummary {
  calories?: number;
  protein_g?: number;
  carbohydrates_g?: number;
  fat_g?: number;
}

export interface Usage {
  monthly_remaining: number;
  monthly_limit: number;
  daily_remaining: number;
  daily_limit: number;
}

export interface GenerateRequest {
  title: string;
  key_ingredients: string[];
  cuisine: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced' | 'Professional';
  equipment: string[];
  time: number;
  notes?: string;
}

export interface RecipeResponse {
  data: Recipe;
  usage?: Usage;
}

export interface RecipeListResponse {
  data: RecipeListItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_capped?: boolean;
  };
}

export interface DiscoveryResponse<T> {
  data: T[];
}

export interface IngredientItem {
  id: string;
  name: string;
  category: string;
  source: 'USDA' | 'Aggregated Public Sources';
}

export interface IngredientListResponse {
  data: IngredientItem[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

export interface CategoryItem {
  name: string;
  count: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type FilterDifficulty = 'Easy' | 'Intermediate' | 'Advanced';

export interface RecipeSearchFilters {
  q?: string;
  category?: string;
  cuisine?: string;
  difficulty?: FilterDifficulty;
  dietary?: string;
  min_calories?: number;
  max_calories?: number;
  min_protein?: number;
  max_protein?: number;
  min_carbs?: number;
  max_carbs?: number;
  min_fat?: number;
  max_fat?: number;
  ingredients?: string;
  page?: number;
  per_page?: number;
}

export interface IngredientSearchFilters {
  q?: string;
  category?: string;
  page?: number;
  per_page?: number;
}
