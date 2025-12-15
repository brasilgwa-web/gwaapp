import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, LocationEquipment, Equipment, Product, VisitDosage } from "@/api/entities";
import { Input } from "@/components/ui/input";
import { Beaker, Save, Loader2, MapPin, Package, Droplets } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DosageBoardTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);

    // Queries
    const { data: locations } = useQuery({ queryKey: ['locations', visit.client_id], queryFn: () => Location.filter({ client_id: visit.client_id }, undefined, 200) });
    const { data: allLocationEquipments } = useQuery({ queryKey: ['locationEquipments'], queryFn: () => LocationEquipment.list(undefined, 1000) });
    const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => Product.list() });
    const { data: dosages } = useQuery({
        queryKey: ['dosages', visit.id],
        queryFn: () => VisitDosage.filter({ visit_id: visit.id }, undefined, 1000)
    });

    // Save Mutation
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
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dosages', visit.id] });
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const handleBlur = (locationEquipmentId, productId, field, value) => {
        saveDosageMutation.mutate({ locationEquipmentId, productId, field, value });
    };

    const getDosage = (locEqId, prodId) => dosages?.find(d => d.location_equipment_id === locEqId && d.product_id === prodId);

    // Prepare Grid Data
    const groupedData = useMemo(() => {
        if (!locations || !allLocationEquipments) return [];
        return locations.map(loc => ({
            ...loc,
            equipments: allLocationEquipments.filter(le => le.location_id === loc.id)
        })).filter(l => l.equipments.length > 0);
    }, [locations, allLocationEquipments]);


    if (!products) return <div className="p-4 text-center"><Loader2 className="animate-spin inline mr-2" />Carregando produtos...</div>;
    if (products.length === 0) return (
        <Card className="bg-slate-50 border-dashed">
            <CardContent className="p-8 text-center text-slate-500">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p>Nenhum produto químico cadastrado.</p>
                <p className="text-sm mt-2">Vá em Configurações &gt; Produtos Químicos para cadastrar.</p>
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
                                    <span className="font-semibold text-sm uppercase">{eq.name}</span>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b">
                                            <tr>
                                                <th className="px-4 py-3 text-left w-1/3">Produto</th>
                                                <th className="px-4 py-3 text-center w-24">Unidade</th>
                                                <th className="px-4 py-3 text-center">Estoque Atual</th>
                                                <th className="px-4 py-3 text-center">Dosagem Aplicada</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {products.map(prod => {
                                                const record = getDosage(eq.id, prod.id);
                                                return (
                                                    <tr key={prod.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2 font-medium text-slate-700">{prod.name}</td>
                                                        <td className="px-4 py-2 text-center text-xs text-slate-500">{prod.unit}</td>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Package className="w-3 h-3 text-slate-400" />
                                                                <Input
                                                                    type="number" step="0.1"
                                                                    className="h-8 w-24 text-center"
                                                                    placeholder="0"
                                                                    defaultValue={record?.current_stock}
                                                                    onBlur={(e) => handleBlur(eq.id, prod.id, 'current_stock', e.target.value)}
                                                                    disabled={readOnly}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Droplets className="w-3 h-3 text-slate-400" />
                                                                <Input
                                                                    type="number" step="0.1"
                                                                    className="h-8 w-24 text-center"
                                                                    placeholder="0"
                                                                    defaultValue={record?.dosage_applied}
                                                                    onBlur={(e) => handleBlur(eq.id, prod.id, 'dosage_applied', e.target.value)}
                                                                    disabled={readOnly}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}

            {groupedData.length === 0 && (
                <Card className="bg-slate-50 border-dashed"><CardContent className="p-8 text-center text-slate-500"><p>Nenhum local/equipamento encontrado.</p></CardContent></Card>
            )}
        </div>
    );
}
