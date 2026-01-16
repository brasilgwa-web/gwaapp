import React, { useRef } from 'react';
import { Label } from './label';
import { Palette } from 'lucide-react';

export default function ColorPicker({ value, onChange, label = 'Cor' }) {
    const colorInputRef = useRef(null);

    const handleButtonClick = () => {
        colorInputRef.current?.click();
    };

    const handleColorChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {label}
            </Label>

            <div className="flex items-center gap-3">
                {/* Preview and Click Area */}
                <button
                    type="button"
                    onClick={handleButtonClick}
                    className="h-12 w-12 rounded-lg border-2 border-slate-300 cursor-pointer hover:border-slate-400 hover:scale-105 transition-all shadow-sm"
                    style={{ backgroundColor: value }}
                    title="Clique para escolher a cor"
                />

                {/* Color Name Display */}
                <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">Cor selecionada</div>
                    <div className="text-xs text-slate-500 font-mono">{value}</div>
                </div>

                {/* Hidden native color input */}
                <input
                    ref={colorInputRef}
                    type="color"
                    value={value}
                    onChange={handleColorChange}
                    className="absolute opacity-0 pointer-events-none"
                />
            </div>

            <p className="text-xs text-slate-500">
                Clique no quadrado colorido para abrir o seletor de cores
            </p>
        </div>
    );
}
