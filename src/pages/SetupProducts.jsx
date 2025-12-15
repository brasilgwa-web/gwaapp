import React from 'react';
import ProductCatalog from '@/components/setup/ProductCatalog';

export default function SetupProducts() {
    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Catálogo de Produtos Químicos</h1>
            <ProductCatalog />
        </div>
    );
}
