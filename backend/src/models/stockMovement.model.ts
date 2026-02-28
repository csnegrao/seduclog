import { StockMovement } from '../types';

// In-memory stock movement log — replace with a real database in production.
const movements: StockMovement[] = [];

export function logMovement(movement: StockMovement): StockMovement {
  movements.push(movement);
  return movement;
}

export function findAllMovements(): StockMovement[] {
  return [...movements];
}

export function findMovementsByProduct(productId: string): StockMovement[] {
  return movements.filter((m) => m.productId === productId);
}
