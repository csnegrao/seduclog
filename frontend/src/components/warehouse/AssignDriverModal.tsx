import React, { useEffect, useState } from 'react';
import { MaterialRequest } from '../../types/request.types';
import { DriverOption, Vehicle, CreateDeliveryOrderPayload } from '../../types/warehouse.types';
import { useWarehouse } from '../../hooks/useWarehouse';

interface Props {
  request: MaterialRequest;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

/**
 * Modal for assigning a driver and vehicle to an approved request.
 * Fetches available drivers and vehicles from the API.
 * Shows estimated route input and item summary.
 */
export function AssignDriverModal({ request, onClose, onSuccess }: Props) {
  const { fetchDriversAndVehicles, createDeliveryOrder } = useWarehouse();

  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [estimatedRoute, setEstimatedRoute] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriversAndVehicles()
      .then(({ drivers: d, vehicles: v }) => {
        setDrivers(d);
        setVehicles(v);
        if (d.length > 0) setSelectedDriver(d[0].id);
        if (v.length > 0) setSelectedVehicle(v[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [fetchDriversAndVehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !selectedVehicle) {
      setError('Selecione um motorista e um veículo.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateDeliveryOrderPayload = {
        requestId: request.id,
        driverId: selectedDriver,
        vehicleId: selectedVehicle,
        estimatedRoute: estimatedRoute || undefined,
      };
      const order = await createDeliveryOrder(payload);
      onSuccess?.(order.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Trap focus inside modal (basic a11y).
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Atribuir motorista"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Atribuir Motorista</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Request summary */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs text-gray-500 font-mono">{request.protocol}</p>
          <p className="font-medium text-gray-900">{request.school}</p>
          <ul className="mt-2 text-sm text-gray-600 space-y-0.5">
            {request.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>{item.productName}</span>
                <span className="text-gray-400">
                  {item.approvedQuantity ?? item.requestedQuantity} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="mx-5 mb-2 rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="px-5 py-6 text-center text-sm text-gray-500">
            Carregando motoristas e veículos...
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 px-5 pb-5">
            {/* Driver selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="driver" className="text-sm font-medium text-gray-700">
                Motorista
              </label>
              {drivers.length === 0 ? (
                <p className="text-sm text-red-500">Nenhum motorista disponível.</p>
              ) : (
                <select
                  id="driver"
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Vehicle selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="vehicle" className="text-sm font-medium text-gray-700">
                Veículo
              </label>
              {vehicles.length === 0 ? (
                <p className="text-sm text-red-500">Nenhum veículo disponível.</p>
              ) : (
                <select
                  id="vehicle"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} — {v.model} ({v.capacity})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Estimated route */}
            <div className="flex flex-col gap-1">
              <label htmlFor="route" className="text-sm font-medium text-gray-700">
                Rota estimada{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="route"
                type="text"
                value={estimatedRoute}
                onChange={(e) => setEstimatedRoute(e.target.value)}
                placeholder="ex.: Almoxarifado → Escola Estadual A"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || drivers.length === 0 || vehicles.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Criando ordem...' : 'Criar Ordem de Entrega'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
