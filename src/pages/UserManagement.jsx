import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Role } from "@/api/entities";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Shield, ShieldAlert, UserCog, Ban, CheckCircle, Info, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import RoleManager from "@/components/setup/RoleManager";

export default function UserManagement() {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();

    // Fetch roles for dropdown
    const { data: roles } = useQuery({
        queryKey: ['roles'],
        queryFn: () => Role.list()
    });

    // Fetch users with their role information
    const { data: users, isLoading, error } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    role:roles(id, name, description, is_system)
                `)
                .order('created_at', { ascending: false });

            if (error) {
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
                .select();

            if (error) throw error;
            if (!updated || updated.length === 0) {
                throw new Error("Permissão negada ou usuário não encontrado.");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            alert("Erro ao atualizar usuário: " + error.message);
        }
    });

    const handleRoleChange = (user, newRoleId) => {
        const roleName = roles?.find(r => r.id === newRoleId)?.name || 'novo perfil';
        if (confirm(`Alterar perfil de ${user.email} para "${roleName}"?`)) {
            updateUserMutation.mutate({
                id: user.id,
                data: { role_id: newRoleId }
            });
        }
    };

    const handleStatusChange = (user, newStatus) => {
        const action = newStatus === 'active' ? 'ativar' : 'desativar';
        if (confirm(`${action} o usuário ${user.email}?`)) {
            updateUserMutation.mutate({ id: user.id, data: { status: newStatus } });
        }
    };

    const getStatus = (u) => u.status || 'inactive';
    const getRoleName = (u) => u.role?.name || 'Sem perfil';
    const getRoleId = (u) => u.role_id || u.role?.id;

    if (isLoading) return <div className="p-8 text-center">Carregando usuários...</div>;

    // Check if current user is admin
    const isAdmin = currentUser?.role?.name === 'admin' ||
        roles?.find(r => r.id === currentUser?.role_id)?.name === 'admin' ||
        currentUser?.email === 'andre.lsarruda@gmail.com';

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
                <p className="text-slate-500">Gerencie usuários, perfis e permissões de acesso</p>
            </div>

            <Tabs defaultValue="users">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" /> Usuários
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="gap-2">
                        <Shield className="w-4 h-4" /> Perfis de Acesso
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-4">
                    {(!users || users.length === 0) && (
                        <Alert variant="default" className="bg-yellow-50 border-yellow-200 mb-4">
                            <Info className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-800">Configuração Necessária</AlertTitle>
                            <AlertDescription className="text-yellow-700">
                                Execute a migração SQL para configurar a tabela de usuários.
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
                                        <TableHead>Perfil</TableHead>
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
                                                <Select
                                                    value={getRoleId(user) || "none"}
                                                    onValueChange={(val) => handleRoleChange(user, val)}
                                                    disabled={user.id === currentUser?.id}
                                                >
                                                    <SelectTrigger className="w-[160px] h-8">
                                                        <SelectValue placeholder="Selecionar..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roles?.map(role => (
                                                            <SelectItem key={role.id} value={role.id}>
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={getStatus(user) === 'active'
                                                        ? 'text-green-600 border-green-200 bg-green-50'
                                                        : 'text-red-600 border-red-200 bg-red-50'}
                                                >
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

                                                        {getStatus(user) === 'active' ? (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(user, 'inactive')}
                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                disabled={user.id === currentUser?.id}
                                                            >
                                                                <Ban className="w-4 h-4 mr-2" />
                                                                Desativar Acesso
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(user, 'active')}
                                                                className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                                                disabled={user.id === currentUser?.id}
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
                </TabsContent>

                <TabsContent value="roles" className="mt-4">
                    <RoleManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}