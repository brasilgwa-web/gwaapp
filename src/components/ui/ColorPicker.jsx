import React, { useState } from 'react';
import { Label } from './label';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './button';

const PRESET_COLORS = [
    { name: 'Azul WGA', value: '#1e40af' },
    { name: 'Azul Escuro', value: '#1e3a8a' },
    { name: 'Azul Claro', value: '#3b82f6' },
    { name: 'Verde', value: '#059669' },
    { name: 'Verde Escuro', value: '#065f46' },
    { name: 'Vermelho', value: '#dc2626' },
    { name: 'Laranja', value: '#ea580c' },
    { name: 'Roxo', value: '#7c3aed' },
    { name: 'Rosa', value: '#db2777' },
    { name: 'Cinza Escuro', value: '#374151' },
    { name: 'Preto', value: '#000000' },
    { name: 'Branco', value: '#ffffff' },
];

export default function ColorPicker({ value, onChange, label = 'Cor' }) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const selectedColor = PRESET_COLORS.find(c => c.value === value);

    return (
        <div className="space-y-3">
            <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {label}
            </Label>

            {/* Current Selection Display */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div
                    className="h-12 w-12 rounded border-2 border-slate-300 flex-shrink-0"
                    style={{ backgroundColor: value }}
                />
                <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">
                        {selectedColor?.name || 'Cor personalizada'}
                    </div>
                    <div className="text-xs text-slate-500">{value}</div>
                </div>
            </div>

            {/* Color Palette - Always Visible */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="text-sm font-medium text-slate-700 mb-3">Escolha uma cor:</div>
                <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => onChange(color.value)}
                            className={`h-12 w-full rounded-lg border-2 transition-all hover:scale-110 hover:shadow-md ${value === color.value
                                    ? 'border-blue-500 ring-2 ring-blue-200 scale-105'
                                    : 'border-slate-300'
                                }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                        />
                    ))}
                </div>
            </div>

            {/* Advanced Options - Collapsed by Default */}
            <div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-slate-600 hover:text-slate-900"
                >
                    {showAdvanced ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                    {showAdvanced ? 'Ocultar' : 'Mostrar'} opções avançadas
                </Button>

                {showAdvanced && (
                    <div className="mt-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="text-sm font-medium text-slate-700 mb-2">Cor Personalizada</div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="#1e40af"
                                className="flex-1 h-10 px-3 rounded border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Use esta opção apenas se precisar de uma cor específica não disponível acima.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
