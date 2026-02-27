import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ClipboardList, Truck, Users,
  Settings, BarChart3, ShoppingCart, History, Menu, X, LogOut,
  Bell, Warehouse,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['ADMIN', 'MANAGER', 'WAREHOUSE_OPERATOR'] },
  { to: '/stock', label: 'Estoque', icon: <Package size={18} />, roles: ['ADMIN', 'WAREHOUSE_OPERATOR'] },
  { to: '/orders', label: 'Separação', icon: <ClipboardList size={18} />, roles: ['ADMIN', 'WAREHOUSE_OPERATOR'] },
  { to: '/deliveries', label: 'Entregas', icon: <Truck size={18} />, roles: ['ADMIN', 'DRIVER', 'WAREHOUSE_OPERATOR'] },
  { to: '/requests', label: 'Meu Pedido', icon: <ShoppingCart size={18} />, roles: ['REQUESTER'] },
  { to: '/requests/history', label: 'Histórico', icon: <History size={18} />, roles: ['REQUESTER'] },
  { to: '/reports', label: 'Relatórios', icon: <BarChart3 size={18} />, roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Usuários', icon: <Users size={18} />, roles: ['ADMIN'] },
  { to: '/settings', label: 'Configurações', icon: <Settings size={18} />, roles: ['ADMIN'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel: Record<Role, string> = {
    ADMIN: 'Administrador',
    WAREHOUSE_OPERATOR: 'Operador',
    DRIVER: 'Motorista',
    REQUESTER: 'Solicitante',
    MANAGER: 'Gestor',
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Warehouse size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">AlmoxarifadoEdu</p>
            <p className="text-xs text-gray-500">SEDUC</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{roleLabel[user?.role as Role]}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Bell size={20} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
