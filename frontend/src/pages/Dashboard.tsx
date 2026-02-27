import { useQuery } from '@tanstack/react-query';
import { warehouseApi } from '../services/api';
import { AlertTriangle, Package, ClipboardList, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const isWarehouse = user?.role === 'WAREHOUSE_OPERATOR' || user?.role === 'ADMIN';

  const { data: queue } = useQuery({
    queryKey: ['queue'],
    queryFn: () => warehouseApi.getQueue().then((r) => r.data),
    enabled: isWarehouse,
  });

  const { data: alerts } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => warehouseApi.getAlerts().then((r) => r.data),
    enabled: isWarehouse,
  });

  const { data: stock } = useQuery({
    queryKey: ['stock'],
    queryFn: () => warehouseApi.getStock().then((r) => r.data),
    enabled: isWarehouse,
  });

  const urgentCount = queue?.filter((r) => r.priority === 'URGENT').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Bem-vindo, {user?.name}</p>
      </div>

      {isWarehouse && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{queue?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Pedidos na fila</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{urgentCount}</p>
                <p className="text-xs text-gray-500">Pedidos urgentes</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{alerts?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Alertas de estoque</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Package size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stock?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Materiais ativos</p>
              </div>
            </div>
          </div>

          {/* Alerts section */}
          {alerts && alerts.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-yellow-500" />
                <h2 className="font-semibold text-gray-800">Materiais com Estoque Baixo</h2>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      <span className="ml-2 text-xs text-gray-500">{m.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-600">{m.currentStock}</span>
                      <span className="text-xs text-gray-500"> / mín {m.minStock} {m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queue preview */}
          {queue && queue.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-blue-500" />
                <h2 className="font-semibold text-gray-800">Fila de Pedidos Recentes</h2>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Solicitante</th>
                      <th>Escola</th>
                      <th>Prioridade</th>
                      <th>Itens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.requester?.name}</td>
                        <td className="text-gray-500">{r.requester?.school ?? '-'}</td>
                        <td>
                          <PriorityBadge priority={r.priority} />
                        </td>
                        <td>{r.items.length} item(s)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!isWarehouse && (
        <div className="card text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">Bem-vindo ao SeducLog</h2>
          <p className="text-sm text-gray-500 mt-1">Use o menu lateral para navegar pelo sistema.</p>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    URGENT: 'badge bg-red-100 text-red-700',
    HIGH: 'badge bg-orange-100 text-orange-700',
    NORMAL: 'badge bg-blue-100 text-blue-700',
    LOW: 'badge bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    URGENT: 'Urgente',
    HIGH: 'Alta',
    NORMAL: 'Normal',
    LOW: 'Baixa',
  };
  return <span className={map[priority] ?? 'badge bg-gray-100 text-gray-600'}>{labels[priority] ?? priority}</span>;
}
