import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, LocationEquipment, Equipment, EquipmentTest, TestDefinition, TestResult, Visit, AnalysisGroup, AnalysisGroupItem, VisitEquipmentSample } from "@/api/entities";
import { Input } from "@/components/ui/input";
import { calculateStatus, getStatusColor } from "@/components/analysisUtils";
import { AlertCircle, CheckCircle, MinusCircle, Beaker, ChevronDown, ChevronUp, MapPin, ChevronsUpDown, Save, Loader2, Clock, FileText, Layers, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ReadingsTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const [openItems, setOpenItems] = React.useState({});
    const [allExpanded, setAllExpanded] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const toggleItem = (id) => {
        setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Queries ---
    const { data: locations } = useQuery({ queryKey: ['locations', visit.client_id], queryFn: () => Location.filter({ client_id: visit.client_id }, undefined, 200) });
    const { data: allLocationEquipments } = useQuery({ queryKey: ['locationEquipments'], queryFn: () => LocationEquipment.list(undefined, 1000) });
    const { data: allEquipments } = useQuery({ queryKey: ['equipments'], queryFn: () => Equipment.list(undefined, 1000) });
    const { data: equipmentTestsLinks } = useQuery({ queryKey: ['equipmentTests'], queryFn: () => EquipmentTest.list(undefined, 1000) });
    const { data: allTests } = useQuery({ queryKey: ['testDefinitions'], queryFn: () => TestDefinition.list(undefined, 1000) });
    const { data: results } = useQuery({ queryKey: ['results', visit.id], queryFn: () => TestResult.filter({ visit_id: visit.id }, undefined, 1000) });
    const { data: analysisGroups } = useQuery({ queryKey: ['analysisGroups'], queryFn: () => AnalysisGroup.list() });
    const { data: analysisGroupItems } = useQuery({ queryKey: ['analysisGroupItems'], queryFn: () => AnalysisGroupItem.list(undefined, 2000) });
    const { data: visitSamples } = useQuery({
        queryKey: ['visitSamples', visit.id],
        queryFn: () => VisitEquipmentSample.filter({ visit_id: visit.id }, undefined, 1000)
    });

    // --- Mutations ---
    const saveResultMutation = useMutation({
        mutationFn: async ({ testId, equipmentId, value, min, max, tolerance }) => {
            setIsSaving(true);
            const status = calculateStatus(value, min, max, tolerance);
            const existing = results?.find(r => r.test_definition_id === testId && r.equipment_id === equipmentId);

            if (existing) {
                return TestResult.update(existing.id, { measured_value: parseFloat(value), status_light: status });
            } else {
                return TestResult.create({ visit_id: visit.id, test_definition_id: testId, equipment_id: equipmentId, measured_value: parseFloat(value), status_light: status });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['results', visit.id] });
            if (visit?.status === 'scheduled') {
                Visit.update(visit.id, { status: 'in_progress' }).then(() => queryClient.invalidateQueries({ queryKey: ['visit', visit.id] }));
            }
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const saveSampleMutation = useMutation({
        mutationFn: async ({ locationEquipmentId, field, value }) => {
            setIsSaving(true);
            const existing = visitSamples?.find(s => s.location_equipment_id === locationEquipmentId);
            if (existing) {
                return VisitEquipmentSample.update(existing.id, { [field]: value });
            } else {
                return VisitEquipmentSample.create({
                    visit_id: visit.id,
                    location_equipment_id: locationEquipmentId,
                    [field]: value
                });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['visitSamples', visit.id] });
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const applyGroupMutation = useMutation({
        mutationFn: async ({ locationEquipmentId, groupId, equipmentId }) => {
            setIsSaving(true);
            const existingSample = visitSamples?.find(s => s.location_equipment_id === locationEquipmentId);
            if (existingSample) {
                await VisitEquipmentSample.update(existingSample.id, { analysis_group_id: groupId });
            } else {
                await VisitEquipmentSample.create({ visit_id: visit.id, location_equipment_id: locationEquipmentId, analysis_group_id: groupId });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['visitSamples', visit.id] });
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    // --- Helpers ---
    const handleBlur = (test, equipmentId, value) => {
        if (value === '') return;
        saveResultMutation.mutate({
            testId: test.id,
            equipmentId,
            value,
            // Use effective limits (already calculated in data prep with overrides)
            min: test.min_value,
            max: test.max_value,
            tolerance: test.tolerance_percent
        });
    };

    const handleSampleChange = (locationEquipmentId, field, value) => {
        saveSampleMutation.mutate({ locationEquipmentId, field, value });
    };

    const getResult = (testId, equipmentId) => results?.find(r => r.test_definition_id === testId && r.equipment_id === equipmentId);
    const getSample = (locEqId) => visitSamples?.find(s => s.location_equipment_id === locEqId);


    // --- Data Preparation ---
    const groupedData = useMemo(() => {
        if (!locations || !allLocationEquipments || !allEquipments || !equipmentTestsLinks || !allTests) return null;

        return locations.map(location => {
            const equipmentsWithTests = allLocationEquipments
                .filter(le => le.location_id === location.id)
                .map(le => {
                    const catalogItem = allEquipments.find(e => e.id === le.equipment_id);
                    if (!catalogItem) return null;

                    // 1. Tests linked via Equipment Configuration (with Limits override support)
                    // Get 'EquipmentTest' links
                    const linkedTestsData = equipmentTestsLinks.filter(et => et.equipment_id === catalogItem.id);
                    const linkedTestIds = linkedTestsData.map(et => et.test_definition_id);

                    // 2. Tests linked via Selected Analysis Group (if any)
                    let groupTestIds = [];
                    const sample = getSample(le.id);
                    if (sample?.analysis_group_id && analysisGroupItems) {
                        groupTestIds = analysisGroupItems
                            .filter(agi => agi.group_id === sample.analysis_group_id)
                            .map(agi => agi.test_definition_id);
                    }

                    // 3. Merge Lists
                    const allTestIds = [...new Set([...linkedTestIds, ...groupTestIds])];
                    const tests = allTestIds.map(testId => {
                        const originalTest = allTests.find(t => t.id === testId);
                        if (!originalTest) return null;

                        // Check for override in linkedTestsData
                        const override = linkedTestsData.find(et => et.test_definition_id === testId);

                        // Merge Override
                        return {
                            ...originalTest, // Base definition
                            // Priorities: Override > Definition
                            min_value: override?.min_value ?? originalTest.min_value,
                            max_value: override?.max_value ?? originalTest.max_value,
                            unit: override?.unit ?? originalTest.unit
                        };
                    }).filter(Boolean);

                    return {
                        ...catalogItem,
                        id: le.id, // LocationEquipment ID (Instance)
                        catalog_id: catalogItem.id, // Catalog ID
                        tests,
                        uniqueId: le.id,
                        sample
                    };
                })
                .filter(item => item && item.tests.length > 0);

            return { ...location, equipments: equipmentsWithTests };
        }).filter(l => l.equipments.length > 0);
    }, [locations, allLocationEquipments, allEquipments, equipmentTestsLinks, allTests, visitSamples, analysisGroupItems]);


    const toggleAll = () => {
        if (!groupedData) return;
        const newState = !allExpanded;
        setAllExpanded(newState);
        const newOpenItems = {};
        groupedData.forEach(loc => {
            loc.equipments.forEach(eq => newOpenItems[eq.uniqueId] = newState);
        });
        setOpenItems(newOpenItems);
    };

    React.useEffect(() => {
        if (groupedData && Object.keys(openItems).length === 0) {
            const initialOpen = {};
            groupedData.forEach(loc => loc.equipments.forEach(eq => initialOpen[eq.uniqueId] = true));
            setOpenItems(initialOpen);
        }
    }, [groupedData]);


    if (!groupedData) return <div className="p-4 text-center"><Loader2 className="animate-spin inline mr-2" />Carregando configurações...</div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span>Salvando...</span></> : <><Save className="w-4 h-4 text-green-600" /><span>Dados salvos</span></>}
                </div>
                <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-8">
                    <ChevronsUpDown className="w-3 h-3 mr-1" />{allExpanded ? 'Recolher Todos' : 'Expandir Todos'}
                </Button>
            </div>

            {groupedData.map(location => (
                <div key={location.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500 uppercase text-xs font-bold tracking-wider pl-1 border-b border-slate-100 pb-1">
                        <MapPin className="w-3 h-3" />{location.name}
                    </div>

                    {location.equipments.map(equipment => {
                        const isOpen = openItems[equipment.uniqueId] ?? true;
                        const sampleData = equipment.sample;

                        return (
                            <Collapsible
                                key={equipment.uniqueId}
                                open={isOpen}
                                onOpenChange={() => toggleItem(equipment.uniqueId)}
                                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all"
                            >
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

                                    {/* V1.1: Equipment Header Inputs (Time, Group, Complementary) */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-blue-50/30 border-b border-blue-100">
                                        {/* Hora */}
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-semibold text-slate-500 flex items-center mb-1"><Clock className="w-3 h-3 mr-1" />Hora Coleta</label>
                                            <Input
                                                type="time"
                                                className="h-8 bg-white"
                                                defaultValue={sampleData?.collection_time ? sampleData.collection_time.substring(0, 5) : ''}
                                                onBlur={(e) => handleSampleChange(equipment.uniqueId, 'collection_time', e.target.value)}
                                                disabled={readOnly}
                                            />
                                        </div>

                                        {/* Grupo */}
                                        <div className="md:col-span-4">
                                            <label className="text-xs font-semibold text-slate-500 flex items-center mb-1"><Layers className="w-3 h-3 mr-1" />Grupo de Análise</label>
                                            <Select
                                                disabled={readOnly}
                                                value={sampleData?.analysis_group_id || ""}
                                                onValueChange={(val) => applyGroupMutation.mutate({ locationEquipmentId: equipment.uniqueId, groupId: val, equipmentId: equipment.catalog_id })}
                                            >
                                                <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Selecione um Kit..." /></SelectTrigger>
                                                <SelectContent>
                                                    {analysisGroups?.map(g => (
                                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            {/* Helper to show what's in the group */}
                                            {sampleData?.analysis_group_id && analysisGroupItems && allTests && (
                                                <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                                                    <span className="font-semibold">Inclui: </span>
                                                    {analysisGroupItems
                                                        .filter(i => i.group_id === sampleData.analysis_group_id)
                                                        .map(i => allTests.find(t => t.id === i.test_definition_id)?.name)
                                                        .filter(Boolean)
                                                        .join(', ') || "Nenhum teste vinculado."
                                                    }
                                                </div>
                                            )}
                                        </div>

                                        {/* Análises Complementares */}
                                        <div className="md:col-span-6">
                                            <label className="text-xs font-semibold text-slate-500 flex items-center mb-1"><FileText className="w-3 h-3 mr-1" />Análises Complementares</label>
                                            <Input
                                                className="h-8 bg-white"
                                                placeholder="Ex: Ferro total, Cobre..."
                                                defaultValue={sampleData?.complementary_info || ''}
                                                onBlur={(e) => handleSampleChange(equipment.uniqueId, 'complementary_info', e.target.value)}
                                                disabled={readOnly}
                                            />
                                        </div>
                                    </div>

                                    {/* Results Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b">
                                                <tr>
                                                    <th className="px-4 py-2 min-w-[150px]">Parâmetro</th>
                                                    <th className="px-4 py-2 text-center min-w-[100px]">VMP</th>
                                                    <th className="px-4 py-2 text-center min-w-[60px]">Unid.</th>
                                                    <th className="px-4 py-2 text-right min-w-[100px]">Resultado</th>
                                                    <th className="px-4 py-2 text-center w-12">St</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {equipment.tests.map((test, idx) => {
                                                    const result = getResult(test.id, equipment.catalog_id);
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
                                                            <td className="px-4 py-2 text-center text-slate-500 text-xs">{test.unit}</td>
                                                            <td className="px-4 py-1.5 text-right">
                                                                <Input
                                                                    type="number" step="0.01" defaultValue={result?.measured_value} placeholder="-"
                                                                    className={`h-7 w-24 ml-auto text-right font-mono text-sm ${getStatusColor(status)}`}
                                                                    onBlur={(e) => handleBlur(test, equipment.catalog_id, e.target.value)}
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
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </div>
            ))}

            {groupedData.length === 0 && (
                <Card className="bg-slate-50 border-dashed"><CardContent className="p-8 text-center text-slate-500"><p>Nenhum local vinculado a este cliente.</p></CardContent></Card>
            )}
        </div>
    );
}