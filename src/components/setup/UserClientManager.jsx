import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Client, UserClient } from "@/api/entities";
import { useOperationFeedback } from "@/context/OperationFeedbackContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function UserClientManager({ open, onOpenChange, user }) {
    const queryClient = useQueryClient();
    const { executeWithFeedback } = useOperationFeedback();

    const [viewAllClients, setViewAllClients] = useState(false);
    const [selectedClients, setSelectedClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch all clients
    const { data: clients, isLoading: isLoadingClients } = useQuery({
        queryKey: ['clients'],
        queryFn: () => Client.list('name')
    });

    // Fetch user's current settings
    const { data: userClients, isLoading: isLoadingUserClients } = useQuery({
        queryKey: ['user_clients', user?.id],
        queryFn: () => UserClient.filter({ user_id: user?.id }),
        enabled: !!user?.id && !viewAllClients // Só carrega se não ver todos
    });

    useEffect(() => {
        if (user && open) {
            setViewAllClients(user.view_all_clients === true);
            setSearchTerm('');
        }
    }, [user, open]);

    useEffect(() => {
        if (userClients && !viewAllClients) {
            setSelectedClients(userClients.map(uc => uc.client_id));
        } else {
            setSelectedClients([]);
        }
    }, [userClients, viewAllClients]);

    const filteredClients = clients?.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleToggleClient = (clientId) => {
        setSelectedClients(prev => 
            prev.includes(clientId) 
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        
        try {
            await executeWithFeedback({
                operation: async () => {
                    // 1. Atualizar flag view_all_clients no perfil
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({ view_all_clients: viewAllClients })
                        .eq('id', user.id);
                        
                    if (profileError) throw profileError;

                    // 2. Sincronizar clientes (se não ver todos)
                    if (!viewAllClients) {
                        // Apagar os antigos
                        await supabase.from('user_clients').delete().eq('user_id', user.id);
                        
                        // Inserir os novos
                        if (selectedClients.length > 0) {
                            const payloads = selectedClients.map(clientId => ({
                                user_id: user.id,
                                client_id: clientId
                            }));
                            await supabase.from('user_clients').insert(payloads);
                        }
                    } else {
                        // Se agora vê todos, podemos limpar a tabela de vínculos para não deixar lixo
                        await supabase.from('user_clients').delete().eq('user_id', user.id);
                    }
                    
                    return true;
                },
                loadingMessage: 'Salvando permissões...',
                successMessage: 'Permissões salvas com sucesso!',
                errorMessage: 'Erro ao salvar permissões.'
            });
            
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user_clients', user.id] });
            
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Gerenciar Acesso a Clientes</DialogTitle>
                    <DialogDescription>
                        Configure quais clientes o usuário <strong>{user?.full_name || user?.email}</strong> pode acessar no sistema e aplicativo.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base">Acesso Total a Clientes</Label>
                            <p className="text-sm text-slate-500">
                                Se ativado, o usuário poderá ver todos os clientes cadastrados.
                            </p>
                        </div>
                        <Switch
                            checked={viewAllClients}
                            onCheckedChange={setViewAllClients}
                        />
                    </div>

                    {!viewAllClients && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Clientes Específicos ({selectedClients.length} selecionados)</h3>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar cliente..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <ScrollArea className="h-[250px] border rounded-md p-2">
                                {isLoadingClients ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredClients.map(client => (
                                            <div key={client.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md">
                                                <Checkbox 
                                                    id={`client-${client.id}`}
                                                    checked={selectedClients.includes(client.id)}
                                                    onCheckedChange={() => handleToggleClient(client.id)}
                                                />
                                                <label
                                                    htmlFor={`client-${client.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                >
                                                    {client.name}
                                                    <span className="text-xs text-slate-500 block font-normal">{client.city_state || 'Sem localidade'}</span>
                                                </label>
                                            </div>
                                        ))}
                                        {filteredClients.length === 0 && (
                                            <p className="text-sm text-center text-slate-500 py-4">Nenhum cliente encontrado.</p>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || (isLoadingClients && !viewAllClients)}>
                        {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Salvando...</> : 'Salvar Permissões'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
