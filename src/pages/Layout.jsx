
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
  FileText,
  Bot,
  Shield
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
import { filterNavigation, ROUTE_PERMISSIONS, canAccessRoute } from "@/lib/permissions";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Fetch user permissions from database
  const { data: userPermissions } = useQuery({
    queryKey: ['userPermissions', user?.role_id],
    queryFn: async () => {
      if (!user?.role_id) {
        // Fallback: get tecnico permissions
        const { data: tecnicoRole } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'tecnico')
          .single();

        if (tecnicoRole) {
          const { data: perms } = await supabase
            .from('role_permissions')
            .select('route_key')
            .eq('role_id', tecnicoRole.id);
          return perms?.map(p => p.route_key) || ['dashboard', 'visits'];
        }
        return ['dashboard', 'visits'];
      }

      const { data: perms } = await supabase
        .from('role_permissions')
        .select('route_key')
        .eq('role_id', user.role_id);

      return perms?.map(p => p.route_key) || [];
    },
    enabled: true,
    staleTime: 60000, // Cache for 1 minute
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Check if status is explicitly active (profile.status is merged into user in AuthContext)
  // The admin updates profiles.status, so we check user.status (NOT user_metadata.status)
  if (user && user.status !== 'active' && user.status !== undefined) {
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

  // All navigation items with permission keys
  const allNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permKey: 'dashboard' },
    { name: 'Minhas Visitas', href: '/visits', icon: ClipboardCheck, permKey: 'visits' },
  ];

  const allSetupNavigation = [
    { name: 'Clientes e Locais', href: '/setup/clients', icon: Users, permKey: 'setup_clients' },
    { name: 'Equipamentos', href: '/setup/equipments', icon: Box, permKey: 'setup_equipments' },
    { name: 'Testes', href: '/setup/tests', icon: TestTube, permKey: 'setup_tests' },
    { name: 'Produtos Químicos', href: '/setup/products', icon: Beaker, permKey: 'setup_products' },
    { name: 'Modelos de Relatório', href: '/setup/templates', icon: FileText, permKey: 'setup_templates' },
  ];

  const allAdminNavigation = [
    { name: 'Gestão de Usuários', href: '/users', icon: Users, permKey: 'admin_users' },
    { name: 'Configurações IA', href: '/setup/ai', icon: Bot, permKey: 'admin_ai' },
  ];

  // Filter navigation based on user permissions
  const navigation = allNavigation.filter(item =>
    userPermissions?.includes(item.permKey)
  );

  const setupNavigation = allSetupNavigation.filter(item =>
    userPermissions?.includes(item.permKey)
  );

  const adminNavigation = allAdminNavigation.filter(item =>
    userPermissions?.includes(item.permKey)
  );

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  }

  // Check if current route is allowed
  const currentRouteAllowed = React.useMemo(() => {
    if (!userPermissions) return true; // Still loading, allow
    return canAccessRoute(userPermissions, location.pathname);
  }, [userPermissions, location.pathname]);

  // Show Access Denied if user tries to access route via URL without permission
  if (userPermissions && !currentRouteAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Acesso Negado</h1>
          <p className="text-slate-600">
            Você não tem permissão para acessar esta página.
            Entre em contato com o administrador para solicitar acesso.
          </p>
          <Button onClick={() => window.history.back()} variant="outline" className="w-full">
            Voltar
          </Button>
        </div>
      </div>
    );
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

              {/* Submenu Cadastros - only show if user has any setup permissions */}
              {setupNavigation.length > 0 && (
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
                </div>
              )}

              {/* Administration Menu - only show if user has any admin permissions */}
              {adminNavigation.length > 0 && (
                <div className="pt-4">
                  <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administração</p>
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
                </div>
              )}
            </nav>

            {/* Bottom user section */}
            <div className="p-4 border-t border-slate-800">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-3 p-2 h-auto text-left text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl">
                    <Avatar className="w-10 h-10 border-2 border-slate-700">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-white">
                        {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="font-medium text-white text-sm truncate">{user?.full_name || 'Usuário'}</span>
                      <span className="text-xs text-slate-500 truncate">{user?.email}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden print:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 print:overflow-visible">
          <div className="p-4 md:p-8 max-w-7xl mx-auto print:p-0 print:max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
