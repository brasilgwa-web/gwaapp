import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Equipment, TestDefinition, EquipmentTest } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ArrowUpDown, GripVertical, CheckCircle } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useOperationFeedback } from "@/context/OperationFeedbackContext";

function SortableEquipmentRow({ eq, sortOrder, moveEquipment, handleOpenEdit, remove, index, isFirst, isLast }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: eq.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-4 bg-white border rounded-lg ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-blue-500/20' : ''}`}>
            <div className="flex items-center gap-3">
                {sortOrder === 'manual' && (
                    <button
                        type="button"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 -ml-2"
                        style={{ touchAction: 'none' }}
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="w-5 h-5" />
                    </button>
                )}
                <div>
                    <h3 className="font-semibold">{eq.name}</h3>
                    <p className="text-sm text-slate-500">{eq.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => handleOpenEdit(eq)}>
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => remove.mutate(eq.id)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

export default function EquipmentCatalog() {
    const queryClient = useQueryClient();
    const { executeWithFeedback } = useOperationFeedback();
    const [isOpen, setIsOpen] = useState(false);
    const [editingEq, setEditingEq] = useState(null);
    const [sortOrder, setSortOrder] = useState('manual'); // 'manual', 'asc', 'desc'

    // Instead of just IDs, we store objects: { id (testDefId), min_value, max_value, unit }
    const [selectedTestsData, setSelectedTestsData] = useState([]);

    // Queries
    const { data: equipments } = useQuery({
        queryKey: ['equipments'],
        queryFn: () => Equipment.list()
    });
    const { data: tests } = useQuery({
        queryKey: ['testDefinitions'],
        queryFn: () => TestDefinition.list()
    });

    // Mutations
    const createEquipment = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: async () => {
                    const eq = await Equipment.create(data.equipment);
                    if (data.testLinks.length > 0) {
                        await Promise.all(data.testLinks.map(link =>
                            EquipmentTest.create({
                                equipment_id: eq.id,
                                test_definition_id: link.id,
                                min_value: link.min_value,
                                max_value: link.max_value,
                                unit: link.unit
                            })
                        ));
                    }
                    return eq;
                },
                loadingMessage: 'Criando equipamento...',
                successMessage: 'Equipamento cadastrado com sucesso!',
                errorMessage: 'Erro ao criar equipamento.',
                logCategory: 'crud',
                logDetails: { action: 'create', entity: 'equipment', data: data.equipment },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
            setIsOpen(false);
            setSelectedTestsData([]);
            setEditingEq(null);
        }
    });

    const updateEquipment = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: async () => {
                    await Equipment.update(data.id, data.equipment);

                    // Update tests links
                    const existingLinks = await EquipmentTest.list().then(res => res.filter(r => r.equipment_id === data.id));

                    const existingTestIds = existingLinks.map(r => r.test_definition_id);
                    const newTestIds = data.testLinks.map(l => l.id);

                    // To Remove
                    const toRemove = existingLinks.filter(r => !newTestIds.includes(r.test_definition_id));
                    await Promise.all(toRemove.map(r => EquipmentTest.delete(r.id)));

                    // To Add or Update
                    await Promise.all(data.testLinks.map(async (link) => {
                        const existing = existingLinks.find(r => r.test_definition_id === link.id);
                        if (existing) {
                            await EquipmentTest.update(existing.id, {
                                min_value: link.min_value,
                                max_value: link.max_value,
                                unit: link.unit
                            });
                        } else {
                            await EquipmentTest.create({
                                equipment_id: data.id,
                                test_definition_id: link.id,
                                min_value: link.min_value,
                                max_value: link.max_value,
                                unit: link.unit
                            });
                        }
                    }));
                },
                loadingMessage: 'Salvando alterações...',
                successMessage: 'Equipamento atualizado com sucesso!',
                errorMessage: 'Erro ao atualizar equipamento.',
                logCategory: 'crud',
                logDetails: { action: 'update', entity: 'equipment', id: data.id },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
            setIsOpen(false);
            setSelectedTestsData([]);
            setEditingEq(null);
        }
    });

    const remove = useMutation({
        mutationFn: async (id) => {
            const result = await executeWithFeedback({
                operation: () => Equipment.delete(id),
                loadingMessage: 'Excluindo equipamento...',
                successMessage: 'Equipamento excluído com sucesso!',
                errorMessage: 'Erro ao excluir equipamento.',
                logCategory: 'crud',
                logDetails: { action: 'delete', entity: 'equipment', id },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipments'] }),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const eqData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        if (editingEq) {
            updateEquipment.mutate({
                id: editingEq.id,
                equipment: eqData,
                testLinks: selectedTestsData
            });
        } else {
            createEquipment.mutate({
                equipment: eqData,
                testLinks: selectedTestsData
            });
        }
    };

    const handleOpenEdit = async (eq) => {
        setEditingEq(eq);
        // Fetch linked tests for this equipment
        const links = await EquipmentTest.list().then(res => res.filter(r => r.equipment_id === eq.id));

        // Map to internal state
        const loadedData = links.map(l => {
            // Fallback if null in DB (legacy) => fetch from generic definition isn't possible here synchronously easily unless we populated data.
            // But we have 'tests' (catalog).
            const def = tests?.find(t => t.id === l.test_definition_id);
            return {
                id: l.test_definition_id,
                min_value: l.min_value ?? def?.min_value,
                max_value: l.max_value ?? def?.max_value,
                unit: l.unit ?? def?.unit
            };
        });

        setSelectedTestsData(loadedData);
        setIsOpen(true);
    };

    const handleOpenNew = () => {
        setEditingEq(null);
        setSelectedTestsData([]);
        setIsOpen(true);
    }

    const toggleTest = (testId) => {
        const exists = selectedTestsData.find(x => x.id === testId);
        if (exists) {
            setSelectedTestsData(prev => prev.filter(x => x.id !== testId));
        } else {
            // Initialize with default values from Definition
            const def = tests?.find(t => t.id === testId);
            setSelectedTestsData(prev => [...prev, {
                id: testId,
                min_value: def?.min_value,
                max_value: def?.max_value,
                unit: def?.unit
            }]);
        }
    };

    const updateTestData = (testId, field, value) => {
        setSelectedTestsData(prev => prev.map(item =>
            item.id === testId ? { ...item, [field]: value } : item
        ));
    };

    // Sorted equipments based on sortOrder
    const sortedEquipments = useMemo(() => {
        if (!equipments) return [];

        let sorted = [...equipments];

        if (sortOrder === 'asc') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        } else if (sortOrder === 'desc') {
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'));
        } else {
            // Manual: sort by display_order if exists, otherwise by created_at
            sorted.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        }

        return sorted;
    }, [equipments, sortOrder]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = sortedEquipments.findIndex((item) => item.id === active.id);
            const newIndex = sortedEquipments.findIndex((item) => item.id === over.id);

            const newOrderedList = arrayMove(sortedEquipments, oldIndex, newIndex);

            await Promise.all(newOrderedList.map((item, index) =>
                Equipment.update(item.id, { display_order: index })
            ));

            queryClient.invalidateQueries({ queryKey: ['equipments'] });
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Catálogo de Equipamentos</CardTitle>
                    <CardDescription>Defina os tipos de equipamentos e seus testes padrão</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Ordem Manual</SelectItem>
                            <SelectItem value="asc">A → Z</SelectItem>
                            <SelectItem value="desc">Z → A</SelectItem>
                        </SelectContent>
                    </Select>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleOpenNew}><Plus className="w-4 h-4 mr-2" /> Novo Equipamento</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>{editingEq ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle></DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid gap-4">
                                    <div className="space-y-2"><Label>Nome do Equipamento</Label><Input name="name" defaultValue={editingEq?.name} placeholder="Ex: Caldeira Flamotubular" required /></div>
                                    <div className="space-y-2"><Label>Descrição</Label><Input name="description" defaultValue={editingEq?.description} /></div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">Testes e Limites (VMP)</Label>
                                    <div className="grid grid-cols-1 gap-2 border rounded-lg p-4 bg-slate-50 max-h-[400px] overflow-y-auto">
                                        {tests?.map(test => {
                                            const isSelected = selectedTestsData.some(x => x.id === test.id);
                                            const config = selectedTestsData.find(x => x.id === test.id);

                                            return (
                                                <div key={test.id} className={`flex flex-col p-3 rounded border transition-colors ${isSelected ? 'bg-white border-blue-300 shadow-sm' : 'border-transparent hover:border-slate-200'}`}>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`test-${test.id}`}
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleTest(test.id)}
                                                        />
                                                        <label htmlFor={`test-${test.id}`} className="font-medium flex-1 cursor-pointer">
                                                            {test.name}
                                                        </label>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="ml-6 mt-3 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2 duration-200">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs text-slate-500">Mínimo</Label>
                                                                <Input
                                                                    type="text"
                                                                    value={config?.min_value || ''}
                                                                    onChange={(e) => updateTestData(test.id, 'min_value', e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs text-slate-500">Máximo</Label>
                                                                <Input
                                                                    type="text"
                                                                    value={config?.max_value || ''}
                                                                    onChange={(e) => updateTestData(test.id, 'max_value', e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs text-slate-500">Unidade</Label>
                                                                <Input
                                                                    type="text"
                                                                    value={config?.unit || ''}
                                                                    onChange={(e) => updateTestData(test.id, 'unit', e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <DialogFooter><Button type="submit">{editingEq ? 'Salvar Alterações' : 'Salvar Equipamento'}</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedEquipments.map(e => e.id)}
                            strategy={verticalListSortingStrategy}
                            disabled={sortOrder !== 'manual'}
                        >
                            {sortedEquipments.map((eq, index) => (
                                <SortableEquipmentRow
                                    key={eq.id}
                                    eq={eq}
                                    sortOrder={sortOrder}
                                    handleOpenEdit={handleOpenEdit}
                                    remove={remove}
                                    index={index}
                                    isFirst={index === 0}
                                    isLast={index === sortedEquipments.length - 1}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </CardContent>
        </Card>
    );
}