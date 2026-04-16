import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceArea, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Pre-defined color palette
const CHART_COLORS = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#0ea5e9', // sky-500
    '#eab308', // yellow-500
    '#16a34a', // green-600
    '#8b5cf6', // violet-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
];

/**
 * TrendChart - Renders a line chart for a single parameter across multiple equipment/points
 * Styled to match the WGA reference images (light blue VMP band, colored lines, etc.)
 */
export default function TrendChart({ chart, clientCity, periodDays, forPdf = false }) {
    const { testName, unit, minVmp, maxVmp, series } = chart;

    // Merge all dates from all series into a unified timeline
    const { mergedData, allDates } = useMemo(() => {
        const dateSet = new Set();
        series.forEach(s => s.data.forEach(d => dateSet.add(d.date)));
        const sortedDates = [...dateSet].sort();

        // Create merged data points: one entry per date with all series values
        const merged = sortedDates.map(date => {
            const point = { date };
            series.forEach((s, idx) => {
                const match = s.data.find(d => d.date === date);
                point[`series_${idx}`] = match ? match.value : null;
            });
            return point;
        });

        return { mergedData: merged, allDates: sortedDates };
    }, [series]);

    // Calculate Y-axis domain
    const yDomain = useMemo(() => {
        let allValues = [];
        series.forEach(s => s.data.forEach(d => allValues.push(d.value)));
        if (minVmp !== null) allValues.push(minVmp);
        if (maxVmp !== null) allValues.push(maxVmp);

        if (allValues.length === 0) return [0, 10];

        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.15 || 1;
        return [
            Math.floor((min - padding) * 100) / 100,
            Math.ceil((max + padding) * 100) / 100
        ];
    }, [series, minVmp, maxVmp]);

    const formatDate = (dateStr) => {
        try {
            const d = parseISO(dateStr);
            return format(d, "MMM ''yy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const chartTitle = `Trend - Pontos de consumo - ${testName} - ${clientCity || 'BRA'} - Last ${periodDays} days`;

    const containerHeight = forPdf ? 280 : 320;
    const fontSize = forPdf ? 8 : 10;

    return (
        <div className={`bg-white border border-slate-200 rounded-sm overflow-hidden ${forPdf ? '' : 'mb-6'}`}
             style={forPdf ? { width: '100%', pageBreakInside: 'avoid' } : {}}>
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-blue-600">{chartTitle}</span>
                <span className="text-xs text-slate-500 font-medium">All Data Chart</span>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: containerHeight }} className="px-2 pt-2 relative">
                {series.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="bg-white/80 rounded-lg px-4 py-2 text-center">
                            <p className="text-xs text-slate-400 italic">
                                Sem dados históricos para este parâmetro no período selecionado
                            </p>
                        </div>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergedData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                        {/* VMP Band (Reference Area) */}
                        {minVmp !== null && maxVmp !== null && (
                            <ReferenceArea
                                y1={minVmp}
                                y2={maxVmp}
                                fill="#dbeafe"
                                fillOpacity={0.5}
                                stroke="#93c5fd"
                                strokeDasharray="3 3"
                            />
                        )}

                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize }}
                            stroke="#94a3b8"
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={yDomain}
                            tick={{ fontSize }}
                            stroke="#94a3b8"
                            label={{
                                value: unit ? `${testName} (${unit})` : testName,
                                angle: -90,
                                position: 'insideLeft',
                                style: { fontSize: fontSize - 1, fill: '#64748b' },
                                offset: 0
                            }}
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                const idx = parseInt(name.replace('series_', ''));
                                const seriesName = series[idx]?.name || name;
                                return [value !== null ? value : 'N/A', seriesName];
                            }}
                            labelFormatter={(label) => {
                                try {
                                    return format(parseISO(label), "dd/MM/yyyy");
                                } catch {
                                    return label;
                                }
                            }}
                            contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                        />

                        {/* Lines for each series/point */}
                        {series.map((s, idx) => (
                            <Line
                                key={idx}
                                type="monotone"
                                dataKey={`series_${idx}`}
                                name={`series_${idx}`}
                                stroke={s.color || CHART_COLORS[idx % CHART_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3, fill: s.color || CHART_COLORS[idx % CHART_COLORS.length] }}
                                connectNulls={false}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-2 border-t border-slate-100">
                {series.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: s.color || CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span>
                            <span className="font-semibold">{testName}</span>
                            <br />
                            <span className="text-slate-400">{s.name}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
