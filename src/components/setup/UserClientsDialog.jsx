import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useOperationFeedback } from '@/context/OperationFeedbackContext';
import { Loader2 } from 'lucide-react';

export default function UserClientsDialog({ user, clients, isOpen, onClose }) {
    const [viewAll, setViewAll] = useState(false);
    const [selectedClients, setSelectedClients] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { executeWithFeedback } = useOperationFeedback();

    useEffect(() => {
        if (isOpen && user) {
            setViewAll(!!user.view_all_clients);
            loadUserClients();
        }
    }, [isOpen, user]);

    const loadUserClients = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_clients')
                .select('client_id')
                .eq('user_id', user.id);
            if (error) throw error;
            setSelectedClients(data.map(d => d.client_id));
        } catch (error) {
            console.error('Error loading user clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        await executeWithFeedback({
            operation: async () => {
                // Update view_all_clients
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ view_all_clients: viewAll })
                    .eq('id', user.id);
                if (profileError) throw profileError;

                // Update user_clients
                // First delete existing
                const { error: deleteError } = await supabase
                    .from('user_clients')
                    .delete()
                    .eq('user_id', user.id);
                if (deleteError) throw deleteError;

                // Insert new ones if not viewAll
                if (!viewAll && selectedClients.length > 0) {
                    const inserts = selectedClients.map(clientId => ({
                        user_id: user.id,
                        client_id: clientId
                    }));
                    const { error: insertError } = await supabase
                        .from('user_clients')
                        .insert(inserts);
                    if (insertError) throw insertError;
                }
                return true;
            },
            loadingMessage: 'Salvando configurações de acesso...',
            successMessage: 'Acesso atualizado com sucesso!',
            errorMessage: 'Erro ao atualizar configurações de acesso.'
        });
        onClose();
    };

    const toggleClient = (clientId) => {
        setSelectedClients(prev => 
            prev.includes(clientId) 
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gerenciar Acesso a Clientes</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4 overflow-y-auto">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="viewAll" 
                            checked={viewAll} 
                            onCheckedChange={setViewAll}
                        />
                        <Label htmlFor="viewAll" className="font-bold">
                            Acesso Total (Visualizar todos os clientes)
                        </Label>
                    </div>
                    
                    {!viewAll && (
                        <div className="space-y-3 mt-4 border-t pt-4">
                            <Label className="text-slate-500">Selecione os clientes vinculados a este usuário:</Label>
                            {isLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
                            ) : (
                                <div className="space-y-2">
                                    {clients?.map(client => (
                                        <div key={client.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`client-${client.id}`} 
                                                checked={selectedClients.includes(client.id)} 
                                                onCheckedChange={() => toggleClient(client.id)}
                                            />
                                            <Label htmlFor={`client-${client.id}`} className="font-normal">
                                                {client.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
