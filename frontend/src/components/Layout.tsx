import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Warehouse,
  ListChecks,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  label: string;
  to?: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Solicitações', to: '/requests', icon: <ClipboardList size={18} /> },
  {
    label: 'Almoxarifado',
    icon: <Warehouse size={18} />,
    roles: ['WAREHOUSE_OPERATOR', 'ADMIN'],
    children: [
      { label: 'Fila de Pedidos', to: '/warehouse/queue' },
      { label: 'Separação', to: '/warehouse/picking' },
      { label: 'Estoque', to: '/warehouse/stock' },
      { label: 'Inventário', to: '/warehouse/inventory' },
    ],
  },
  { label: 'Materiais', to: '/materials', icon: <Package size={18} />, roles: ['ADMIN', 'WAREHOUSE_OPERATOR'] },
  { label: 'Relatórios', to: '/reports', icon: <BarChart3 size={18} />, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Usuários', to: '/users', icon: <Users size={18} />, roles: ['ADMIN'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Almoxarifado']);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <ListChecks size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 leading-tight">SeducLog</p>
              <p className="text-xs text-gray-500">Almoxarifado</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visibleItems.map((item) => {
            if (item.children) {
              const isExpanded = expandedGroups.includes(item.label);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </>
                    )}
                  </button>
                  {sidebarOpen && isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            `block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-100 p-3">
          {sidebarOpen && user && (
            <div className="mb-2 px-2">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />
          {user && (
            <span className="text-sm text-gray-600">
              Olá, <strong>{user.name.split(' ')[0]}</strong>
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
