import type { RecipeApiClient } from '../client';
import type { DiscoveryResponse, CategoryItem } from '../generated/types';

/**
 * Discovery resource for browsing categories, cuisines, and dietary options
 */
export class DiscoveryResource {
  constructor(private client: RecipeApiClient) {}

  /**
   * Get all recipe categories with recipe counts
   * No credit cost
   */
  async categories(): Promise<DiscoveryResponse<CategoryItem>> {
    return this.client.request('GET', '/api/v1/categories');
  }

  /**
   * Get all cuisines with recipe counts
   * No credit cost
   */
  async cuisines(): Promise<DiscoveryResponse<CategoryItem>> {
    return this.client.request('GET', '/api/v1/cuisines');
  }

  /**
   * Get all dietary flags with recipe counts
   * No credit cost
   */
  async dietaryFlags(): Promise<DiscoveryResponse<CategoryItem>> {
    return this.client.request('GET', '/api/v1/dietary-flags');
  }

  /**
   * Convenience method: get categories list
   */
  async getCategoryList(): Promise<CategoryItem[]> {
    const response = await this.categories();
    return response.data;
  }

  /**
   * Convenience method: get cuisines list
   */
  async getCuisineList(): Promise<CategoryItem[]> {
    const response = await this.cuisines();
    return response.data;
  }

  /**
   * Convenience method: get dietary flags list
   */
  async getDietaryFlagList(): Promise<CategoryItem[]> {
    const response = await this.dietaryFlags();
    return response.data;
  }
}
