
import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), "dd/MMM", { locale: ptBR }); }
    catch { return dateStr; }
};

const formatDateFull = (dateStr) => {
    try { return format(parseISO(dateStr), "dd/MM/yyyy"); }
    catch { return dateStr; }
};

function TestSubChart({ test, isLast, forPdf, allDates }) {
    const fontSize = forPdf ? 8 : 10;
    const chartHeight = forPdf ? 130 : 160;

    const data = useMemo(() => {
        return allDates.map(date => {
            const point = test.data.find(d => d.date === date);
            return { date, value: point ? point.value : null };
        });
    }, [test.data, allDates]);

    const average = useMemo(() => {
        const validValues = test.data.filter(d => d.value !== null).map(d => d.value);
        if (validValues.length === 0) return null;
        const sum = validValues.reduce((a, b) => a + b, 0);
        return sum / validValues.length;
    }, [test.data]);

    const yDomain = useMemo(() => {
        const values = test.data.map(d => d.value);
        if (test.minVmp !== null) values.push(test.minVmp);
        if (test.maxVmp !== null) values.push(test.maxVmp);
        if (average !== null) values.push(average);
        if (values.length === 0) return [0, 10];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const pad = (max - min) * 0.2 || 1;
        return [
            Math.floor((min - pad) * 100) / 100,
            Math.ceil((max + pad) * 100) / 100
        ];
    }, [test, average]);

    const yLabel = test.unit ? `${test.testName} (${test.unit})` : test.testName;

    return (
        <div style={{ width: '100%', height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    syncId="equipment-sync"
                    margin={{ top: 4, right: 50, left: 20, bottom: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize }}
                        axisLine={true}
                        tickLine={true}
                        height={30}
                        stroke="#94a3b8"
                        interval="preserveStartEnd"
                    />

                    <YAxis
                        domain={yDomain}
                        tick={{ fontSize }}
                        stroke={test.color}
                        width={75}
                        label={{
                            value: yLabel,
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: fontSize - 1, fill: test.color, textAnchor: 'middle' },
                            offset: 15
                        }}
                    />

                    <Tooltip
                        labelFormatter={formatDateFull}
                        formatter={(value) => [
                            value !== null ? `${value} ${test.unit || ''}`.trim() : 'N/D',
                            test.testName
                        ]}
                        contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #e2e8f0' }}
                    />

                    {test.maxVmp !== null && (
                        <ReferenceLine
                            y={test.maxVmp}
                            stroke="#16a34a"
                            strokeDasharray="6 3"
                            strokeOpacity={0.8}
                            label={{ value: `USL-${test.maxVmp}`, fill: "#16a34a", fontSize: fontSize - 1, position: 'right' }}
                        />
                    )}

                    {average !== null && (
                        <ReferenceLine
                            y={average}
                            stroke="#eab308"
                            strokeDasharray="6 3"
                            strokeOpacity={0.8}
                            label={{ value: `Média-${average.toFixed(2)}`, fill: "#eab308", fontSize: fontSize - 1, position: 'right' }}
                        />
                    )}

                    {test.minVmp !== null && (
                        <ReferenceLine
                            y={test.minVmp}
                            stroke="#dc2626"
                            strokeDasharray="6 3"
                            strokeOpacity={0.8}
                            label={{ value: `LSL-${test.minVmp}`, fill: "#dc2626", fontSize: fontSize - 1, position: 'right' }}
                        />
                    )}

                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={test.color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: test.color }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function EquipmentTrendChart({ chart, clientName, periodDays, forPdf = false }) {
    const { equipmentName = '', locationName = '', tests = [] } = chart || {};

    const allDates = useMemo(() => {
        const dateSet = new Set();
        tests.forEach(t => t.data?.forEach(d => dateSet.add(d.date)));
        return [...dateSet].sort();
    }, [tests]);

    if (tests.length === 0) return null;

    const chartTitle = `${equipmentName}${locationName ? ` | ${locationName}` : ''} — ${clientName || ''} — ${periodDays} dias`;

    return (
        <div
            className={`bg-white border border-slate-200 rounded-sm overflow-hidden ${forPdf ? '' : 'mb-6'}`}
            style={forPdf ? { width: '100%', pageBreakInside: 'avoid' } : {}}
        >
            <div className="flex items-center px-4 py-2 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-semibold text-blue-600 truncate">{chartTitle}</span>
            </div>

            <div className="px-2 pt-2">
                {tests.map((test, idx) => (
                    <TestSubChart
                        key={test.testId}
                        test={test}
                        isLast={idx === tests.length - 1}
                        forPdf={forPdf}
                        allDates={allDates}
                    />
                ))}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-2 border-t border-slate-100">
                {tests.map((t) => (
                    <div key={t.testId} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <div className="w-4 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="font-semibold">{t.testName}</span>
                        {t.unit && <span className="text-slate-400">({t.unit})</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
