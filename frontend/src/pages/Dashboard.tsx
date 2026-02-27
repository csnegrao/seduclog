import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bem-vindo, {user?.name}!</h1>
        <p className="text-sm text-gray-500 mt-1">
          Perfil: <span className="font-medium text-blue-600">{user?.role}</span>
          {user?.school && ` — ${user.school}`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(user?.role === 'REQUESTER' || user?.role === 'ADMIN') && (
          <>
            <a href="/requests/new" className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-blue-600 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              </div>
              <h3 className="font-semibold text-gray-900">Nova Requisição</h3>
              <p className="text-sm text-gray-500 mt-1">Solicitar materiais ao almoxarifado</p>
            </a>
            <a href="/requests" className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-purple-600 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <h3 className="font-semibold text-gray-900">Minhas Requisições</h3>
              <p className="text-sm text-gray-500 mt-1">Acompanhar status das solicitações</p>
            </a>
          </>
        )}
        {(user?.role === 'WAREHOUSE_OPERATOR' || user?.role === 'ADMIN') && (
          <a href="/operator/requests" className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-green-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900">Gerenciar Pedidos</h3>
            <p className="text-sm text-gray-500 mt-1">Aprovar e processar requisições</p>
          </a>
        )}
      </div>
    </div>
  );
}
