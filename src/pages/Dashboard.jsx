import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Visit, Client, TestResult } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Area, AreaChart } from 'recharts';
import {
    Users, ClipboardCheck, AlertTriangle, CheckCircle2, FileText, Filter,
    Calendar as CalendarIcon, ArrowRight, Clock, Settings, TrendingUp, TrendingDown, Loader2
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay, startOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dashboard Widget System
import {
    DASHBOARD_WIDGETS, DATE_PRESETS,
    loadDashboardConfig, saveDashboardConfig, getWidgetById
} from "@/lib/dashboardConfig";
import DashboardConfigDialog from "@/components/dashboard/DashboardConfigDialog";
import { KpiCard, AttentionBox, CriticalVisitsTable } from "@/components/dashboard/DashboardWidgets";

export default function Dashboard() {
    const navigate = useNavigate();

    // Dashboard Configuration
    const [dashConfig, setDashConfig] = useState(() => loadDashboardConfig());
    const [showConfigDialog, setShowConfigDialog] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        clientId: "all",
        technicianId: "all",
        datePreset: dashConfig.datePreset || '30d',
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    // Update dates when preset changes
    useEffect(() => {
        const today = new Date();
        let start, end = today;

        switch (filters.datePreset) {
            case 'today':
                start = today;
                break;
            case '7d':
                start = subDays(today, 7);
                break;
            case '30d':
                start = subDays(today, 30);
                break;
            case 'month':
                start = startOfMonth(today);
                break;
            default:
                return; // Keep custom dates
        }

        if (filters.datePreset !== 'custom') {
            setFilters(prev => ({
                ...prev,
                startDate: format(start, 'yyyy-MM-dd'),
                endDate: format(end, 'yyyy-MM-dd')
            }));
        }
    }, [filters.datePreset]);

    // Save config when it changes
    const handleConfigChange = (newConfig) => {
        setDashConfig(newConfig);
        saveDashboardConfig(newConfig);
    };

    // Fetch Clients for Filter
    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            try { return await Client.list(); } catch (e) { return []; }
        }
    });

    // Fetch Technicians for Filter
    const { data: technicians } = useQuery({
        queryKey: ['technicians'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase.from('profiles').select('*');
                if (error) {
                    console.warn('Error fetching technicians:', error.message);
                    return [];
                }
                return data || [];
            } catch (e) {
                console.warn('Error fetching technicians:', e);
                return [];
            }
        }
    });

    // Fetch Dashboard Data
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboardStats', filters],
        queryFn: async () => {
            try {
                const allVisits = await Visit.list(undefined, 500);
                const start = startOfDay(parseISO(filters.startDate));
                const end = endOfDay(parseISO(filters.endDate));

                const filteredVisits = allVisits.filter(v => {
                    const visitDate = parseISO(v.visit_date);
                    const dateMatch = isWithinInterval(visitDate, { start, end });
                    const clientMatch = filters.clientId === "all" || v.client_id === filters.clientId;
                    const techMatch = filters.technicianId === "all" || v.technician_id === filters.technicianId;
                    return dateMatch && clientMatch && techMatch;
                });

                const allResults = await TestResult.list(undefined, 2000);
                const visitIds = new Set(filteredVisits.map(v => v.id));
                const filteredResults = allResults.filter(r => visitIds.has(r.visit_id));

                // Stats
                const totalVisits = filteredVisits.length;
                const completedVisits = filteredVisits.filter(v => v.status === 'completed' || v.status === 'synced').length;
                const pendingVisits = totalVisits - completedVisits;
                const unsyncedVisits = filteredVisits.filter(v => v.status === 'completed').length;

                const redResults = filteredResults.filter(r => r.status_light === 'red');
                const yellowResults = filteredResults.filter(r => r.status_light === 'yellow');
                const greenResults = filteredResults.filter(r => r.status_light === 'green');

                const redCount = redResults.length;
                const totalCount = filteredResults.length || 1;
                const complianceRate = Math.round((greenResults.length / totalCount) * 100);

                // Previous period comparison for trend
                const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                const prevStart = subDays(start, periodDays);
                const prevEnd = subDays(end, periodDays);
                const prevVisits = allVisits.filter(v => {
                    const visitDate = parseISO(v.visit_date);
                    return isWithinInterval(visitDate, { start: prevStart, end: prevEnd });
                });
                const prevComplianceRate = prevVisits.length > 0
                    ? Math.round((allResults.filter(r =>
                        prevVisits.some(v => v.id === r.visit_id) && r.status_light === 'green'
                    ).length / allResults.filter(r => prevVisits.some(v => v.id === r.visit_id)).length) * 100) || 0
                    : 0;
                const trendDiff = complianceRate - prevComplianceRate;

                const chartData = [
                    { name: 'Conformidade', value: greenResults.length, color: '#22c55e' },
                    { name: 'Alerta', value: yellowResults.length, color: '#eab308' },
                    { name: 'Crítico', value: redCount, color: '#ef4444' },
                ];

                // Client map
                const clientList = await Client.list();
                const clientMap = new Map(clientList.map(c => [c.id, c.name]));

                // Critical visits
                const criticalVisitIds = new Set(redResults.map(r => r.visit_id));
                const criticalVisits = filteredVisits
                    .filter(v => criticalVisitIds.has(v.id))
                    .map(v => ({
                        ...v,
                        clientName: clientMap.get(v.client_id) || 'Desconhecido',
                        formattedDate: format(parseISO(v.visit_date), 'dd/MM/yyyy'),
                        redCount: redResults.filter(r => r.visit_id === v.id).length
                    }));

                // Critical clients count
                const criticalClientsSet = new Set(criticalVisits.map(v => v.client_id));
                const criticalClientsCount = criticalClientsSet.size;

                // Visits by client
                const visitsByClientMap = filteredVisits.reduce((acc, v) => {
                    const name = clientMap.get(v.client_id) || 'Desconhecido';
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                }, {});
                const visitsByClient = Object.entries(visitsByClientMap)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                // Criticality ranking (clients with most alerts)
                const criticalityByClient = {};
                redResults.forEach(r => {
                    const visit = allVisits.find(v => v.id === r.visit_id);
                    if (visit) {
                        const name = clientMap.get(visit.client_id) || 'Desconhecido';
                        criticalityByClient[name] = (criticalityByClient[name] || 0) + 1;
                    }
                });
                const criticalityRanking = Object.entries(criticalityByClient)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);

                // Time per visit - with chart data
                const timePerVisitData = filteredVisits
                    .filter(v => v.service_start_time && v.service_end_time)
                    .map(v => {
                        const s = new Date(v.service_start_time);
                        const e = new Date(v.service_end_time);
                        const minutes = Math.round((e - s) / (1000 * 60));
                        return {
                            clientName: clientMap.get(v.client_id) || 'Desconhecido',
                            date: format(parseISO(v.visit_date), 'dd/MM'),
                            minutes,
                            hours: parseFloat((minutes / 60).toFixed(1))
                        };
                    })
                    .slice(-15); // Last 15 visits
                const avgTimeMinutes = timePerVisitData.length > 0
                    ? Math.round(timePerVisitData.reduce((sum, v) => sum + v.minutes, 0) / timePerVisitData.length)
                    : 0;

                // Monthly evolution (last 6 months)
                const now = new Date();
                const sixMonthsAgo = subMonths(now, 6);
                const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
                const evolutionData = months.map(month => {
                    const monthStart = startOfMonth(month);
                    const monthEnd = endOfDay(new Date(month.getFullYear(), month.getMonth() + 1, 0));
                    const monthVisits = allVisits.filter(v => {
                        const d = parseISO(v.visit_date);
                        return isWithinInterval(d, { start: monthStart, end: monthEnd });
                    });
                    const monthResults = allResults.filter(r => monthVisits.some(v => v.id === r.visit_id));
                    const monthGreen = monthResults.filter(r => r.status_light === 'green').length;
                    const rate = monthResults.length > 0 ? Math.round((monthGreen / monthResults.length) * 100) : 0;
                    return {
                        month: format(month, 'MMM', { locale: ptBR }),
                        conformidade: rate
                    };
                });

                return {
                    totalVisits,
                    completedVisits,
                    pendingVisits,
                    unsyncedVisits,
                    redCount,
                    complianceRate,
                    trendDiff,
                    chartData,
                    criticalVisits,
                    criticalClientsCount,
                    visitsByClient,
                    criticalityRanking,
                    avgTimeMinutes,
                    timePerVisitData,
                    evolutionData
                };
            } catch (error) {
                console.error("Dashboard data fetch failed:", error);
                return {
                    totalVisits: 0, completedVisits: 0, pendingVisits: 0, unsyncedVisits: 0,
                    redCount: 0, complianceRate: 0, trendDiff: 0, chartData: [],
                    criticalVisits: [], criticalClientsCount: 0, visitsByClient: [],
                    criticalityRanking: [], avgTimeMinutes: 0, timePerVisitData: [], evolutionData: []
                };
            }
        }
    });

    // Check if widget is visible
    const isWidgetVisible = (widgetId) => dashConfig.widgetOrder.includes(widgetId);

    // Get ordered visible widgets by type
    const getVisibleWidgetsByType = (type) => {
        return dashConfig.widgetOrder
            .map(id => getWidgetById(id))
            .filter(w => w && w.type === type);
    };

    const visibleKpis = getVisibleWidgetsByType('kpi');
    const visibleCharts = getVisibleWidgetsByType('chart');

    if (isLoading) {
        return (
            <div className="p-8 text-center flex items-center justify-center h-full">
                <Loader2 className="animate-spin w-6 h-6 text-blue-600 mr-2" />
                Carregando Dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard Executivo</h1>
                    <p className="text-slate-500">Visão geral da operação WGA</p>
                </div>

                {/* Date Presets + Config */}
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {DATE_PRESETS.filter(p => p.id !== 'custom').map(preset => (
                            <Button
                                key={preset.id}
                                variant={filters.datePreset === preset.id ? 'default' : 'ghost'}
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => setFilters(prev => ({ ...prev, datePreset: preset.id }))}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setShowConfigDialog(true)}>
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={filters.clientId} onValueChange={val => setFilters(prev => ({ ...prev, clientId: val }))}>
                    <SelectTrigger className="w-[180px] h-9 text-xs">
                        <SelectValue placeholder="Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Clientes</SelectItem>
                        {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.technicianId} onValueChange={val => setFilters(prev => ({ ...prev, technicianId: val }))}>
                    <SelectTrigger className="w-[160px] h-9 text-xs">
                        <SelectValue placeholder="Técnico" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Técnicos</SelectItem>
                        {technicians?.map(t => <SelectItem key={t.id} value={t.id}>{t.name || t.email?.split('@')[0] || 'Técnico'}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block"></div>
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <Input type="date" className="h-9 w-36 text-xs" value={filters.startDate} onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value, datePreset: 'custom' }))} />
                <span className="text-slate-400 text-xs">até</span>
                <Input type="date" className="h-9 w-36 text-xs" value={filters.endDate} onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value, datePreset: 'custom' }))} />
            </div>

            {/* KPI Cards */}
            {visibleKpis.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {isWidgetVisible('kpi-visitas') && (
                        <KpiCard title="Visitas Totais" value={stats?.totalVisits} icon={ClipboardCheck} trend="No período" color="bg-blue-500" />
                    )}
                    {isWidgetVisible('kpi-alertas') && (
                        <KpiCard title="Alertas Críticos" value={stats?.redCount} icon={AlertTriangle} trend="Testes fora do padrão" color="bg-red-500" onClick={() => stats?.redCount > 0 && navigate('/visits')} className={stats?.redCount > 0 ? "cursor-pointer hover:ring-2 hover:ring-red-200" : ""} />
                    )}
                    {isWidgetVisible('kpi-conformidade') && (
                        <KpiCard title="Conformidade" value={`${stats?.complianceRate}%`} icon={CheckCircle2} trend="Taxa no período" color="bg-green-500" />
                    )}
                    {isWidgetVisible('kpi-tendencia') && (
                        <KpiCard title="Tendência" value={stats?.trendDiff > 0 ? `+${stats?.trendDiff}%` : `${stats?.trendDiff}%`} icon={stats?.trendDiff >= 0 ? TrendingUp : TrendingDown} trend="vs período anterior" trendDirection={stats?.trendDiff >= 0 ? 'up' : 'down'} color={stats?.trendDiff >= 0 ? "bg-emerald-500" : "bg-red-500"} />
                    )}
                    {isWidgetVisible('kpi-pendentes') && (
                        <KpiCard title="Pendentes" value={stats?.pendingVisits} icon={FileText} trend={`${stats?.completedVisits} encerrados`} color="bg-orange-500" />
                    )}
                    {isWidgetVisible('kpi-tempo') && (
                        <KpiCard title="Tempo Médio" value={stats?.avgTimeMinutes > 0 ? `${Math.floor(stats.avgTimeMinutes / 60)}h${stats.avgTimeMinutes % 60}m` : '-'} icon={Clock} trend="Por visita" color="bg-purple-500" />
                    )}
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart - Distribution */}
                {isWidgetVisible('chart-distribuicao') && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Distribuição de Resultados</CardTitle></CardHeader>
                        <CardContent className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats?.chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {stats?.chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-4 text-xs">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div>Conforme</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div>Alerta</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div>Crítico</div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Evolution Chart */}
                {isWidgetVisible('chart-evolucao') && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Evolução da Conformidade</CardTitle></CardHeader>
                        <CardContent className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.evolutionData}>
                                    <defs>
                                        <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                                    <Tooltip formatter={(value) => [`${value}%`, 'Conformidade']} />
                                    <Area type="monotone" dataKey="conformidade" stroke="#22c55e" fill="url(#colorConf)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Top Clients */}
                {isWidgetVisible('chart-clientes') && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Top Clientes (Visitas)</CardTitle></CardHeader>
                        <CardContent className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.visitsByClient} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Criticality Ranking */}
                {isWidgetVisible('chart-criticidade') && (
                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Ranking de Criticidade</CardTitle></CardHeader>
                        <CardContent className="h-[280px]">
                            {stats?.criticalityRanking?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.criticalityRanking} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                                    Nenhum alerta crítico no período
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Status */}
                {isWidgetVisible('chart-status') && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Status dos Relatórios</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />Encerrados</span>
                                        <span>{stats?.completedVisits}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(stats?.completedVisits / stats?.totalVisits || 0) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" />Pendentes</span>
                                        <span>{stats?.pendingVisits}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(stats?.pendingVisits / stats?.totalVisits || 0) * 100}%` }}></div>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/visits')}>
                                    Ver Todas <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Attention Box */}
                {isWidgetVisible('box-atencao') && (
                    <AttentionBox stats={stats} />
                )}

                {/* Time Per Visit Chart */}
                {isWidgetVisible('chart-tempo') && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-600" />
                                Tempo por Visita
                                {stats?.avgTimeMinutes > 0 && (
                                    <span className="text-sm font-normal text-slate-500 ml-auto">
                                        Média: {Math.floor(stats.avgTimeMinutes / 60)}h {stats.avgTimeMinutes % 60}min
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {stats?.timePerVisitData?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.timePerVisitData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="clientName"
                                            tick={{ fontSize: 10 }}
                                            angle={-45}
                                            textAnchor="end"
                                            interval={0}
                                        />
                                        <YAxis
                                            label={{ value: 'Minutos', angle: -90, position: 'insideLeft', fontSize: 11 }}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [`${value} min`, 'Tempo']}
                                            labelFormatter={(label) => `Cliente: ${label}`}
                                        />
                                        <Bar dataKey="minutes" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    <Clock className="w-5 h-5 mr-2" />
                                    Sem dados de tempo no período
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Critical Visits Table */}
            {isWidgetVisible('table-criticas') && (
                <CriticalVisitsTable visits={stats?.criticalVisits} onViewVisit={(id) => navigate(`/visits/${id}`)} />
            )}

            {/* Config Dialog */}
            <DashboardConfigDialog
                open={showConfigDialog}
                onOpenChange={setShowConfigDialog}
                config={dashConfig}
                onConfigChange={handleConfigChange}
            />
        </div>
    );
}