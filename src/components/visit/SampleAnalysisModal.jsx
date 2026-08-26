import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sample, SampleResult, TestDefinition, LocationEquipment, Equipment, TestResult } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Save, Calculator } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function SampleAnalysisModal({ sample, isOpen, onClose }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Load available test definitions (parameters)
    const { data: testDefinitions } = useQuery({
        queryKey: ['test_definitions'],
        queryFn: () => TestDefinition.list()
    });

    // Load existing results for this sample
    const { data: existingResults, isLoading } = useQuery({
        queryKey: ['sample_results', sample?.id],
        queryFn: () => SampleResult.filter({ sample_id: sample?.id }),
        enabled: !!sample?.id
    });

    // Load field results from the same visit and equipment
    const { data: fieldResults } = useQuery({
        queryKey: ['field_results', sample?.visit_id, sample?.equipment],
        queryFn: async () => {
            if (!sample?.visit_id || !sample?.equipment) return [];
            const les = await LocationEquipment.filter({ location_id: sample.location_id });
            const eqs = await Equipment.list();
            const leMatches = les.filter(le => {
                 const eq = eqs.find(e => e.id === le.equipment_id);
                 return eq?.name === sample.equipment;
            });
            if (leMatches.length === 0) return [];
            const leId = leMatches[0].id;
            return await TestResult.filter({ visit_id: sample.visit_id, location_equipment_id: leId });
        },
        enabled: !!sample?.visit_id && !!sample?.equipment
    });

    // State for the dynamic grid of results
    const [results, setResults] = useState([]);

    // Initialize state when data loads
    React.useEffect(() => {
        if (existingResults && testDefinitions) {
            const mapped = existingResults.map(r => ({
                id: r.id, // existing DB id
                test_definition_id: r.test_definition_id,
                reading: r.reading || '',
                dilution_factor: r.dilution_factor || 1,
                reagent_factor: r.reagent_factor || 1,
                correction_factor: r.correction_factor || 1,
                comments: r.comments || ''
            }));
            
            // Import field results if they don't already exist in the lab results
            if (fieldResults && fieldResults.length > 0) {
                fieldResults.forEach(fr => {
                    const exists = mapped.find(m => m.test_definition_id === fr.test_definition_id);
                    if (!exists) {
                        mapped.push({
                            test_definition_id: fr.test_definition_id,
                            reading: fr.value || '',
                            dilution_factor: 1,
                            reagent_factor: 1,
                            correction_factor: 1,
                            comments: 'Importado do campo'
                        });
                    }
                });
            }

            setResults(mapped);
        }
    }, [existingResults, testDefinitions, fieldResults]);

    const addRow = () => {
        setResults([...results, {
            test_definition_id: '',
            reading: '',
            dilution_factor: 1,
            reagent_factor: 1,
            correction_factor: 1,
            comments: ''
        }]);
    };

    const removeRow = (index) => {
        const newResults = [...results];
        newResults.splice(index, 1);
        setResults(newResults);
    };

    const updateRow = (index, field, value) => {
        let val = value;
        if (['reading', 'dilution_factor', 'reagent_factor', 'correction_factor'].includes(field)) {
            val = value === '' ? '' : Number(value);
        }
        setResults(prev => prev.map((row, i) => 
            i === index ? { ...row, [field]: val } : row
        ));
    };

    const calculateResult = (row) => {
        if (row.reading === '') return '-';
        const r = Number(row.reading) || 0;
        const d = Number(row.dilution_factor) || 1;
        const re = Number(row.reagent_factor) || 1;
        const c = Number(row.correction_factor) || 1;
        return (r * d * re * c).toFixed(4).replace(/\.0000$/, '');
    };

    const { toast } = useToast();

    const saveMutation = useMutation({
        mutationFn: async (isFinal) => {
            // Very simple sync: Delete existing and recreate, or update existing.
            // For safety and speed in this prototype, we'll upsert or delete old ones not in list.
            const currentIds = results.map(r => r.id).filter(Boolean);
            
            // Delete removed rows
            for (const old of existingResults || []) {
                if (!currentIds.includes(old.id)) {
                    await SampleResult.delete(old.id);
                }
            }

            // Create or update
            for (const row of results) {
                if (!row.test_definition_id || row.reading === '') continue; // Skip incomplete
                
                const calc = Number(calculateResult(row));
                const payload = {
                    sample_id: sample.id,
                    test_definition_id: row.test_definition_id,
                    reading: Number(row.reading),
                    dilution_factor: Number(row.dilution_factor),
                    reagent_factor: Number(row.reagent_factor),
                    correction_factor: Number(row.correction_factor),
                    calculated_result: isNaN(calc) ? null : calc,
                    comments: row.comments,
                    status: 'concluido'
                };

                if (row.id) {
                    await SampleResult.update(row.id, payload);
                } else {
                    await SampleResult.create(payload);
                }
            }
            
            // Update the sample status if finalizing
            if (isFinal) {
                await Sample.update(sample.id, { status: 'concluido' });
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sample_results', sample?.id] });
            queryClient.invalidateQueries({ queryKey: ['lab_samples'] });
            toast({
                title: variables ? "Laudo finalizado!" : "Resultados salvos",
                description: variables ? "O laudo agora está disponível para geração de PDF." : "O progresso foi salvo com sucesso.",
            });
            onClose();
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-purple-600" />
                        Matriz de Cálculo: {sample?.client?.name || 'Cliente Desconhecido'}
                    </DialogTitle>
                    <DialogDescription>
                        Amostra: {sample?.sample_code} | Equipamento: {sample?.equipment}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                    <div className="space-y-4 mt-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                                <thead className="text-xs text-slate-700 bg-slate-50 uppercase border-b">
                                    <tr>
                                        <th className="px-3 py-2 w-48">Parâmetro</th>
                                        <th className="px-3 py-2 w-24">Leitura</th>
                                        <th className="px-3 py-2 w-24">F. Diluição</th>
                                        <th className="px-3 py-2 w-24">F. Reagente</th>
                                        <th className="px-3 py-2 w-24">F. Correção</th>
                                        <th className="px-3 py-2 w-24 bg-purple-50 text-purple-900 font-bold">Resultado</th>
                                        <th className="px-3 py-2">Comentários / ISO</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((row, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                            <td className="p-2">
                                                <select 
                                                    className="w-full text-xs border rounded p-1.5 bg-white"
                                                    value={row.test_definition_id}
                                                    onChange={(e) => updateRow(idx, 'test_definition_id', e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {testDefinitions?.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <Input 
                                                    type="number" step="0.0001" className="h-8 text-xs px-2"
                                                    value={row.reading} onChange={(e) => updateRow(idx, 'reading', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input 
                                                    type="number" step="0.0001" className="h-8 text-xs px-2"
                                                    value={row.dilution_factor} onChange={(e) => updateRow(idx, 'dilution_factor', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input 
                                                    type="number" step="0.0001" className="h-8 text-xs px-2"
                                                    value={row.reagent_factor} onChange={(e) => updateRow(idx, 'reagent_factor', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input 
                                                    type="number" step="0.0001" className="h-8 text-xs px-2"
                                                    value={row.correction_factor} onChange={(e) => updateRow(idx, 'correction_factor', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-2 bg-purple-50/30 text-purple-900 font-mono font-bold text-center border-x border-purple-100">
                                                {calculateResult(row)}
                                            </td>
                                            <td className="p-2">
                                                <select 
                                                    className="w-full text-xs border rounded p-1.5 bg-white"
                                                    value={row.comments}
                                                    onChange={(e) => updateRow(idx, 'comments', e.target.value)}
                                                >
                                                    <option value="">Sem comentário padrão...</option>
                                                    <option value="MTA - MÉTODO ANALÍTICO CALDEIRAS">MTA - MÉTODO ANALÍTICO CALDEIRAS</option>
                                                    <option value="MTA - MÉTODO ANALÍTICO PARA TORRES">MTA - MÉTODO ANALÍTICO PARA TORRES</option>
                                                    <option value="AT - LEGIONELLA">AT - LEGIONELLA</option>
                                                    <option value="SGV 1 - ALCALINIDADE TOTAL ALTA">SGV 1 - ALCALINIDADE TOTAL ALTA</option>
                                                    <option value="SGV 2 - CLORETOS">SGV 2 - CLORETOS</option>
                                                </select>
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => removeRow(idx)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Button variant="outline" size="sm" onClick={addRow} className="mt-2 text-slate-600 border-dashed border-2">
                            <Plus className="w-4 h-4 mr-1" /> Adicionar Parâmetro
                        </Button>

                        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                            <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>Cancelar</Button>
                            <Button variant="outline" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending} className="border-purple-200 text-purple-700 hover:bg-purple-50">
                                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Parcial
                            </Button>
                            <Button onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                                Finalizar Laudo
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
