import { useQuery } from '@tanstack/react-query';
import { reportsApi, materialsApi, requestsApi, deliveriesApi } from '../../services/api';
import { BarChart3, TrendingUp, Package, Truck } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: React.ReactNode; trend?: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="p-3 bg-blue-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
        {trend && <p className="text-xs text-green-600 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}

export default function ReportsDashboard() {
  const { data: kpis } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then((r) => r.data),
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.list().then((r) => r.data),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => requestsApi.list().then((r) => r.data),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => deliveriesApi.list().then((r) => r.data),
  });

  const lowStock = materials.filter((m) => m.currentStock <= m.minStock && m.minStock > 0);
  const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const pendingReqs = requests.filter((r) => r.status === 'PENDING').length;

  // Requests by status
  const statusCounts = requests.reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel de Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Análise de desempenho e indicadores</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total de Pedidos"
          value={kpis?.totalRequests ?? requests.length}
          icon={<BarChart3 size={22} className="text-blue-600" />}
        />
        <StatCard
          label="Pendentes"
          value={pendingReqs}
          icon={<TrendingUp size={22} className="text-amber-600" />}
          trend="Aguardando aprovação"
        />
        <StatCard
          label="Materiais no Sistema"
          value={materials.length}
          icon={<Package size={22} className="text-purple-600" />}
          trend={`${lowStock.length} abaixo do mínimo`}
        />
        <StatCard
          label="Entregas Concluídas"
          value={deliveredCount}
          icon={<Truck size={22} className="text-green-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Pedidos por Status</h2>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-28 text-sm text-gray-600 flex-shrink-0">{status}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${requests.length > 0 ? (count / requests.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="w-8 text-sm font-semibold text-gray-700 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Low stock alert */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">
            Alertas de Estoque ({lowStock.length})
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm">✅ Todos os materiais estão em nível adequado</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lowStock.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{m.currentStock} {m.unit}</p>
                    <p className="text-xs text-gray-400">mín: {m.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent deliveries */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4">Últimas Entregas</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Destino</th>
                  <th>Motorista</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.slice(0, 10).map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs">#{d.id.slice(-6).toUpperCase()}</td>
                    <td>{d.destination || '—'}</td>
                    <td>{d.driver?.name || '—'}</td>
                    <td>
                      <span className={`badge ${d.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : d.status === 'EN_ROUTE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="text-gray-400 text-xs">
                      {format(new Date(d.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Date range info */}
      <p className="text-xs text-gray-400 text-center">
        Dados coletados de {format(subDays(new Date(), 30), 'dd/MM/yyyy', { locale: ptBR })} até {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
      </p>
    </div>
  );
}
