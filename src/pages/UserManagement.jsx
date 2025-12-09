import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Shield, ShieldAlert, UserCog, Ban, CheckCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UserManagement() {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth(); // Use AuthContext instead of base44.auth.me()

    // Fetch users from a 'profiles' table on Supabase.
    // NOTE: This assumes a public.profiles table exists and is linked to auth.users via triggers.
    const { data: users, isLoading, error } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            // We fetch from 'profiles' or whatever table mapping you use
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // If table doesn't exist yet, return empty to avoid crash
                if (error.code === '42P01') return [];
                throw error;
            }
            return data;
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const { data: updated, error } = await supabase
                .from('profiles')
                .update(data)
                .eq('id', id)
                .select(); // Ask for specific return

            if (error) throw error;
            if (!updated || updated.length === 0) {
                throw new Error("Permissão negada ou usuário não encontrado. Verifique se você é um Administrador no banco de dados.");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            alert("Erro ao atualizar usuário: " + error.message);
        }
    });

    const handleRoleChange = (user, newRole) => {
        if (confirm(`Tem certeza que deseja alterar o papel de ${user.email} para ${newRole}?`)) {
            updateUserMutation.mutate({ id: user.id, data: { role: newRole } });
        }
    };

    const handleStatusChange = (user, newStatus) => {
        const action = newStatus === 'active' ? 'ativar' : 'desativar';
        if (confirm(`Tem certeza que deseja ${action} o usuário ${user.email}?`)) {
            updateUserMutation.mutate({ id: user.id, data: { status: newStatus } });
        }
    };

    // Temporary helper to get display role from metadata if profile missing
    const getRole = (u) => u.role || 'user';
    const getStatus = (u) => u.status || 'inactive';

    if (isLoading) return <div className="p-8 text-center">Carregando usuários...</div>;

    // Security check using app metadata or helper
    const isAdmin = currentUser?.app_metadata?.role === 'admin' || currentUser?.email === 'andre.lsarruda@gmail.com';

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <ShieldAlert className="w-12 h-12 mb-4 text-red-500" />
                <h1 className="text-xl font-bold text-slate-900">Acesso Negado</h1>
                <p>Apenas administradores podem gerenciar usuários.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Gestão de Usuários</h1>
                <p className="text-slate-500">Gerencie permissões e acesso ao sistema</p>
            </div>

            {(!users || users.length === 0) && (
                <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                    <Info className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Configuração Necessária</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                        Para ver a lista de usuários, você precisa criar a tabela <strong>public.profiles</strong> no Supabase.
                        <br />
                        Consulte o script SQL fornecido para configurar a sincronização automática de usuários.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Usuários Cadastrados ({users?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data Cadastro</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                                            <span className="text-xs text-slate-500">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getRole(user) === 'admin' ? 'default' : 'secondary'} className={getRole(user) === 'admin' ? 'bg-purple-600' : ''}>
                                            {getRole(user) === 'admin' ? 'Administrador' : 'Técnico'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getStatus(user) === 'active' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}>
                                            {getStatus(user) === 'active' ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuSeparator />

                                                {getRole(user) !== 'admin' && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleRoleChange(user, 'admin')}
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        <Shield className="w-4 h-4 mr-2 text-purple-600" />
                                                        Promover a Admin
                                                    </DropdownMenuItem>
                                                )}

                                                {getRole(user) === 'admin' && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleRoleChange(user, 'user')}
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        <UserCog className="w-4 h-4 mr-2 text-slate-600" />
                                                        Rebaixar a Técnico
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuSeparator />

                                                {getStatus(user) === 'active' ? (
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusChange(user, 'inactive')}
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        <Ban className="w-4 h-4 mr-2" />
                                                        Desativar Acesso
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleStatusChange(user, 'active')}
                                                        className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Ativar Acesso
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}