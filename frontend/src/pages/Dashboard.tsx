import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  Package, ClipboardList, Truck, AlertTriangle,
  CheckCircle, Clock,
} from 'lucide-react';

function KPICard({
  label,
  value,
  icon,
  color,
  description,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  description?: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then((r) => r.data),
    refetchInterval: 30000, // Refresh every 30s
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Visão geral do sistema — atualizado agora há pouco
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KPICard
            label="Total de Solicitações"
            value={kpis?.totalRequests ?? 0}
            icon={<ClipboardList size={22} className="text-blue-600" />}
            color="bg-blue-50"
          />
          <KPICard
            label="Pedidos Pendentes"
            value={kpis?.pendingRequests ?? 0}
            icon={<Clock size={22} className="text-amber-600" />}
            color="bg-amber-50"
            description="Aguardando aprovação"
          />
          <KPICard
            label="Em Separação"
            value={kpis?.inPickingOrders ?? 0}
            icon={<Package size={22} className="text-purple-600" />}
            color="bg-purple-50"
            description="Ordens abertas"
          />
          <KPICard
            label="Entregas Ativas"
            value={kpis?.activeDeliveries ?? 0}
            icon={<Truck size={22} className="text-green-600" />}
            color="bg-green-50"
            description="A caminho"
          />
          <KPICard
            label="Entregues Hoje"
            value={kpis?.deliveredToday ?? 0}
            icon={<CheckCircle size={22} className="text-teal-600" />}
            color="bg-teal-50"
          />
          <KPICard
            label="Alertas de Estoque"
            value={kpis?.lowStockCount ?? 0}
            icon={<AlertTriangle size={22} className="text-red-600" />}
            color="bg-red-50"
            description="Abaixo do mínimo"
          />
        </div>
      )}

      {/* Quick status info */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Status do Sistema</h2>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            API Online
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Banco de Dados
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Tempo Real
          </span>
        </div>
      </div>
    </div>
  );
}
