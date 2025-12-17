// Permissions utility for RBAC
// Maps route paths to permission keys

export const ROUTE_PERMISSIONS = {
    '/dashboard': 'dashboard',
    '/visits': 'visits',
    '/setup/clients': 'setup_clients',
    '/setup/equipments': 'setup_equipments',
    '/setup/tests': 'setup_tests',
    '/setup/products': 'setup_products',
    '/setup/templates': 'setup_templates',
    '/users': 'admin_users',
    '/setup/ai': 'admin_ai',
    '/setup/roles': 'admin_roles',
};

// All available permissions with labels
export const ALL_PERMISSIONS = [
    { key: 'dashboard', label: 'Dashboard', group: 'Geral' },
    { key: 'visits', label: 'Minhas Visitas', group: 'Geral' },
    { key: 'setup_clients', label: 'Clientes e Locais', group: 'Cadastros' },
    { key: 'setup_equipments', label: 'Equipamentos', group: 'Cadastros' },
    { key: 'setup_tests', label: 'Testes', group: 'Cadastros' },
    { key: 'setup_products', label: 'Produtos Químicos', group: 'Cadastros' },
    { key: 'setup_templates', label: 'Modelos de Relatório', group: 'Cadastros' },
    { key: 'admin_users', label: 'Gestão de Usuários', group: 'Administração' },
    { key: 'admin_ai', label: 'Configurações IA', group: 'Administração' },
    { key: 'admin_roles', label: 'Gerenciar Perfis', group: 'Administração' },
];

// Check if user can access a specific route
export function canAccessRoute(userPermissions, routePath) {
    if (!userPermissions || userPermissions.length === 0) return false;

    // Find the best matching route (longest match wins for nested routes)
    let matchedKey = null;
    let longestMatch = 0;

    for (const [path, key] of Object.entries(ROUTE_PERMISSIONS)) {
        if (routePath.startsWith(path) && path.length > longestMatch) {
            matchedKey = key;
            longestMatch = path.length;
        }
    }

    if (!matchedKey) return true; // Unknown routes are allowed by default

    return userPermissions.includes(matchedKey);
}

// Check if user has a specific permission
export function hasPermission(userPermissions, permissionKey) {
    if (!userPermissions) return false;
    return userPermissions.includes(permissionKey);
}

// Filter navigation items based on permissions
export function filterNavigation(navItems, userPermissions) {
    if (!userPermissions || userPermissions.length === 0) return [];

    return navItems.filter(item => {
        const permissionKey = ROUTE_PERMISSIONS[item.href];
        if (!permissionKey) return true; // Allow if not in permission map
        return userPermissions.includes(permissionKey);
    });
}
