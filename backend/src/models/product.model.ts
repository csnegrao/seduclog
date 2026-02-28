import { Product } from '../types';

// In-memory product catalogue — replace with a real database in production.
const products: Product[] = [
  { id: 'p1', name: 'Papel A4', unit: 'Resma', stock: 500, minStock: 50, category: 'Papelaria' },
  { id: 'p2', name: 'Caneta Azul', unit: 'Caixa', stock: 200, minStock: 20, category: 'Papelaria' },
  { id: 'p3', name: 'Caderno 100 folhas', unit: 'Unidade', stock: 150, minStock: 30, category: 'Papelaria' },
  { id: 'p4', name: 'Apagador', unit: 'Unidade', stock: 50, minStock: 10, category: 'Material Escolar' },
  { id: 'p5', name: 'Giz Escolar', unit: 'Caixa', stock: 100, minStock: 15, category: 'Material Escolar' },
  { id: 'p6', name: 'Marcador Quadro Branco', unit: 'Caixa', stock: 80, minStock: 10, category: 'Material Escolar' },
  { id: 'p7', name: 'Tesoura', unit: 'Unidade', stock: 30, minStock: 30, category: 'Materiais Gerais' },
  { id: 'p8', name: 'Cola Bastão', unit: 'Unidade', stock: 120, minStock: 20, category: 'Materiais Gerais' },
];

export function findAllProducts(search?: string, category?: string): Product[] {
  return products.filter((p) => {
    if (category && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}

export function findProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Returns products where current stock is at or below minStock. */
export function findLowStockProducts(): Product[] {
  return products.filter((p) => p.stock <= p.minStock);
}

/**
 * Decrements the stock of a product by the given quantity.
 * Returns false if the product is not found or has insufficient stock.
 */
export function decrementStock(productId: string, quantity: number): boolean {
  const product = products.find((p) => p.id === productId);
  if (!product || product.stock < quantity) return false;
  product.stock -= quantity;
  return true;
}

export function incrementStock(productId: string, quantity: number): void {
  const product = products.find((p) => p.id === productId);
  if (product) product.stock += quantity;
}

/** Directly sets the stock level. Used by inventory reconciliation. */
export function setProductStock(productId: string, newStock: number): number | null {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  const previous = product.stock;
  product.stock = newStock;
  return previous;
}
