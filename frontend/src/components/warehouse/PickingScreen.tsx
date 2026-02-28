import React, { useState } from 'react';
import { DeliveryOrder, PicklistItem } from '../../types/warehouse.types';
import { useWarehouse } from '../../hooks/useWarehouse';

interface Props {
  order: DeliveryOrder;
  onComplete?: (order: DeliveryOrder) => void;
  onBack?: () => void;
}

/**
 * Interactive picking checklist for warehouse operators.
 * Operator taps each item to confirm separation with optional quantity adjustment.
 *
 * Usage: provide an order that has been moved to 'picking' status.
 * On pressing "Confirmar Separação", a PDF generation button becomes available.
 */
export function PickingScreen({ order: initialOrder, onComplete, onBack }: Props) {
  const { startPicking } = useWarehouse();

  const [order, setOrder] = useState<DeliveryOrder>(initialOrder);
  const [picklist, setPicklist] = useState<PicklistItem[]>(
    initialOrder.picklist.map((item) => ({ ...item, pickedQuantity: item.approvedQuantity })),
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  const handleStartPicking = async () => {
    setStarting(true);
    setError(null);
    try {
      const updated = await startPicking(order.id);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start picking');
    } finally {
      setStarting(false);
    }
  };

  const confirmItem = (itemId: string) => {
    setPicklist((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, confirmed: true } : p)),
    );
  };

  const unconfirmItem = (itemId: string) => {
    setPicklist((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, confirmed: false } : p)),
    );
  };

  const updatePickedQty = (itemId: string, qty: number) => {
    setPicklist((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, pickedQuantity: qty } : p)),
    );
  };

  const confirmedCount = picklist.filter((p) => p.confirmed).length;
  const totalCount = picklist.length;
  const allConfirmed = confirmedCount === totalCount;

  const handleFinish = () => {
    setAllDone(true);
    onComplete?.({ ...order, picklist });
  };

  const handlePrintPdf = () => {
    // Build a simple print-friendly page. In production, replace with a proper PDF library.
    const lines = picklist
      .map(
        (p) =>
          `${p.productName}: ${p.pickedQuantity ?? p.approvedQuantity} ${p.unit} [${p.confirmed ? '✓' : '✗'}]`,
      )
      .join('\n');
    const content = `FOLHA DE SEPARAÇÃO\n\nPedido: ${order.requestProtocol}\nMotorista: ${order.driverName}\nVeículo: ${order.vehiclePlate}\n\n${lines}`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<pre style="font-family:monospace;padding:2rem">${content}</pre>`);
      win.print();
    }
  };

  if (allDone) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">✅</div>
        <h3 className="text-lg font-semibold text-green-700">Separação concluída!</h3>
        <p className="text-sm text-gray-500">
          Todos os itens foram conferidos e separados.
        </p>
        <button
          onClick={handlePrintPdf}
          className="rounded-md bg-gray-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
        >
          🖨 Imprimir Folha de Separação
        </button>
        {onBack && (
          <button onClick={onBack} className="text-blue-600 text-sm hover:underline">
            ← Voltar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="text-blue-600 text-sm hover:underline">
            ←
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Separação</h2>
          <p className="text-xs text-gray-500 font-mono">{order.requestProtocol}</p>
        </div>
      </div>

      {/* Order info */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Motorista</span>
          <span>Veículo</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>{order.driverName}</span>
          <span>{order.vehiclePlate}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Start picking button (if not yet picking) */}
      {order.status === 'created' && (
        <button
          onClick={() => void handleStartPicking()}
          disabled={starting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {starting ? 'Iniciando...' : '▶ Iniciar Separação'}
        </button>
      )}

      {/* Progress bar */}
      {order.status === 'picking' && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progresso</span>
            <span>
              {confirmedCount} / {totalCount}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      {(order.status === 'picking' || order.status === 'created') && (
        <ul className="flex flex-col gap-2">
          {picklist.map((item) => (
            <li
              key={item.itemId}
              className={`rounded-xl border p-4 transition-colors ${
                item.confirmed
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() =>
                    item.confirmed ? unconfirmItem(item.itemId) : confirmItem(item.itemId)
                  }
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                    item.confirmed
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-400 bg-white text-transparent'
                  }`}
                  aria-label={item.confirmed ? 'Desmarcar' : 'Confirmar'}
                >
                  ✓
                </button>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium text-sm ${item.confirmed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                    aria-label={`${item.productName}${item.confirmed ? ' (confirmado)' : ''}`}
                  >
                    {item.productName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min={0}
                      max={item.approvedQuantity}
                      value={item.pickedQuantity ?? item.approvedQuantity}
                      onChange={(e) => updatePickedQty(item.itemId, Number(e.target.value))}
                      className="w-20 rounded border border-gray-300 px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Quantidade separada"
                    />
                    <span className="text-xs text-gray-500">
                      {item.unit} (aprovado: {item.approvedQuantity})
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Finish button */}
      {order.status === 'picking' && (
        <button
          onClick={handleFinish}
          disabled={!allConfirmed}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {allConfirmed ? '✓ Confirmar Separação' : `Confirme todos os itens (${confirmedCount}/${totalCount})`}
        </button>
      )}
    </div>
  );
}
