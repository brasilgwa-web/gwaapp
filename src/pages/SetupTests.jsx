import React from 'react';
import TestCatalog from '@/components/setup/TestCatalog';

export default function SetupTests() {
    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Configuração de Testes</h1>
            <TestCatalog />
        </div>
    );
}