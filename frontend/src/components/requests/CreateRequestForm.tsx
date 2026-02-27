import React, { useCallback, useEffect, useState } from 'react';
import { CreateRequestPayload, Product } from '../../types/request.types';
import { useRequests } from '../../hooks/useRequests';

interface ItemRow {
  productId: string;
  requestedQuantity: number;
}

interface Props {
  onSuccess?: (protocol: string) => void;
}

/**
 * Mobile-first form for creating a new material request.
 * Uses Tailwind CSS classes — requires Tailwind to be configured in the project.
 */
export function CreateRequestForm({ onSuccess }: Props) {
  const { createRequest, fetchProducts } = useRequests();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [justification, setJustification] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch product catalogue on mount.
  useEffect(() => {
    fetchProducts()
      .then((data) => setProducts(data))
      .catch(() => setProducts([]));
  }, [fetchProducts]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      if (prev.some((i) => i.productId === product.id)) return prev;
      return [...prev, { productId: product.id, requestedQuantity: 1 }];
    });
    setSearch('');
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, requestedQuantity: qty } : i)),
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) {
      setError('Add at least one item.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateRequestPayload = {
        school,
        desiredDate,
        justification,
        items,
      };
      const created = await createRequest(payload);
      onSuccess?.(created.protocol);
      setSchool('');
      setDesiredDate('');
      setJustification('');
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 max-w-lg mx-auto"
    >
      <h2 className="text-xl font-semibold">Nova Requisição</h2>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* School */}
      <div className="flex flex-col gap-1">
        <label htmlFor="school" className="text-sm font-medium text-gray-700">
          Escola
        </label>
        <input
          id="school"
          type="text"
          required
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="Nome da escola"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Desired date */}
      <div className="flex flex-col gap-1">
        <label htmlFor="desiredDate" className="text-sm font-medium text-gray-700">
          Data desejada
        </label>
        <input
          id="desiredDate"
          type="date"
          required
          value={desiredDate}
          onChange={(e) => setDesiredDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Product search */}
      <div className="flex flex-col gap-1">
        <label htmlFor="search" className="text-sm font-medium text-gray-700">
          Buscar produto
        </label>
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Digite o nome do produto..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <ul className="mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-sm">
            {filteredProducts.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">Nenhum produto encontrado</li>
            ) : (
              filteredProducts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => addItem(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between"
                  >
                    <span>{p.name}</span>
                    <span className="text-gray-400 text-xs">
                      {p.unit} · estoque: {p.stock}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Selected items */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Itens selecionados</span>
          {items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return (
              <div
                key={item.productId}
                className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 bg-gray-50"
              >
                <span className="flex-1 text-sm">{product?.name ?? item.productId}</span>
                <input
                  type="number"
                  min={1}
                  value={item.requestedQuantity}
                  onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400">{product?.unit}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none"
                  aria-label="Remover"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Justification */}
      <div className="flex flex-col gap-1">
        <label htmlFor="justification" className="text-sm font-medium text-gray-700">
          Justificativa
        </label>
        <textarea
          id="justification"
          required
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={4}
          placeholder="Descreva o motivo da requisição..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Enviando...' : 'Enviar Requisição'}
      </button>
    </form>
  );
}
