import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, LocationEquipment, Equipment, ClientProduct, EquipmentDosageParams, VisitDosage, Product } from "@/api/entities";
import { Input } from "@/components/ui/input";
import { Beaker, Save, Loader2, MapPin, Package, Droplets, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DosageBoardTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);

    // Queries - with refetch to pick up newly added equipment
    const { data: locations } = useQuery({
        queryKey: ['locations', visit.client_id],
        queryFn: () => Location.filter({ client_id: visit.client_id }, undefined, 200),
        staleTime: 0,
        refetchOnMount: 'always'
    });
    const { data: allLocationEquipments } = useQuery({
        queryKey: ['locationEquipments'],
        queryFn: () => LocationEquipment.list(undefined, 1000),
        staleTime: 0,
        refetchOnMount: 'always'
    });
    const { data: allEquipments } = useQuery({ queryKey: ['equipments'], queryFn: () => Equipment.list(undefined, 1000) });

    // Setup Data - with refetch for fresh dosage params
    const { data: clientProducts } = useQuery({
        queryKey: ['clientProducts', visit.client_id],
        queryFn: () => ClientProduct.filter({ client_id: visit.client_id }),
        staleTime: 0,
        refetchOnMount: 'always'
    });
    const { data: dosageParams } = useQuery({
        queryKey: ['dosageParams'],
        queryFn: () => EquipmentDosageParams.list(),
        staleTime: 0,
        refetchOnMount: 'always'
    });
    const { data: allProducts } = useQuery({ queryKey: ['products'], queryFn: () => Product.list() });

    // Visit Data
    const { data: dosages } = useQuery({
        queryKey: ['dosages', visit.id],
        queryFn: () => VisitDosage.filter({ visit_id: visit.id }, undefined, 1000)
    });

    // Save Mutation - handles both dosage_applied and current_stock
    const saveDosageMutation = useMutation({
        mutationFn: async ({ locationEquipmentId, productId, field, value }) => {
            setIsSaving(true);
            const numValue = value === '' ? null : parseFloat(value);

            // Find existing record
            const existing = dosages?.find(d =>
                d.location_equipment_id === locationEquipmentId &&
                d.product_id === productId
            );

            if (existing) {
                return VisitDosage.update(existing.id, { [field]: numValue });
            } else {
                return VisitDosage.create({
                    visit_id: visit.id,
                    location_equipment_id: locationEquipmentId,
                    product_id: productId,
                    [field]: numValue
                });
            }
        },
        onSettled: async () => {
            queryClient.invalidateQueries({ queryKey: ['dosages', visit.id] });

            // Fetch fresh visit data to check service_start_time
            const { data: freshVisit } = await supabase.from('visits').select('*').eq('id', visit.id).single();

            // Auto-capture service_start_time on first change
            if (freshVisit && !freshVisit.service_start_time && freshVisit.status !== 'completed') {
                await supabase.from('visits').update({ service_start_time: new Date().toISOString() }).eq('id', visit.id);
                queryClient.invalidateQueries({ queryKey: ['visit', visit.id] });
            }

            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const handleBlur = (locationEquipmentId, productId, field, value) => {
        saveDosageMutation.mutate({ locationEquipmentId, productId, field, value });
    };

    // Fetch Client to check 'has_stock_access'
    const { data: clientData } = useQuery({
        queryKey: ['client', visit.client_id],
        queryFn: () => Client.filter({ id: visit.client_id }).then(res => res[0]),
        staleTime: 60000 // Cache for a minute
    });

    // Default to true if not loaded yet or undefined (legacy compatibility)
    const hasStockAccess = clientData?.has_stock_access !== false;

    // Helper to get dosage record
    const getDosageRecord = (locationEquipmentId, productId) => {
        return dosages?.find(d =>
            d.location_equipment_id === locationEquipmentId &&
            d.product_id === productId
        );
    };

    // Prepare Grid Data
    const groupedData = useMemo(() => {
        if (!locations || !allLocationEquipments || !allEquipments || !clientProducts || !dosageParams || !allProducts) return null;

        return locations.map(loc => {
            const equipmentsWithProducts = allLocationEquipments
                .filter(le => le.location_id === loc.id)
                .map(le => {
                    const catalogItem = allEquipments.find(e => e.id === le.equipment_id);
                    const instanceParams = dosageParams.filter(dp => dp.location_equipment_id === le.id);

                    const productsToDisplay = instanceParams.map(dp => {
                        const prod = allProducts.find(p => p.id === dp.product_id);
                        const clientStock = clientProducts.find(cp => cp.product_id === dp.product_id);
                        return {
                            ...prod,
                            doseParams: dp,
                            clientStock: clientStock, // Contains current_stock, min_stock
                        };
                    }).filter(p => p.id); // Valid products

                    return {
                        ...le,
                        catalogName: catalogItem?.name || 'Equipamento',
                        products: productsToDisplay
                    };
                });

            return {
                ...loc,
                equipments: equipmentsWithProducts
            };
        }).filter(l => l.equipments.length > 0);
    }, [locations, allLocationEquipments, allEquipments, clientProducts, dosageParams, allProducts]);


    if (!groupedData) return <div className="p-4 text-center"><Loader2 className="animate-spin inline mr-2" />Carregando dados de dosagem...</div>;

    if (groupedData.length === 0) return (
        <Card className="bg-slate-50 border-dashed">
            <CardContent className="p-8 text-center text-slate-500">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p>Nenhum produto configurado para os equipamentos deste cliente.</p>
                <p className="text-sm mt-2">Configure os produtos e dosagens na tela de Detalhes do Cliente.</p>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Status Bar */}
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span>Salvando...</span></> : <><Save className="w-4 h-4 text-green-600" /><span>Dados salvos</span></>}
                </div>
                {!hasStockAccess && (
                    <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        Sem Acesso ao Estoque
                    </div>
                )}
            </div>

            {groupedData.map(location => (
                <div key={location.id} className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-500 uppercase text-xs font-bold tracking-wider pl-1 border-b border-slate-100 pb-1">
                        <MapPin className="w-3 h-3" />{location.name}
                    </div>

                    <div className="grid gap-6">
                        {location.equipments.map(eq => (
                            <Card key={eq.id} className="overflow-hidden">
                                <div className="bg-blue-600 px-4 py-2 text-white flex items-center gap-2">
                                    <Beaker className="w-4 h-4 opacity-75" />
                                    <span className="font-semibold text-sm uppercase">{eq.catalogName}</span>
                                </div>
                                <div className="p-0">
                                    {eq.products.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500">
                                            <Package className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                            <p className="text-sm">Nenhum produto configurado para este equipamento.</p>
                                            <p className="text-xs mt-1">Configure em Clientes → Configurar Equipamento</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Mobile card layout */}
                                            <div className="md:hidden divide-y divide-slate-100">
                                                {eq.products.map(prod => {
                                                    const record = getDosageRecord(eq.id, prod.id);
                                                    const recommended = prod.doseParams?.recommended_dosage || 0;
                                                    const applied = record?.dosage_applied ?? recommended;
                                                    const currentStock = prod.clientStock?.current_stock || 0;
                                                    const minStock = prod.clientStock?.min_stock || 0;
                                                    const finalStock = currentStock - applied;
                                                    const isLowStock = finalStock < minStock;

                                                    return (
                                                        <div key={prod.id} className="p-3 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <div className="font-medium text-slate-700">{prod.name}</div>
                                                                {hasStockAccess && (
                                                                    <div className="text-sm text-slate-500">Estoque: <span className="font-mono font-bold">{currentStock || '-'}</span></div>
                                                                )}
                                                            </div>
                                                            <div className={`grid ${hasStockAccess ? 'grid-cols-3' : 'grid-cols-2'} gap-2 items-start`}>
                                                                <div className="text-center">
                                                                    <label className="text-xs text-slate-500 block">Dosagem</label>
                                                                    <div className="font-bold text-slate-700">{recommended || '-'}</div>
                                                                    <div className="text-xs text-slate-400">{prod.unit}</div>
                                                                    {prod.doseParams?.complementary_info && (
                                                                        <div className="text-xs text-blue-600">{prod.doseParams.complementary_info}</div>
                                                                    )}
                                                                </div>
                                                                <div className="text-center">
                                                                    <label className="text-xs text-slate-500 block">Aplicado</label>
                                                                    <Input
                                                                        type="number" step="0.1"
                                                                        className="h-9 w-full text-center font-bold text-blue-600"
                                                                        placeholder="0"
                                                                        defaultValue={applied}
                                                                        onBlur={(e) => handleBlur(eq.id, prod.id, 'dosage_applied', e.target.value)}
                                                                        disabled={readOnly}
                                                                    />
                                                                    <div className="text-xs text-slate-400">{prod.unit}</div>
                                                                </div>
                                                                {hasStockAccess && (
                                                                    <div className="text-center">
                                                                        <label className="text-xs text-slate-500 block">Est. Final</label>
                                                                        <div className={`font-bold ${isLowStock ? 'text-red-600' : 'text-slate-600'}`}>
                                                                            {finalStock.toFixed(1)}
                                                                            {isLowStock && <AlertTriangle className="w-3 h-3 ml-1 inline text-red-500" />}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Desktop table layout */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left">Produto</th>
                                                            {hasStockAccess && <th className="px-4 py-3 text-center">Estoque</th>}
                                                            <th className="px-4 py-3 text-center">Dosagem</th>
                                                            <th className="px-4 py-3 text-center">Aplicado</th>
                                                            {hasStockAccess && <th className="px-4 py-3 text-center">Est. Final</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {eq.products.map(prod => {
                                                            const record = getDosageRecord(eq.id, prod.id);
                                                            const recommended = prod.doseParams?.recommended_dosage || 0;
                                                            const applied = record?.dosage_applied ?? recommended;
                                                            const currentStock = prod.clientStock?.current_stock || 0;
                                                            const minStock = prod.clientStock?.min_stock || 0;
                                                            const finalStock = currentStock - applied;
                                                            const isLowStock = finalStock < minStock;

                                                            return (
                                                                <tr key={prod.id} className="hover:bg-slate-50">
                                                                    <td className="px-4 py-3">
                                                                        <div className="font-medium text-slate-700">{prod.name}</div>
                                                                    </td>
                                                                    {hasStockAccess && (
                                                                        <td className="px-4 py-3 text-center font-mono text-slate-600">{currentStock || '-'}</td>
                                                                    )}
                                                                    <td className="px-4 py-3 text-center">
                                                                        <div className="flex flex-col items-center">
                                                                            <div className="font-bold text-slate-700">{recommended || '-'}</div>
                                                                            <div className="text-xs text-slate-400">{prod.unit}</div>
                                                                            {prod.doseParams?.complementary_info && (
                                                                                <div className="text-xs text-blue-600">{prod.doseParams.complementary_info}</div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <Input
                                                                                type="number" step="0.1"
                                                                                className="h-8 w-20 text-center font-bold text-blue-600"
                                                                                placeholder="0"
                                                                                defaultValue={applied}
                                                                                onBlur={(e) => handleBlur(eq.id, prod.id, 'dosage_applied', e.target.value)}
                                                                                disabled={readOnly}
                                                                            />
                                                                            <div className="text-xs text-slate-400">{prod.unit}</div>
                                                                        </div>
                                                                    </td>
                                                                    {hasStockAccess && (
                                                                        <td className="px-4 py-3 text-center">
                                                                            <div className={`font-bold ${isLowStock ? 'text-red-600' : 'text-slate-600'}`}>
                                                                                {finalStock.toFixed(1)}
                                                                                {isLowStock && <AlertTriangle className="w-3 h-3 ml-1 inline" />}
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
