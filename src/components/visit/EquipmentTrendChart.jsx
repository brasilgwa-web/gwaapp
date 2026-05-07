
import React, { useMemo } from 'react';
import {
    ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CHART_COLORS = [
    '#2563eb', '#dc2626', '#16a34a', '#eab308',
    '#8b5cf6', '#f97316', '#06b6d4', '#ec4899',
];

const CustomTooltip = ({ active, payload, label, tests }) => {
    if (!active || !payload || !payload.length) return null;
    let dateLabel = label;
    try { dateLabel = format(parseISO(label), "dd/MM/yyyy"); } catch {}

    return (
        <div className="bg-white border border-slate-200 rounded shadow-md p-2 text-xs">
            <p className="font-semibold text-slate-700 mb-1">{dateLabel}</p>
            {payload.map((entry, i) => {
                const testIdx = parseInt(entry.dataKey.replace('test_', ''));
                const test = tests[testIdx];
                if (entry.value === null || entry.value === undefined) return null;
                return (
                    <p key={i} style={{ color: entry.color }}>
                        {test?.testName}: <strong>{entry.value}</strong> {test?.unit}
                    </p>
                );
            })}
        </div>
    );
};

export default function EquipmentTrendChart({ chart, clientName, periodDays, forPdf = false }) {
    const { equipmentName = '', locationName = '', tests = [] } = chart || {};

    // Merge all dates from all tests into unified timeline
    const mergedData = useMemo(() => {
        const dateSet = new Set();
        tests.forEach(t => t.data.forEach(d => dateSet.add(d.date)));
        const sortedDates = [...dateSet].sort();

        return sortedDates.map(date => {
            const point = { date };
            tests.forEach((t, idx) => {
                const match = t.data.find(d => d.date === date);
                point[`test_${idx}`] = match ? match.value : null;
            });
            return point;
        });
    }, [tests]);

    // Y-axis domains per test
    const yDomains = useMemo(() => tests.map(t => {
        const values = t.data.map(d => d.value);
        if (t.minVmp !== null) values.push(t.minVmp);
        if (t.maxVmp !== null) values.push(t.maxVmp);
        if (values.length === 0) return [0, 10];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const pad = (max - min) * 0.2 || 1;
        return [
            Math.floor((min - pad) * 100) / 100,
            Math.ceil((max + pad) * 100) / 100
        ];
    }), [tests]);

    const formatDate = (dateStr) => {
        try { return format(parseISO(dateStr), "dd/MMM", { locale: ptBR }); }
        catch { return dateStr; }
    };

    const containerHeight = forPdf ? 300 : 340;
    const fontSize = forPdf ? 8 : 10;
    const chartTitle = `${equipmentName}${locationName ? ` | ${locationName}` : ''} — ${clientName || ''} — ${periodDays} dias`;

    // Assign Y-axis: first test on left, second on right, rest on left (hidden label)
    const getYAxisId = (idx) => idx === 1 ? 'right' : 'left';

    return (
        <div
            className={`bg-white border border-slate-200 rounded-sm overflow-hidden ${forPdf ? '' : 'mb-6'}`}
            style={forPdf ? { width: '100%', pageBreakInside: 'avoid' } : {}}
        >
            {/* Header */}
            <div className="flex items-center px-4 py-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-blue-600 truncate">{chartTitle}</span>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: containerHeight }} className="px-2 pt-2 relative">
                {mergedData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <p className="text-xs text-slate-400 italic">Sem dados históricos no período</p>
                    </div>
                )}

                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mergedData} margin={{ top: 10, right: 60, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize }}
                            stroke="#94a3b8"
                            interval="preserveStartEnd"
                        />

                        {/* Left Y-axis: first test */}
                        {tests[0] && (
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                domain={yDomains[0]}
                                tick={{ fontSize }}
                                stroke={tests[0].color}
                                label={{
                                    value: tests[0].unit ? `${tests[0].testName} (${tests[0].unit})` : tests[0].testName,
                                    angle: -90,
                                    position: 'insideLeft',
                                    style: { fontSize: fontSize - 1, fill: tests[0].color },
                                    offset: 10
                                }}
                            />
                        )}

                        {/* Right Y-axis: second test */}
                        {tests[1] && (
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={yDomains[1]}
                                tick={{ fontSize }}
                                stroke={tests[1].color}
                                label={{
                                    value: tests[1].unit ? `${tests[1].testName} (${tests[1].unit})` : tests[1].testName,
                                    angle: 90,
                                    position: 'insideRight',
                                    style: { fontSize: fontSize - 1, fill: tests[1].color },
                                    offset: 10
                                }}
                            />
                        )}

                        <Tooltip content={<CustomTooltip tests={tests} />} />

                        {/* VMP reference lines per test */}
                        {tests.map((t, idx) => {
                            const yAxisId = getYAxisId(idx);
                            return [
                                t.maxVmp !== null && (
                                    <ReferenceLine
                                        key={`usl_${idx}`}
                                        yAxisId={yAxisId}
                                        y={t.maxVmp}
                                        stroke={t.color}
                                        strokeDasharray="6 3"
                                        strokeOpacity={0.7}
                                        label={{ value: `USL-${t.maxVmp}`, fill: t.color, fontSize: fontSize - 1, position: 'right' }}
                                    />
                                ),
                                t.minVmp !== null && (
                                    <ReferenceLine
                                        key={`lsl_${idx}`}
                                        yAxisId={yAxisId}
                                        y={t.minVmp}
                                        stroke={t.color}
                                        strokeDasharray="6 3"
                                        strokeOpacity={0.7}
                                        label={{ value: `LSL-${t.minVmp}`, fill: t.color, fontSize: fontSize - 1, position: 'right' }}
                                    />
                                )
                            ].filter(Boolean);
                        })}

                        {/* Lines per test */}
                        {tests.map((t, idx) => (
                            <Line
                                key={idx}
                                yAxisId={getYAxisId(idx)}
                                type="monotone"
                                dataKey={`test_${idx}`}
                                name={t.testName}
                                stroke={t.color}
                                strokeWidth={2}
                                dot={{ r: 3, fill: t.color }}
                                connectNulls={false}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-2 border-t border-slate-100">
                {tests.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <div className="w-3 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="font-semibold">{t.testName}</span>
                        {t.unit && <span className="text-slate-400">({t.unit})</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
