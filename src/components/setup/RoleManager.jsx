import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Role, RolePermission } from "@/api/entities";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Shield, Loader2, Lock } from "lucide-react";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export default function RoleManager() {
    const queryClient = useQueryClient();
    const [editingRole, setEditingRole] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    // Fetch roles
    const { data: roles, isLoading: rolesLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: () => Role.list()
    });

    // Fetch all permissions
    const { data: allPermissions } = useQuery({
        queryKey: ['rolePermissions'],
        queryFn: () => RolePermission.list(undefined, 1000)
    });

    // Create role mutation
    const createRole = useMutation({
        mutationFn: async ({ name, description, permissions }) => {
            // Create the role
            const { data: newRole, error } = await supabase
                .from('roles')
                .insert({ name, description, is_system: false })
                .select()
                .single();

            if (error) throw error;

            // Add permissions
            if (permissions.length > 0) {
                const permRecords = permissions.map(key => ({
                    role_id: newRole.id,
                    route_key: key
                }));
                const { error: permError } = await supabase
                    .from('role_permissions')
                    .insert(permRecords);
                if (permError) throw permError;
            }

            return newRole;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
            setIsDialogOpen(false);
            setEditingRole(null);
            setSelectedPermissions([]);
        },
        onError: (err) => alert('Erro ao criar perfil: ' + err.message)
    });

    // Update role mutation
    const updateRole = useMutation({
        mutationFn: async ({ id, name, description, permissions }) => {
            // Update role info
            const { error } = await supabase
                .from('roles')
                .update({ name, description })
                .eq('id', id);

            if (error) throw error;

            // Delete old permissions
            await supabase.from('role_permissions').delete().eq('role_id', id);

            // Add new permissions
            if (permissions.length > 0) {
                const permRecords = permissions.map(key => ({
                    role_id: id,
                    route_key: key
                }));
                await supabase.from('role_permissions').insert(permRecords);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
            setIsDialogOpen(false);
            setEditingRole(null);
            setSelectedPermissions([]);
        },
        onError: (err) => alert('Erro ao atualizar perfil: ' + err.message)
    });

    // Delete role mutation
    const deleteRole = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('roles').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
        },
        onError: (err) => alert('Erro ao excluir perfil: ' + err.message)
    });

    const openNewDialog = () => {
        setEditingRole(null);
        setSelectedPermissions([]);
        setIsDialogOpen(true);
    };

    const openEditDialog = (role) => {
        setEditingRole(role);
        // Load current permissions for this role
        const rolePerms = allPermissions?.filter(p => p.role_id === role.id).map(p => p.route_key) || [];
        setSelectedPermissions(rolePerms);
        setIsDialogOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            permissions: selectedPermissions
        };

        if (editingRole) {
            updateRole.mutate({ id: editingRole.id, ...data });
        } else {
            createRole.mutate(data);
        }
    };

    const togglePermission = (key) => {
        setSelectedPermissions(prev =>
            prev.includes(key)
                ? prev.filter(p => p !== key)
                : [...prev, key]
        );
    };

    const getRolePermissionCount = (roleId) => {
        return allPermissions?.filter(p => p.role_id === roleId).length || 0;
    };

    // Group permissions by category
    const permissionsByGroup = ALL_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.group]) acc[perm.group] = [];
        acc[perm.group].push(perm);
        return acc;
    }, {});

    if (rolesLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-600" />
                        Perfis de Acesso
                    </CardTitle>
                    <CardDescription>Gerencie perfis e suas permissões de acesso</CardDescription>
                </div>
                <Button onClick={openNewDialog} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Novo Perfil
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    {roles?.map(role => (
                        <div
                            key={role.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{role.name}</span>
                                        {role.is_system && (
                                            <Badge variant="outline" className="text-xs">
                                                <Lock className="w-3 h-3 mr-1" /> Sistema
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">{role.description || 'Sem descrição'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{getRolePermissionCount(role.id)} permissões</Badge>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(role)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                {!role.is_system && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => {
                                            if (confirm(`Excluir perfil "${role.name}"?`)) {
                                                deleteRole.mutate(role.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit/Create Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRole ? `Editar Perfil: ${editingRole.name}` : 'Novo Perfil'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Perfil</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={editingRole?.name || ''}
                                    required
                                    disabled={editingRole?.is_system}
                                    placeholder="Ex: Gerente, Supervisor"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    defaultValue={editingRole?.description || ''}
                                    placeholder="Breve descrição do perfil"
                                />
                            </div>

                            {/* Permissions */}
                            <div className="space-y-3">
                                <Label>Permissões de Acesso</Label>
                                {Object.entries(permissionsByGroup).map(([group, perms]) => (
                                    <div key={group} className="border rounded-lg p-3">
                                        <h4 className="font-medium text-sm text-slate-700 mb-2">{group}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {perms.map(perm => (
                                                <div key={perm.key} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={perm.key}
                                                        checked={selectedPermissions.includes(perm.key)}
                                                        onCheckedChange={() => togglePermission(perm.key)}
                                                    />
                                                    <label
                                                        htmlFor={perm.key}
                                                        className="text-sm cursor-pointer"
                                                    >
                                                        {perm.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                                    {(createRole.isPending || updateRole.isPending) && (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    )}
                                    {editingRole ? 'Salvar Alterações' : 'Criar Perfil'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
