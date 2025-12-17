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

    // Queries
    const { data: locations } = useQuery({ queryKey: ['locations', visit.client_id], queryFn: () => Location.filter({ client_id: visit.client_id }, undefined, 200) });
    const { data: allLocationEquipments } = useQuery({ queryKey: ['locationEquipments'], queryFn: () => LocationEquipment.list(undefined, 1000) });
    const { data: allEquipments } = useQuery({ queryKey: ['equipments'], queryFn: () => Equipment.list(undefined, 1000) });

    // Setup Data
    const { data: clientProducts } = useQuery({ queryKey: ['clientProducts', visit.client_id], queryFn: () => ClientProduct.filter({ client_id: visit.client_id }) });
    const { data: dosageParams } = useQuery({ queryKey: ['dosageParams'], queryFn: () => EquipmentDosageParams.list() }); // We filter in memory or per equipment loop
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

    const getDosageRecord = (locEqId, prodId) => dosages?.find(d => d.location_equipment_id === locEqId && d.product_id === prodId);

    // Prepare Grid Data
    const groupedData = useMemo(() => {
        if (!locations || !allLocationEquipments || !allEquipments || !clientProducts || !dosageParams || !allProducts) return null;

        return locations.map(loc => {
            const equipmentsWithProducts = allLocationEquipments
                .filter(le => le.location_id === loc.id)
                .map(le => {
                    const catalogItem = allEquipments.find(e => e.id === le.equipment_id);
                    // Find products linked to this equipment type (instance specific logic?) 
                    // In V1.2, EquipmentDosageParams links location_equipment_id (Specific Instance) -> Product
                    // Wait, looking at V1.2 Entities: 
                    // EquipmentDosageParams links `location_equipment_id` (instance) to `product_id`.
                    // So we must find params for THIS instance.

                    const instanceParams = dosageParams.filter(dp => dp.location_equipment_id === le.id);

                    // If no params, should we show all client products? 
                    // User said: "Configurar quais produtos ele utiliza". If configured, show specific.
                    // If none, maybe fallback to all? Let's stick to configured for cleanliness, or All if none to ensure usability.
                    // Let's rely on what's in Client Inventory broadly if no specific params?
                    // Better: Show linked params products FIRST. If simple, maybe just show all inventory?
                    // User Request: "No cadastro... serem considerados os tipos". 
                    // Let's stick to: Iterate Client Products, check if relevant.
                    // Actually, the prompt says "Configurar... quais produtos utiliza".

                    // Proposed Logic:
                    // 1. Get products identified in instanceParams.
                    // 2. Map them to display.

                    const linkedProdIds = instanceParams.map(p => p.product_id);

                    // We only display products that are configured for this equipment? 
                    // Or do we display all products available in Client Stock?
                    // Most flexible: Display All Client Products for every equipment might be clutter.
                    // Let's display products that are in `instanceParams`. 
                    // If `instanceParams` is empty, user hasn't configured properly. 
                    // BUT, to be safe, if empty, maybe show nothing or show all? 
                    // Let's show products from `instanceParams`.

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
                })
                .filter(e => e.products.length > 0); // Hide if no products configured

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
                                                    <div className="font-medium text-slate-700">{prod.name}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div className="text-slate-500">Recomendado: <span className="font-mono">{recommended || '-'}</span></div>
                                                        <div className="text-slate-500">Estoque: <span className="font-mono">{currentStock || '-'}</span></div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="text-xs text-slate-500">Aplicado:</label>
                                                        <Input
                                                            type="number" step="0.1"
                                                            className="h-9 flex-1 text-center font-bold text-blue-600"
                                                            placeholder="0"
                                                            defaultValue={applied}
                                                            onBlur={(e) => handleBlur(eq.id, prod.id, 'dosage_applied', e.target.value)}
                                                            disabled={readOnly}
                                                        />
                                                        <div className={`text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-slate-600'}`}>
                                                            → {finalStock.toFixed(1)}
                                                            {isLowStock && <AlertTriangle className="w-3 h-3 ml-1 inline text-red-500" />}
                                                        </div>
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
                                                    <th className="px-4 py-3 text-center">Recomendado</th>
                                                    <th className="px-4 py-3 text-center">Estoque</th>
                                                    <th className="px-4 py-3 text-center">Aplicado</th>
                                                    <th className="px-4 py-3 text-center">Est. Final</th>
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
                                                                <div className="text-xs text-slate-400">{prod.unit}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-xs text-slate-500">{recommended || '-'}</td>
                                                            <td className="px-4 py-3 text-center font-mono text-slate-600">{currentStock || '-'}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Input
                                                                    type="number" step="0.1"
                                                                    className="h-8 w-20 mx-auto text-center font-bold text-blue-600"
                                                                    placeholder="0"
                                                                    defaultValue={applied}
                                                                    onBlur={(e) => handleBlur(eq.id, prod.id, 'dosage_applied', e.target.value)}
                                                                    disabled={readOnly}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <div className={`font-bold ${isLowStock ? 'text-red-600' : 'text-slate-600'}`}>
                                                                    {finalStock.toFixed(1)}
                                                                    {isLowStock && <AlertTriangle className="w-3 h-3 ml-1 inline" />}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
