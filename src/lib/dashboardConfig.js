// Dashboard configuration utility - Widget system with localStorage persistence

export const DASHBOARD_WIDGETS = [
    // KPIs
    { id: 'kpi-visitas', title: 'Visitas Totais', type: 'kpi', icon: 'ClipboardCheck', default: true },
    { id: 'kpi-alertas', title: 'Alertas Críticos', type: 'kpi', icon: 'AlertTriangle', default: true },
    { id: 'kpi-conformidade', title: 'Conformidade', type: 'kpi', icon: 'CheckCircle2', default: true },
    { id: 'kpi-tendencia', title: 'Tendência', type: 'kpi', icon: 'TrendingUp', default: true },
    { id: 'kpi-pendentes', title: 'Relatórios Pendentes', type: 'kpi', icon: 'FileText', default: true },
    { id: 'kpi-tempo', title: 'Tempo Médio', type: 'kpi', icon: 'Clock', default: true },

    // Charts
    { id: 'chart-distribuicao', title: 'Distribuição de Resultados', type: 'chart', size: 'half', default: true },
    { id: 'chart-evolucao', title: 'Evolução da Conformidade', type: 'chart', size: 'half', default: true },
    { id: 'chart-clientes', title: 'Top Clientes', type: 'chart', size: 'half', default: true },
    { id: 'chart-criticidade', title: 'Ranking de Criticidade', type: 'chart', size: 'half', default: true },
    { id: 'chart-status', title: 'Status dos Relatórios', type: 'chart', size: 'half', default: true },
    { id: 'chart-tempo', title: 'Tempo por Visita', type: 'chart', size: 'full', default: true },

    // Alerts & Tables
    { id: 'box-atencao', title: 'Atenção Necessária', type: 'alert', size: 'half', default: true },
    { id: 'table-criticas', title: 'Visitas Críticas', type: 'table', size: 'full', default: true },
];

const STORAGE_KEY = 'wga_dashboard_config';

export const DATE_PRESETS = [
    { id: 'today', label: 'Hoje', days: 0 },
    { id: '7d', label: '7 dias', days: 7 },
    { id: '30d', label: '30 dias', days: 30 },
    { id: 'month', label: 'Este mês', days: -1 }, // Special case
    { id: 'custom', label: 'Personalizado', days: null },
];

// Get default widget order
export function getDefaultWidgetOrder() {
    return DASHBOARD_WIDGETS.filter(w => w.default).map(w => w.id);
}

// Get default hidden widgets
export function getDefaultHiddenWidgets() {
    return DASHBOARD_WIDGETS.filter(w => !w.default).map(w => w.id);
}

// Load config from localStorage
export function loadDashboardConfig() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const config = JSON.parse(stored);
            return {
                widgetOrder: config.widgetOrder || getDefaultWidgetOrder(),
                hiddenWidgets: config.hiddenWidgets || getDefaultHiddenWidgets(),
                datePreset: config.datePreset || '30d'
            };
        }
    } catch (e) {
        console.error('Error loading dashboard config:', e);
    }

    return {
        widgetOrder: getDefaultWidgetOrder(),
        hiddenWidgets: getDefaultHiddenWidgets(),
        datePreset: '30d'
    };
}

// Save config to localStorage
export function saveDashboardConfig(config) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('Error saving dashboard config:', e);
    }
}

// Reset to defaults
export function resetDashboardConfig() {
    localStorage.removeItem(STORAGE_KEY);
    return loadDashboardConfig();
}

// Get widget by ID
export function getWidgetById(id) {
    return DASHBOARD_WIDGETS.find(w => w.id === id);
}

// Move widget in order
export function moveWidget(order, widgetId, direction) {
    const index = order.indexOf(widgetId);
    if (index === -1) return order;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= order.length) return order;

    const newOrder = [...order];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    return newOrder;
}

// Toggle widget visibility
export function toggleWidgetVisibility(config, widgetId) {
    const isHidden = config.hiddenWidgets.includes(widgetId);

    if (isHidden) {
        // Show widget - add to order and remove from hidden
        return {
            ...config,
            widgetOrder: [...config.widgetOrder, widgetId],
            hiddenWidgets: config.hiddenWidgets.filter(id => id !== widgetId)
        };
    } else {
        // Hide widget - remove from order and add to hidden
        return {
            ...config,
            widgetOrder: config.widgetOrder.filter(id => id !== widgetId),
            hiddenWidgets: [...config.hiddenWidgets, widgetId]
        };
    }
}
