import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import SignaturePad from "@/components/visit/SignaturePad";

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useAuth();

    // Data is now from context, but if we need to ensure we have the signature_url which might technically check profile
    // The AuthContext seems to fetch profile and merge it.
    // So 'user' should have 'signature_url'.

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            alert("Perfil atualizado com sucesso!");
        },
        onError: (err) => {
            alert("Erro ao atualizar perfil: " + err.message);
        },
        onSettled: () => setIsSaving(false)
    });

    const handleSaveSignature = (url) => {
        setIsSaving(true);
        updateMutation.mutate({ signature_url: url });
    };

    const [name, setName] = useState(user?.full_name || '');
    const [isSavingName, setIsSavingName] = useState(false);

    React.useEffect(() => {
        if (user?.full_name) setName(user.full_name);
    }, [user]);

    const updateNameMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            alert("Nome atualizado com sucesso!");
        },
        onError: (err) => {
            alert("Erro ao atualizar nome: " + err.message);
        },
        onSettled: () => setIsSavingName(false)
    });

    const handleSaveName = () => {
        setIsSavingName(true);
        updateNameMutation.mutate();
    };

    if (!user) return <div className="flex justify-center items-center h-screen">Carregando...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
                <p className="text-slate-500">Gerencie suas informações e assinatura</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-500">Nome</label>
                        <div className="flex gap-2 mt-1">
                            <div className="flex-1">
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="max-w-md"
                                />
                            </div>
                            <Button
                                onClick={handleSaveName}
                                disabled={isSavingName || name === user?.full_name}
                                size="sm"
                            >
                                {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-500">Email</label>
                        <p className="text-lg font-medium">{user?.email}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-500">Função</label>
                        <p className="text-lg font-medium capitalize">{user?.role}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Assinatura Digital</CardTitle>
                    <CardDescription>
                        Esta assinatura será usada automaticamente nos relatórios técnicos gerados por você.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <SignaturePad
                            savedUrl={user?.signature_url}
                            onSave={handleSaveSignature}
                        />
                        {isSaving && (
                            <div className="flex items-center justify-center text-sm text-blue-600">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Salvando assinatura...
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}