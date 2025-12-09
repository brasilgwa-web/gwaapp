import React from 'react';
import ClientLocationManager from '@/components/setup/ClientLocationManager';

export default function SetupClients() {
    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Clientes</h1>
            <ClientLocationManager />
        </div>
    );
}