import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronDown, RotateCcw, GripVertical, Eye, EyeOff } from "lucide-react";
import { DASHBOARD_WIDGETS, getWidgetById, moveWidget, toggleWidgetVisibility, resetDashboardConfig } from "@/lib/dashboardConfig";

export default function DashboardConfigDialog({ open, onOpenChange, config, onConfigChange }) {
    const handleToggle = (widgetId) => {
        const newConfig = toggleWidgetVisibility(config, widgetId);
        onConfigChange(newConfig);
    };

    const handleMoveUp = (widgetId) => {
        const newOrder = moveWidget(config.widgetOrder, widgetId, 'up');
        onConfigChange({ ...config, widgetOrder: newOrder });
    };

    const handleMoveDown = (widgetId) => {
        const newOrder = moveWidget(config.widgetOrder, widgetId, 'down');
        onConfigChange({ ...config, widgetOrder: newOrder });
    };

    const handleReset = () => {
        const defaultConfig = resetDashboardConfig();
        onConfigChange(defaultConfig);
    };

    // Split widgets by type for grouped display
    const kpiWidgets = DASHBOARD_WIDGETS.filter(w => w.type === 'kpi');
    const chartWidgets = DASHBOARD_WIDGETS.filter(w => w.type === 'chart');
    const otherWidgets = DASHBOARD_WIDGETS.filter(w => !['kpi', 'chart'].includes(w.type));

    const renderWidgetItem = (widget, index, list) => {
        const isVisible = config.widgetOrder.includes(widget.id);
        const orderIndex = config.widgetOrder.indexOf(widget.id);

        return (
            <div
                key={widget.id}
                className={`flex items-center gap-3 p-2 rounded-lg border ${isVisible ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
            >
                <Checkbox
                    checked={isVisible}
                    onCheckedChange={() => handleToggle(widget.id)}
                    id={widget.id}
                />
                <label htmlFor={widget.id} className="flex-1 text-sm font-medium cursor-pointer">
                    {widget.title}
                </label>

                {isVisible && (
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 w-6 text-center">{orderIndex + 1}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleMoveUp(widget.id)}
                            disabled={orderIndex === 0}
                        >
                            <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleMoveDown(widget.id)}
                            disabled={orderIndex === config.widgetOrder.length - 1}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configurar Dashboard</DialogTitle>
                    <DialogDescription>
                        Escolha quais indicadores exibir e em qual ordem.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* KPIs Section */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Indicadores (KPIs)
                        </h4>
                        <div className="space-y-2">
                            {kpiWidgets.map((w, i) => renderWidgetItem(w, i, kpiWidgets))}
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Gráficos
                        </h4>
                        <div className="space-y-2">
                            {chartWidgets.map((w, i) => renderWidgetItem(w, i, chartWidgets))}
                        </div>
                    </div>

                    {/* Other Widgets */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Outros
                        </h4>
                        <div className="space-y-2">
                            {otherWidgets.map((w, i) => renderWidgetItem(w, i, otherWidgets))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleReset} className="mr-auto">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurar Padrão
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        Pronto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
