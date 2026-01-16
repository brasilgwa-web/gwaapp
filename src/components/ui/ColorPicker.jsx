import React, { useState } from 'react';
import { Label } from './label';
import { Palette } from 'lucide-react';

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
    const [showPicker, setShowPicker] = useState(false);

    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {label}
            </Label>

            <div className="flex items-center gap-3">
                {/* Preview Box */}
                <button
                    type="button"
                    onClick={() => setShowPicker(!showPicker)}
                    className="h-10 w-20 rounded border-2 border-slate-300 cursor-pointer hover:border-slate-400 transition-colors"
                    style={{ backgroundColor: value }}
                    title="Clique para escolher cor"
                />

                {/* Color Name/Value Display */}
                <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">
                        {PRESET_COLORS.find(c => c.value === value)?.name || 'Cor personalizada'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{value}</div>
                </div>
            </div>

            {/* Color Palette */}
            {showPicker && (
                <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-lg">
                    <div className="mb-3">
                        <div className="text-sm font-medium text-slate-700 mb-2">Cores Predefinidas</div>
                        <div className="grid grid-cols-6 gap-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(color.value);
                                        setShowPicker(false);
                                    }}
                                    className={`h-10 w-full rounded border-2 transition-all hover:scale-110 ${value === color.value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300'
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3">
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
                    </div>
                </div>
            )}
        </div>
    );
}
