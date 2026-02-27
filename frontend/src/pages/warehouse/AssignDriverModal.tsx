import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { warehouseApi } from '../../services/api';
import type { MaterialRequest, Vehicle, User } from '../../types';
import { X, Truck, User as UserIcon } from 'lucide-react';

interface Props {
  request: MaterialRequest;
  onClose: () => void;
  onConfirm: (data: { driverId?: string; vehicleId?: string; destination?: string; notes?: string }) => void;
  isLoading: boolean;
}

export default function AssignDriverModal({ request, onClose, onConfirm, isLoading }: Props) {
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [destination, setDestination] = useState(request.destination ?? '');
  const [notes, setNotes] = useState('');

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => warehouseApi.getDrivers().then((r) => r.data),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => warehouseApi.getVehicles().then((r) => r.data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      driverId: driverId || undefined,
      vehicleId: vehicleId || undefined,
      destination: destination || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Iniciar Ordem de Separação</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pedido de {request.requester?.name}
              {request.requester?.school ? ` — ${request.requester.school}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Driver selection */}
          <div>
            <label className="label">
              <UserIcon size={14} className="inline mr-1" />
              Motorista (opcional)
            </label>
            {drivers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhum motorista disponível</p>
            ) : (
              <select
                className="input"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <option value="">Selecionar motorista...</option>
                {drivers.map((d: User) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.phone ? `(${d.phone})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vehicle selection */}
          <div>
            <label className="label">
              <Truck size={14} className="inline mr-1" />
              Veículo (opcional)
            </label>
            {vehicles.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhum veículo disponível</p>
            ) : (
              <select
                className="input"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Selecionar veículo...</option>
                {vehicles.map((v: Vehicle) => (
                  <option key={v.id} value={v.id}>
                    {v.model} — {v.plate} {v.capacity ? `(${v.capacity})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Destination */}
          <div>
            <label className="label">Destino</label>
            <input
              type="text"
              className="input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Endereço de entrega..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Observações</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
            />
          </div>

          {/* Items summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Itens do pedido ({request.items.length})</p>
            <ul className="space-y-1">
              {request.items.map((item) => (
                <li key={item.id} className="flex justify-between text-xs text-gray-600">
                  <span>{item.material?.name}</span>
                  <span className="font-medium">{item.quantity} {item.material?.unit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Ordem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
