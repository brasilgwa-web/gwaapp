import React from 'react';
import ObservationTemplateManager from '@/components/setup/ObservationTemplateManager';

export default function SetupTemplates() {
    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Configuração de Modelos</h1>
            <ObservationTemplateManager />
        </div>
    );
}
