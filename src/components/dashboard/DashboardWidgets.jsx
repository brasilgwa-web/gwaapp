import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ClipboardCheck, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
    FileText, Clock, Users, Loader2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

// Icon mapping
const ICONS = {
    ClipboardCheck,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    FileText,
    Clock,
    Users,
};

// KPI Card Component
export function KpiCard({ title, value, icon, trend, trendDirection, color, onClick, className }) {
    const IconComponent = typeof icon === 'string' ? ICONS[icon] : icon;
    const isPositive = trendDirection === 'up';
    const isNegative = trendDirection === 'down';

    return (
        <Card
            className={`relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''} ${className || ''}`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{value ?? '-'}</p>
                        {trend && (
                            <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-500'
                                }`}>
                                {isPositive && <TrendingUp className="w-3 h-3" />}
                                {isNegative && <TrendingDown className="w-3 h-3" />}
                                <span>{trend}</span>
                            </div>
                        )}
                    </div>
                    {IconComponent && (
                        <div className={`p-2 rounded-lg ${color || 'bg-blue-500'}`}>
                            <IconComponent className="w-5 h-5 text-white" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Attention Box Component
export function AttentionBox({ stats, onViewDetails }) {
    const navigate = useNavigate();

    const items = [
        {
            label: 'Clientes com alertas críticos',
            count: stats?.criticalClientsCount || 0,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            show: (stats?.criticalClientsCount || 0) > 0
        },
        {
            label: 'Relatórios pendentes',
            count: stats?.pendingVisits || 0,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            show: (stats?.pendingVisits || 0) > 0
        },
        {
            label: 'Visitas sem sincronização',
            count: stats?.unsyncedVisits || 0,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            show: (stats?.unsyncedVisits || 0) > 0
        }
    ].filter(item => item.show);

    if (items.length === 0) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        Tudo em Ordem!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-green-600">Nenhum item requer atenção no momento.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-orange-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="w-5 h-5" />
                    Atenção Necessária
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {items.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${item.bgColor}`}>
                        <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
                        <span className={`text-lg font-bold ${item.color}`}>{item.count}</span>
                    </div>
                ))}
                <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate('/visits')}
                >
                    Ver Detalhes <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
}

// Critical Visits Table Component
export function CriticalVisitsTable({ visits, onViewVisit }) {
    if (!visits || visits.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Visitas Críticas</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 text-center py-4">
                        Nenhuma visita com alertas críticos no período.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Visitas Críticas ({visits.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-2 text-left">Cliente</th>
                                <th className="px-4 py-2 text-left hidden md:table-cell">Data</th>
                                <th className="px-4 py-2 text-center">Alertas</th>
                                <th className="px-4 py-2 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visits.slice(0, 5).map((visit) => (
                                <tr key={visit.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium">{visit.clientName}</td>
                                    <td className="px-4 py-2 text-slate-500 hidden md:table-cell">{visit.formattedDate}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                            {visit.redCount || 1}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onViewVisit?.(visit.id)}
                                        >
                                            Ver <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
