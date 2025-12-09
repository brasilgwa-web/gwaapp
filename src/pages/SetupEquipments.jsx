import React from 'react';
import EquipmentCatalog from '@/components/setup/EquipmentCatalog';

export default function SetupEquipments() {
    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Configuração de Equipamentos</h1>
            <EquipmentCatalog />
        </div>
    );
}