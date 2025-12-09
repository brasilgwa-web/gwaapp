import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, LocationEquipment, Equipment, EquipmentTest, TestDefinition, TestResult, Visit } from "@/api/entities";
import { Input } from "@/components/ui/input";
import { calculateStatus, getStatusColor } from "@/components/analysisUtils";
import { AlertCircle, CheckCircle, MinusCircle, Beaker, ChevronDown, ChevronUp, MapPin, ChevronsUpDown, Save, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export default function ReadingsTab({ visit, readOnly }) {
    const queryClient = useQueryClient();
    const [openItems, setOpenItems] = React.useState({});
    const [allExpanded, setAllExpanded] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const toggleItem = (id) => {
        setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // 1. Fetch ALL Locations for this client
    const { data: locations } = useQuery({
        queryKey: ['locations', visit.client_id],
        queryFn: () => Location.filter({ client_id: visit.client_id }, undefined, 200)
    });

    // 2. Fetch ALL Equipment links (up to 1000 for safety)
    const { data: allLocationEquipments } = useQuery({
        queryKey: ['locationEquipments'],
        queryFn: () => LocationEquipment.list(undefined, 1000)
    });

    // 3. Fetch ALL Equipments catalog
    const { data: allEquipments } = useQuery({
        queryKey: ['equipments'],
        queryFn: () => Equipment.list(undefined, 1000)
    });

    // 4. Fetch Equipment-Test LINKS
    const { data: equipmentTestsLinks } = useQuery({
        queryKey: ['equipmentTests'],
        queryFn: () => EquipmentTest.list(undefined, 1000)
    });

    // 5. Fetch Test Definitions (Catalog)
    const { data: allTests } = useQuery({
        queryKey: ['testDefinitions'],
        queryFn: () => TestDefinition.list(undefined, 1000)
    });

    // 6. Fetch existing Results for this visit
    const { data: results } = useQuery({
        queryKey: ['results', visit.id],
        queryFn: () => TestResult.filter({ visit_id: visit.id }, undefined, 1000)
    });

    // Mutation to save result
    const saveResultMutation = useMutation({
        mutationFn: async ({ testId, equipmentId, value, min, max, tolerance }) => {
            setIsSaving(true);
            const status = calculateStatus(value, min, max, tolerance);
            // Find existing result for this specific test AND equipment
            const existing = results?.find(r => r.test_definition_id === testId && r.equipment_id === equipmentId);

            if (existing) {
                return TestResult.update(existing.id, {
                    measured_value: parseFloat(value),
                    status_light: status
                });
            } else {
                return TestResult.create({
                    visit_id: visit.id,
                    test_definition_id: testId,
                    equipment_id: equipmentId,
                    measured_value: parseFloat(value),
                    status_light: status
                });
            }
        },
        onMutate: async (variables) => {
            // Optimistic Update
            await queryClient.cancelQueries({ queryKey: ['results', visit.id] });
            const previousResults = queryClient.getQueryData(['results', visit.id]);

            queryClient.setQueryData(['results', visit.id], (old) => {
                if (!old) return [];
                const { testId, equipmentId, value, min, max, tolerance } = variables;
                const status = calculateStatus(value, min, max, tolerance);
                const parsedValue = parseFloat(value);

                const existingIndex = old.findIndex(r => r.test_definition_id === testId && r.equipment_id === equipmentId);

                if (existingIndex > -1) {
                    const newResults = [...old];
                    newResults[existingIndex] = { ...newResults[existingIndex], measured_value: parsedValue, status_light: status };
                    return newResults;
                } else {
                    return [...old, {
                        id: 'temp-' + Date.now(),
                        visit_id: visit.id,
                        test_definition_id: testId,
                        equipment_id: equipmentId,
                        measured_value: parsedValue,
                        status_light: status
                    }];
                }
            });
            return { previousResults };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['results', visit.id], context.previousResults);
            setIsSaving(false);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['results', visit.id] });
            // Update visit status to in_progress if it was scheduled
            if (visit.status === 'scheduled') {
                Visit.update(visit.id, { status: 'in_progress' })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['visit', visit.id] }));
            }
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const handleBlur = (test, equipmentId, value) => {
        if (value === '') return;
        saveResultMutation.mutate({
            testId: test.id,
            equipmentId,
            value,
            min: test.min_value,
            max: test.max_value,
            tolerance: test.tolerance_percent
        });
    };

    const getResult = (testId, equipmentId) => results?.find(r => r.test_definition_id === testId && r.equipment_id === equipmentId);

    // Pre-calculate structure for rendering and bulk actions
    const groupedData = useMemo(() => {
        if (!locations || !allLocationEquipments || !allEquipments || !equipmentTestsLinks || !allTests) return null;

        return locations.map(location => {
            // Use LocationEquipment instances to support duplicate equipment names/types
            const equipmentsWithTests = allLocationEquipments
                .filter(le => le.location_id === location.id)
                .map(le => {
                    const catalogItem = allEquipments.find(e => e.id === le.equipment_id);
                    if (!catalogItem) return null;

                    // Find tests using the CATALOG ID
                    const linkedTestIds = equipmentTestsLinks
                        .filter(et => et.equipment_id === catalogItem.id)
                        .map(et => et.test_definition_id);

                    const tests = allTests.filter(t => linkedTestIds.includes(t.id));

                    // Return object using INSTANCE ID (le.id) for results, but Catalog data for display
                    return {
                        ...catalogItem,
                        id: le.id, // CRITICAL: Use LocationEquipment ID as the primary ID for this instance
                        catalog_id: catalogItem.id,
                        tests,
                        uniqueId: le.id // Unique per instance
                    };
                })
                .filter(item => item && item.tests.length > 0);

            return { ...location, equipments: equipmentsWithTests };
        }).filter(l => l.equipments.length > 0);
    }, [locations, allLocationEquipments, allEquipments, equipmentTestsLinks, allTests]);

    const toggleAll = () => {
        if (!groupedData) return;
        const newState = !allExpanded;
        setAllExpanded(newState);
        const newOpenItems = {};
        groupedData.forEach(loc => {
            loc.equipments.forEach(eq => {
                newOpenItems[eq.uniqueId] = newState;
            });
        });
        setOpenItems(newOpenItems);
    };

    // Initialize openItems once data is loaded
    React.useEffect(() => {
        if (groupedData && Object.keys(openItems).length === 0) {
            const initialOpen = {};
            groupedData.forEach(loc => {
                loc.equipments.forEach(eq => {
                    initialOpen[eq.uniqueId] = true; // Start expanded
                });
            });
            setOpenItems(initialOpen);
        }
    }, [groupedData]);


    if (!groupedData) {
        return <div className="p-4 text-center">Carregando configurações...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span>Salvando...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 text-green-600" />
                            <span>Dados salvos</span>
                        </>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAll}
                    className="text-xs h-8"
                >
                    <ChevronsUpDown className="w-3 h-3 mr-1" />
                    {allExpanded ? 'Recolher Todos' : 'Expandir Todos'}
                </Button>
            </div>

            {groupedData.map(location => (
                <div key={location.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500 uppercase text-xs font-bold tracking-wider pl-1 border-b border-slate-100 pb-1">
                        <MapPin className="w-3 h-3" />
                        {location.name}
                    </div>

                    {location.equipments.map(equipment => {
                        const isOpen = openItems[equipment.uniqueId] ?? true;

                        return (
                            <Collapsible
                                key={equipment.uniqueId}
                                open={isOpen}
                                onOpenChange={() => toggleItem(equipment.uniqueId)}
                                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all"
                            >
                                {/* Header */}
                                <div className="bg-blue-600 text-white">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-blue-700 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Beaker className="w-4 h-4 opacity-75" />
                                            <h3 className="font-semibold text-sm tracking-wide uppercase text-left">{equipment.name}</h3>
                                        </div>
                                        {isOpen ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
                                    </CollapsibleTrigger>
                                </div>

                                <CollapsibleContent>
                                    {/* Desktop View - Table */}
                                    <div className="hidden md:block">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b">
                                                <tr>
                                                    <th className="px-4 py-2 w-1/3 font-medium">Parâmetro</th>
                                                    <th className="px-4 py-2 text-center w-1/4 font-medium">Faixa (VMP)</th>
                                                    <th className="px-4 py-2 text-center w-1/6 font-medium">Unid.</th>
                                                    <th className="px-4 py-2 text-right w-1/4 font-medium">Resultado</th>
                                                    <th className="px-4 py-2 text-center w-12 font-medium">St</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {equipment.tests.map((test, idx) => {
                                                    const result = getResult(test.id, equipment.id);
                                                    const status = result?.status_light || 'neutral';

                                                    return (
                                                        <tr key={test.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                                            <td className="px-4 py-2 font-medium text-slate-700">
                                                                {test.name}
                                                                {test.observation && <div className="text-[10px] text-slate-400 font-normal">{test.observation}</div>}
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono text-slate-600 text-xs bg-slate-50/50">
                                                                {test.min_value} - {test.max_value}
                                                            </td>
                                                            <td className="px-4 py-2 text-center text-slate-500 text-xs">
                                                                {test.unit}
                                                            </td>
                                                            <td className="px-4 py-1.5 text-right">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    defaultValue={result?.measured_value}
                                                                    placeholder="-"
                                                                    className={`h-7 w-24 ml-auto text-right font-mono text-sm ${getStatusColor(status)}`}
                                                                    onBlur={(e) => handleBlur(test, equipment.id, e.target.value)}
                                                                    disabled={readOnly}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                {status === 'red' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 mx-auto shadow-sm" />}
                                                                {status === 'green' && <div className="w-2.5 h-2.5 rounded-full bg-green-500 mx-auto shadow-sm" />}
                                                                {status === 'yellow' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mx-auto shadow-sm" />}
                                                                {status === 'neutral' && <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto" />}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile View - Cards */}
                                    <div className="md:hidden divide-y divide-slate-100">
                                        {equipment.tests.map(test => {
                                            const result = getResult(test.id, equipment.id);
                                            const status = result?.status_light || 'neutral';

                                            return (
                                                <div key={test.id} className="p-3 bg-white">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-semibold text-slate-800 text-sm">{test.name}</p>
                                                            <p className="text-[10px] text-slate-500">Meta: {test.min_value} - {test.max_value} {test.unit}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {status === 'red' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                            {status === 'green' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                            {status === 'yellow' && <MinusCircle className="w-4 h-4 text-yellow-500" />}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                defaultValue={result?.measured_value}
                                                                placeholder="Valor"
                                                                className={`text-base text-right font-mono h-10 ${getStatusColor(status)}`}
                                                                onBlur={(e) => handleBlur(test, equipment.id, e.target.value)}
                                                                disabled={readOnly}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-slate-400 font-medium w-8">{test.unit}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </div>
            ))}

            {groupedData.length === 0 && (
                <Card className="bg-slate-50 border-dashed">
                    <CardContent className="p-8 text-center text-slate-500">
                        <p>Nenhum local vinculado a este cliente.</p>
                        <p className="text-sm mt-2">Vá em Configurações para adicionar locais e equipamentos.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}