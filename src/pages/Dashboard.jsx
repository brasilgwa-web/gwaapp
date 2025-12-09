import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Visit, Client, TestResult } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Users, ClipboardCheck, AlertTriangle, CheckCircle2, FileText, Filter, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from '../utils';

export default function Dashboard() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        clientId: "all",
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [showCriticalDialog, setShowCriticalDialog] = useState(false);

    // Fetch Clients for Filter
    const { data: clients } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            try {
                return await Client.list();
            } catch (e) {
                return [];
            }
        }
    });

    // Fetch Dashboard Data
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboardStats', filters],
        queryFn: async () => {
            try {
                // 1. Fetch Visits based on rough date range (limit logic for now, or fetch all and filter in memory if SDK limits allowed)
                // SDK lists might be paginated, here we fetch a good chunk.
                const allVisits = await Visit.list(undefined, 500);

                // 2. Filter Visits in Memory
                const start = startOfDay(parseISO(filters.startDate));
                const end = endOfDay(parseISO(filters.endDate));

                const filteredVisits = allVisits.filter(v => {
                    const visitDate = parseISO(v.visit_date);
                    const dateMatch = isWithinInterval(visitDate, { start, end });
                    const clientMatch = filters.clientId === "all" || v.client_id === filters.clientId;
                    return dateMatch && clientMatch;
                });

                // 3. Fetch Results (optimization: only for filtered visits would be better, but tricky with current SDK without massive queries)
                // For now, fetching a large batch of latest results or ideally filtering by visit_ids if possible.
                // Since we can't do "IN" query easily, we fetch latest 2000 results and match.
                const allResults = await TestResult.list(undefined, 2000);

                const visitIds = new Set(filteredVisits.map(v => v.id));
                const filteredResults = allResults.filter(r => visitIds.has(r.visit_id));

                // Stats Calculation
                const totalVisits = filteredVisits.length;
                const completedVisits = filteredVisits.filter(v => v.status === 'completed' || v.status === 'synced').length;
                const pendingVisits = totalVisits - completedVisits;

                // Status Analysis
                const redResults = filteredResults.filter(r => r.status_light === 'red');
                const yellowResults = filteredResults.filter(r => r.status_light === 'yellow');
                const greenResults = filteredResults.filter(r => r.status_light === 'green');

                const redCount = redResults.length;
                const yellowCount = yellowResults.length;
                const greenCount = greenResults.length;
                const totalCount = filteredResults.length || 1;

                const complianceRate = Math.round((greenCount / totalCount) * 100);

                const chartData = [
                    { name: 'Conformidade', value: greenCount, color: '#22c55e' },
                    { name: 'Alerta', value: yellowCount, color: '#eab308' },
                    { name: 'Crítico', value: redCount, color: '#ef4444' },
                ];

                // Identify Critical Visits for the Dialog
                const criticalVisitIds = new Set(redResults.map(r => r.visit_id));
                const criticalVisits = filteredVisits.filter(v => criticalVisitIds.has(v.id));

                // Enrich Critical Visits with Client Name (need client list)
                const clientList = await Client.list();
                const clientMap = new Map(clientList.map(c => [c.id, c.name]));
                const enrichedCriticalVisits = criticalVisits.map(v => ({
                    ...v,
                    clientName: clientMap.get(v.client_id) || 'Desconhecido'
                }));

                // Calculate Visits per Client
                const visitsByClientMap = filteredVisits.reduce((acc, v) => {
                    const name = clientMap.get(v.client_id) || 'Desconhecido';
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                }, {});

                const visitsByClient = Object.entries(visitsByClientMap)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10); // Top 10 clients

                return {
                    totalVisits,
                    completedVisits,
                    pendingVisits,
                    redCount,
                    complianceRate,
                    chartData,
                    criticalVisits: enrichedCriticalVisits,
                    visitsByClient
                };
            } catch (error) {
                console.error("Dashboard data fetch failed:", error);
                return {
                    totalVisits: 0,
                    completedVisits: 0,
                    pendingVisits: 0,
                    redCount: 0,
                    complianceRate: 0,
                    chartData: [],
                    criticalVisits: [],
                    visitsByClient: []
                };
            }
        }
    });

    if (isLoading) return <div className="p-8 text-center flex items-center justify-center h-full"><div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mr-2"></div> Carregando Dashboard...</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard WGA</h1>
                    <p className="text-slate-500">Visão geral da operação</p>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <Select
                            value={filters.clientId}
                            onValueChange={(val) => setFilters(prev => ({ ...prev, clientId: val }))}
                        >
                            <SelectTrigger className="w-[180px] h-9 text-xs">
                                <SelectValue placeholder="Cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Clientes</SelectItem>
                                {clients?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        <Input
                            type="date"
                            className="h-9 w-32 text-xs"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                        <span className="text-slate-400 text-xs">até</span>
                        <Input
                            type="date"
                            className="h-9 w-32 text-xs"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard
                    title="Visitas Totais"
                    value={stats?.totalVisits}
                    icon={ClipboardCheck}
                    trend="No período"
                    color="bg-blue-500"
                />
                <KpiCard
                    title="Alertas Críticos"
                    value={stats?.redCount}
                    icon={AlertTriangle}
                    trend="Testes fora do padrão"
                    color="bg-red-500"
                    onClick={() => stats?.redCount > 0 && setShowCriticalDialog(true)}
                    className={stats?.redCount > 0 ? "cursor-pointer hover:ring-2 hover:ring-red-200 transition-all" : ""}
                />
                <KpiCard
                    title="Conformidade"
                    value={`${stats?.complianceRate}%`}
                    icon={CheckCircle2}
                    trend="Taxa de aprovação"
                    color="bg-green-500"
                />
                <KpiCard
                    title="Relatórios Pendentes"
                    value={stats?.pendingVisits}
                    icon={FileText}
                    trend={`${stats?.completedVisits} encerrados`}
                    color="bg-orange-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Distribuição de Resultados</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats?.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div>Conforme</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400"></div>Alerta</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Crítico</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Visits by Client Chart */}
                <Card className="md:col-span-2 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Top Clientes (Visitas)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.visitsByClient} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#3b82f6" name="Visitas" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Status Breakdown (Pending vs Completed) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Status dos Relatórios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Encerrados / Sincronizados</span>
                                    <span>{stats?.completedVisits}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: `${(stats?.completedVisits / stats?.totalVisits || 0) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" /> Pendentes / Em Andamento</span>
                                    <span>{stats?.pendingVisits}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 rounded-full"
                                        style={{ width: `${(stats?.pendingVisits / stats?.totalVisits || 0) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t">
                                <Button variant="outline" className="w-full" onClick={() => navigate('/visits')}>
                                    Ver Todas as Visitas <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Critical Alerts Dialog */}
            <Dialog open={showCriticalDialog} onOpenChange={setShowCriticalDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            Relatórios com Alertas Críticos
                        </DialogTitle>
                        <DialogDescription>
                            Listagem de visitas no período que apresentaram resultados fora dos parâmetros críticos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4">
                        {stats?.criticalVisits?.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Nenhum alerta crítico encontrado no período.</p>
                        ) : (
                            <div className="grid gap-3">
                                {stats?.criticalVisits?.map(visit => (
                                    <Link key={visit.id} to={createPageUrl(`VisitDetail?id=${visit.id}`)}>
                                        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                                            <div>
                                                <p className="font-bold text-red-900">{visit.clientName}</p>
                                                <p className="text-sm text-red-700 flex items-center gap-2 mt-1">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    {format(new Date(visit.visit_date), "dd/MM/yyyy")}
                                                </p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-red-400" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon, trend, color, onClick, className }) {
    return (
        <Card onClick={onClick} className={className}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <h3 className="text-2xl font-bold mt-1 text-slate-900">{value}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
                        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">{trend}</p>
            </CardContent>
        </Card>
    );
}