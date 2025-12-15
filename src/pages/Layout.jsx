
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Box,
  TestTube,
  Menu,
  X,
  LogOut,
  Settings,
  UserCircle,
  Construction,
  Beaker,
  FileText
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Temporary mock role until we migrate roles to Supabase
  const userRole = user?.app_metadata?.role || 'admin';

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Check if status is explicitly active (treat undefined as inactive for safety, though we try to set it above)
  if (user && user.user_metadata?.status !== 'active' && user.user_metadata?.status !== undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Conta Inativa</h1>
          <p className="text-slate-600">
            Sua conta está aguardando aprovação ou foi desativada pelo administrador.
            Entre em contato com o suporte para mais informações.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Minhas Visitas', href: '/visits', icon: ClipboardCheck },
  ];

  const setupNavigation = [
    { name: 'Clientes e Locais', href: '/setup/clients', icon: Users },
    { name: 'Equipamentos', href: '/setup/equipments', icon: Box },
    { name: 'Testes', href: '/setup/tests', icon: TestTube },
    { name: 'Produtos Químicos', href: '/setup/products', icon: Beaker },
    { name: 'Modelos de Relatório', href: '/setup/templates', icon: FileText },
  ];

  const adminNavigation = [
    { name: 'Gestão de Usuários', href: '/users', icon: Users },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            {/* Using LayoutDashboard as a logo placeholder if FlaskConical is missing or just use text */}
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-800">WGA Brasil</span>
        </div>
      </div>

      <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Sidebar (Desktop & Mobile) */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 print:hidden
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-800 hidden lg:flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl">WGA Brasil</span>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}

              {/* Submenu Cadastros */}
              <div className="pt-4">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cadastros</p>
                {setupNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}

                {/* Administration Menu - showing for everyone temporarily or check role */}
                {(userRole === 'admin' || true) && (
                  <>
                    <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">Administração</p>
                    {adminNavigation.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${active
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                          <Icon className="w-5 h-5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            </nav>

            <div className="p-4 border-t border-slate-800">
              <Link to="/profile" onClick={() => setIsSidebarOpen(false)}>
                <div className="flex items-center gap-3 px-4 py-3 mb-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.email || 'Usuário'}</p>
                    <p className="text-xs text-slate-500 truncate">Ver Perfil</p>
                  </div>
                </div>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-slate-800"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 w-full print:overflow-visible print:h-auto print:block">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto print:p-0 print:max-w-none print:mx-0">
            <Outlet />
          </div>
        </main>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
