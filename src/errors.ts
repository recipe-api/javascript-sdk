/**
 * RecipeAPI SDK Error Classes
 */

export class RecipeApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'RecipeApiError';
    Object.setPrototypeOf(this, RecipeApiError.prototype);
  }
}

export class UnauthorizedError extends RecipeApiError {
  constructor(message = 'Missing or invalid API key') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends RecipeApiError {
  constructor(message = 'API key lacks permission for this endpoint') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class RateLimitError extends RecipeApiError {
  constructor(
    message = 'Rate limit exceeded',
    public retryAfter?: number,
  ) {
    super('RATE_LIMIT_EXCEEDED', message, 429);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class NotFoundError extends RecipeApiError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends RecipeApiError {
  constructor(
    message = 'Invalid request',
    context?: Record<string, any>,
  ) {
    super('VALIDATION_ERROR', message, 400, context);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class LimitExceededError extends RecipeApiError {
  constructor(message = 'Monthly limit exceeded') {
    super('LIMIT_EXCEEDED', message, 402);
    this.name = 'LimitExceededError';
    Object.setPrototypeOf(this, LimitExceededError.prototype);
  }
}

export class NetworkError extends RecipeApiError {
  constructor(
    message = 'Network error',
    context?: Record<string, any>,
  ) {
    super('NETWORK_ERROR', message, undefined, context);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
