export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CartNotFoundError extends AppError {
  constructor(cartId: string) {
    super(`Cart not found: ${cartId}`, 404);
  }
}

export class CartItemNotFoundError extends AppError {
  constructor(productId: string) {
    super(`Cart item not found for product: ${productId}`, 404);
  }
}

export class ProductNotFoundError extends AppError {
  constructor(productId: string) {
    super(`Product not found: ${productId}`, 404);
  }
}

export class InvalidQuantityError extends AppError {
  constructor(quantity: unknown) {
    super(`Invalid quantity: ${String(quantity)}`, 400);
  }
}

export class InsufficientStockError extends AppError {
  constructor() {
    super('Insufficient stock for the requested quantity', 409);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('Forbidden', 403);
  }
}
