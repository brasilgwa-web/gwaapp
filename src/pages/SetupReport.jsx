import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// ... imports
import { FileText, Upload, Save, Loader2, Image, CheckCircle, AlignLeft, Plus, Trash2, Pencil, PenTool, Mail, LayoutTemplate } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/context/ConfirmContext";
import { format } from "date-fns";
import SignaturePad from "@/components/visit/SignaturePad";

const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

export default function SetupReport() {
    const queryClient = useQueryClient();
    const { alert, confirm } = useConfirm();
    const fileInputRef = useRef(null);

    const [initialNumber, setInitialNumber] = useState('');
    const [footerText, setFooterText] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    // Cover States
    const [coverEnabled, setCoverEnabled] = useState(true);
    const [coverTitle, setCoverTitle] = useState('');
    const [coverSubtitle, setCoverSubtitle] = useState('');
    const [coverText, setCoverText] = useState('');
    const [coverFooterText, setCoverFooterText] = useState('');
    const [coverSignatureName, setCoverSignatureName] = useState('');
    const [coverSignatureRole, setCoverSignatureRole] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Technical Responsible States
    const [isRespDialogOpen, setIsRespDialogOpen] = useState(false);
    const [editingResp, setEditingResp] = useState(null);
    const [currentSignature, setCurrentSignature] = useState(null);
    const [isSavingResp, setIsSavingResp] = useState(false);

    // Fetch existing settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['reportSettings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('report_settings')
                .select('*')
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
            }
            return data;
        }
    });

    // Fetch Technical Responsibles
    const { data: responsibles, isLoading: isLoadingResp } = useQuery({
        queryKey: ['technicalResponsibles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('technical_responsibles')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    // Initialize form when data loads
    React.useEffect(() => {
        if (settings) {
            setInitialNumber(settings.current_report_number?.toString() || '1');
            setFooterText(settings.footer_text || '');
            setEmailSubject(settings.email_subject_default || 'Relatório de Visita Técnica - {client_name} - {date}');

            setEmailBody(settings.email_body_default || '');

            // Cover settings
            setCoverEnabled(settings.cover_enabled !== false); // Default true
            setCoverTitle(settings.cover_title || 'Relatório de Ensaio Analítico');
            setCoverSubtitle(settings.cover_subtitle || 'Prezado Cliente');
            setCoverText(settings.cover_text || 'Segue relatórios de ensaios analíticos para controle de processo referente aos serviços contratados.');
            setCoverFooterText(settings.cover_footer_text || 'Atendimento ao Cliente - Para esclarecimentos de suas dúvidas: Fones: (011) 9.8348.9922 (011) 9.8331.7957 - E-mail: atendimento@wgabrasil.com.br');
            setCoverSignatureName(settings.cover_signature_name || 'Adriano Carlos Gava');
            setCoverSignatureRole(settings.cover_signature_role || 'Gestor - Laboratório de Aguas e Processos de Tratamento');
            if (settings.logo_url) {
                setLogoPreview(settings.logo_url);
            }
        }
    }, [settings]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (settings?.id) {
                // Update existing
                const { error } = await supabase
                    .from('report_settings')
                    .update({
                        ...data,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', settings.id);
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('report_settings')
                    .insert([{
                        ...data,
                        initial_report_number: parseInt(data.current_report_number) || 1
                    }]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reportSettings'] });
            alert({ title: 'Sucesso', message: 'Configurações salvas com sucesso!', type: 'success' });
        },
        onError: (error) => {
            alert({ title: 'Erro', message: 'Erro ao salvar: ' + error.message, type: 'error' });
        }
    });

    // Responsible Mutations
    const upsertResponsible = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                const { error } = await supabase.from('technical_responsibles').update(data).eq('id', data.id);
                if (error) throw error;
            } else {
                const { id, ...insertData } = data; // Ensure ID is not sent as null/undefined
                const { error } = await supabase.from('technical_responsibles').insert([insertData]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['technicalResponsibles'] });
            setIsRespDialogOpen(false);
            setEditingResp(null);
            setCurrentSignature(null);
            alert({ title: 'Sucesso', message: 'Responsável técnico salvo!', type: 'success' });
        },
        onError: (err) => alert({ title: 'Erro', message: err.message, type: 'error' })
    });

    const deleteResponsible = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('technical_responsibles').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['technicalResponsibles'] });
            alert({ title: 'Sucesso', message: 'Removido com sucesso!', type: 'success' });
        },
        onError: (err) => alert({ title: 'Erro', message: err.message, type: 'error' })
    });

    const toggleResponsibleActive = useMutation({
        mutationFn: async ({ id, active }) => {
            const { error } = await supabase.from('technical_responsibles').update({ active }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['technicalResponsibles'] });
        },
        onError: (err) => alert({ title: 'Erro', message: err.message, type: 'error' })
    });

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsUploading(true);
        try {
            let logoUrl = settings?.logo_url || null;

            // Upload logo if new file selected
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `logo_${Date.now()}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('public')
                    .upload(filePath, logoFile, { upsert: true });

                if (uploadError) {
                    // Try alternative bucket name 'uploads' if 'public' fails logic (simplified for brevity, assume 'uploads' fallback logic exists or just use 'uploads' if consistent)
                    // Staying consistent with current code Structure
                    const { error: uploadError2 } = await supabase.storage
                        .from('uploads')
                        .upload(filePath, logoFile, { upsert: true });
                    if (uploadError2) throw uploadError2;

                    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
                    logoUrl = urlData.publicUrl;
                } else {
                    const { data: urlData } = supabase.storage
                        .from('public')
                        .getPublicUrl(filePath);
                    logoUrl = urlData.publicUrl;
                }
            }

            await saveMutation.mutateAsync({
                current_report_number: parseInt(initialNumber) || 1,
                logo_url: logoUrl,
                footer_text: footerText,
                email_subject_default: emailSubject,
                email_body_default: emailBody,
                cover_enabled: coverEnabled,
                cover_title: coverTitle,
                cover_subtitle: coverSubtitle,
                cover_text: coverText,
                cover_footer_text: coverFooterText,
                cover_signature_name: coverSignatureName,
                cover_signature_role: coverSignatureRole
            });

        } catch (error) {
            console.error('Save error:', error);
            alert({ title: 'Erro', message: 'Erro ao salvar: ' + error.message, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveResp = async (e) => {
        e.preventDefault();
        setIsSavingResp(true);
        try {
            const formData = new FormData(e.target);
            const name = formData.get('name');
            const crq = formData.get('crq');

            let signatureUrl = currentSignature;

            // If it's a base64 string, upload it
            if (signatureUrl && signatureUrl.startsWith('data:')) {
                const blob = dataURLtoBlob(signatureUrl);
                const fileExt = 'png';
                const fileName = `sig_${Date.now()}.${fileExt}`;
                const filePath = `signatures/${fileName}`;

                let bucketName = 'signatures';

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, blob, { upsert: true, contentType: 'image/png' });

                if (uploadError) {
                    console.warn("Signatures bucket failed, trying uploads", uploadError);
                    bucketName = 'uploads';
                    const { error: uploadError2 } = await supabase.storage.from(bucketName).upload(filePath, blob, { upsert: true, contentType: 'image/png' });
                    if (uploadError2) throw uploadError2;
                }

                const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
                signatureUrl = urlData.publicUrl;
            } else if (!signatureUrl) {
                // Explicitly set to null if cleared
                signatureUrl = null;
            }
            // If it starts with http, it is existing url, keep it.

            await upsertResponsible.mutateAsync({
                id: editingResp?.id,
                name,
                crq,
                signature_url: signatureUrl,
                active: editingResp ? editingResp.active : true
            });

        } catch (error) {
            console.error(error);
            alert({ title: 'Erro', message: error.message, type: 'error' });
        } finally {
            setIsSavingResp(false);
        }
    };

    const openNewResp = () => {
        setEditingResp(null);
        setCurrentSignature(null);
        setIsRespDialogOpen(true);
    };

    const openEditResp = (resp) => {
        setEditingResp(resp);
        setCurrentSignature(resp.signature_url);
        setIsRespDialogOpen(true);
    };

    // Preview do número do relatório
    const now = new Date();
    const previewNumber = `${format(now, 'yy')}${format(now, 'MM')}-${String(parseInt(initialNumber) || 1).padStart(6, '0')}`;

    // Validation: cannot set number lower than highest emitted
    const highestEmitted = settings?.highest_emitted_number || 0;
    const currentValue = parseInt(initialNumber) || 0;
    const isInvalidNumber = currentValue < highestEmitted && highestEmitted > 0;

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <Loader2 className="animate-spin w-6 h-6 mx-auto text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Configurações de Relatório</h1>
                <p className="text-slate-500">Configure o formato e aparência dos relatórios</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="cover">Capa</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-6">
                    {/* Technical Responsibles */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <PenTool className="w-4 h-4 text-orange-500" />
                                    Responsáveis Técnicos
                                </CardTitle>
                                <CardDescription>
                                    Gerencie os responsáveis técnicos que assinam os relatórios.
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={openNewResp}>
                                <Plus className="w-4 h-4 mr-2" /> Adicionar
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {responsibles?.length === 0 && (
                                    <p className="text-sm text-slate-500 italic text-center py-4">Nenhum responsável técnico cadastrado.</p>
                                )}
                                {responsibles?.map(resp => (
                                    <div key={resp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                                                {resp.signature_url ? (
                                                    <img src={resp.signature_url} alt="Sig" className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <PenTool className="w-4 h-4 text-slate-300" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{resp.name}</div>
                                                <div className="text-xs text-slate-500">{resp.crq}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${resp.active ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                                                    {resp.active ? 'Ativo no Relatório' : 'Arquivado'}
                                                </span>
                                                <Switch
                                                    checked={resp.active}
                                                    onCheckedChange={(checked) => toggleResponsibleActive.mutate({ id: resp.id, active: checked })}
                                                />
                                            </div>
                                            <div className="h-4 w-px bg-slate-300 mx-1"></div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => openEditResp(resp)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => confirm({
                                                title: 'Excluir Responsável',
                                                message: `Tem certeza que deseja excluir ${resp.name}?`,
                                                onConfirm: () => deleteResponsible.mutate(resp.id)
                                            })}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Dialog open={isRespDialogOpen} onOpenChange={setIsRespDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingResp ? 'Editar Responsável' : 'Novo Responsável Técnico'}</DialogTitle>
                                <DialogDescription>
                                    Adicione os dados e assinatura do responsável técnico.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSaveResp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome Completo</Label>
                                    <Input name="name" defaultValue={editingResp?.name} required placeholder="Ex: Eng. João da Silva" />
                                </div>
                                <div className="space-y-2">
                                    <Label>CRQ / Registro Profissional</Label>
                                    <Input name="crq" defaultValue={editingResp?.crq} required placeholder="Ex: CRQ-IV 04234567" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Assinatura Digital</Label>
                                    <div className="space-y-2">
                                        <SignaturePad
                                            savedUrl={currentSignature}
                                            onSave={(data) => {
                                                setCurrentSignature(data);
                                            }}
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Use o mouse ou dedo para assinar no quadro acima.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="ghost" onClick={() => setIsRespDialogOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isSavingResp}>
                                        {isSavingResp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Salvar Responsável
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Numeração Sequencial */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Numeração Sequencial
                            </CardTitle>
                            <CardDescription>
                                Define o número atual/inicial para os relatórios. O próximo relatório usará este número.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="initialNumber">Próximo Número do Relatório</Label>
                                <Input
                                    id="initialNumber"
                                    type="number"
                                    min={highestEmitted > 0 ? highestEmitted : 1}
                                    value={initialNumber}
                                    onChange={(e) => setInitialNumber(e.target.value)}
                                    placeholder="Ex: 1"
                                    className={`max-w-[200px] ${isInvalidNumber ? 'border-red-500' : ''}`}
                                />
                                {isInvalidNumber && (
                                    <p className="text-sm text-red-600 flex items-center gap-1">
                                        ⚠️ Não é possível definir um número menor que {highestEmitted} (já emitido)
                                    </p>
                                )}
                                {highestEmitted > 0 && (
                                    <p className="text-xs text-slate-500">
                                        Último número emitido: {String(highestEmitted).padStart(6, '0')}
                                    </p>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-700">
                                    <strong>Preview:</strong> O próximo relatório terá o número:
                                </p>
                                <p className="text-2xl font-mono font-bold text-blue-900 mt-1">
                                    {previewNumber}
                                </p>
                                <p className="text-xs text-blue-600 mt-2">
                                    Formato: AAMM-NNNNNN (AnoMês-Sequencial)
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logo Upload */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Image className="w-4 h-4 text-purple-500" />
                                Logo do Relatório
                            </CardTitle>
                            <CardDescription>
                                Faça upload do logo que será exibido nos relatórios PDF.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-6">
                                {/* Preview */}
                                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                                    {logoPreview ? (
                                        <img
                                            src={logoPreview}
                                            alt="Logo Preview"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <Image className="w-8 h-8 mx-auto mb-1" />
                                            <span className="text-xs">Sem logo</span>
                                        </div>
                                    )}
                                </div>

                                {/* Upload Button */}
                                <div className="space-y-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Escolher Imagem
                                    </Button>
                                    <p className="text-xs text-slate-500">
                                        Recomendado: PNG ou JPG, máximo 500KB
                                    </p>
                                    {logoFile && (
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            {logoFile.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Footer Text */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-green-500" />
                                Texto do Rodapé
                            </CardTitle>
                            <CardDescription>
                                Personalize o texto que aparecerá no rodapé de todas as páginas do relatório.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="footerText">Texto do Rodapé</Label>
                                <Textarea
                                    id="footerText"
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    placeholder="Ex: WGA Brasil Tratamento de Águas - CNPJ: XX.XXX.XXX/0001-XX&#10;Este relatório possui validade técnica e foi gerado eletronicamente."
                                    rows={3}
                                    className="resize-none"
                                />
                                <p className="text-xs text-slate-500">
                                    Dica: Use Enter para criar novas linhas. Este texto aparecerá em todas as páginas do relatório.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent>

                <TabsContent value="email" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-blue-600" /> Personalização de Email</CardTitle>
                            <CardDescription>Configure o modelo de email enviado aos clientes com o relatório.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                                <h4 className="text-sm font-semibold text-blue-800 mb-2">Variáveis Disponíveis</h4>
                                <p className="text-xs text-blue-700 mb-1">Use estas variáveis para inserir dados dinâmicos no email:</p>
                                <ul className="text-xs text-blue-700 list-disc pl-4 grid grid-cols-2 gap-1">
                                    <li><code>{'{client_name}'}</code> - Nome do Cliente</li>
                                    <li><code>{'{date}'}</code> - Data da Visita (dd/mm/aaaa)</li>
                                    <li><code>{'{link}'}</code> - Link do Relatório (Google Drive)</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="emailSubject">Assunto do Email</Label>
                                <Input
                                    id="emailSubject"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Ex: Relatório de Visita Técnica - {client_name}"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="emailBody">Corpo do Email (HTML Suportado)</Label>
                                <div className="text-xs text-slate-500 mb-1">Você pode usar tags HTML básicas para formatar (h1, p, strong, a, etc).</div>
                                <Textarea
                                    id="emailBody"
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    className="min-h-[300px] font-mono text-xs"
                                    placeholder="<div><h1>Seu Relatório</h1>...</div>"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cover" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-blue-600" /> Capa do Relatório</CardTitle>
                                <CardDescription>Configure a capa personalizada (fundo azul) que será adicionada ao início do relatório PDF.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="cover-switch" className="text-sm text-slate-600">{coverEnabled ? 'Ativada' : 'Desativada'}</Label>
                                <Switch id="cover-switch" checked={coverEnabled} onCheckedChange={setCoverEnabled} />
                            </div>
                        </CardHeader>
                        {coverEnabled && (
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="coverTitle">Título Principal</Label>
                                    <Input id="coverTitle" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} placeholder="Ex: Relatório de Ensaio Analítico" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="coverSubtitle">Subtítulo</Label>
                                    <Input id="coverSubtitle" value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)} placeholder="Ex: Prezado Cliente" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="coverText">Texto do Corpo</Label>
                                    <Textarea id="coverText" value={coverText} onChange={(e) => setCoverText(e.target.value)} rows={3} placeholder="Ex: Segue relatórios..." />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sigName">Nome da Assinatura (Fixo)</Label>
                                        <Input id="sigName" value={coverSignatureName} onChange={(e) => setCoverSignatureName(e.target.value)} placeholder="Ex: Adriano Carlos Gava" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sigRole">Cargo da Assinatura (Fixo)</Label>
                                        <Input id="sigRole" value={coverSignatureRole} onChange={(e) => setCoverSignatureRole(e.target.value)} placeholder="Ex: Gestor..." />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="coverFooter">Rodapé da Capa</Label>
                                    <Textarea id="coverFooter" value={coverFooterText} onChange={(e) => setCoverFooterText(e.target.value)} rows={2} placeholder="Ex: Atendimento ao Cliente..." />
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </TabsContent>
            </Tabs >

            {/* Save Button */}
            < div className="flex justify-end pt-6 border-t mt-4" >
                <Button
                    onClick={handleSave}
                    disabled={isUploading || saveMutation.isPending || isInvalidNumber}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {(isUploading || saveMutation.isPending) ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Configurações
                </Button>
            </div >
        </div >
    );
}
