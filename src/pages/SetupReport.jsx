import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/ui/RichTextEditor";
import ColorPicker from "@/components/ui/ColorPicker";
// ... imports
import { FileText, Upload, Save, Loader2, Image, CheckCircle, AlignLeft, Plus, Trash2, Pencil, PenTool, Mail, LayoutTemplate, MessageSquareText } from "lucide-react";
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

// Reusable Image Upload Component
const ImageUploadCard = ({ title, description, icon: Icon, previewUrl, onFileSelect, onRemove, file, inputRef, buttonLabel = "Escolher Imagem" }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4 text-purple-500" />}
                {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
                {/* Preview */}
                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                    {previewUrl ? (
                        <>
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain"
                            />
                            {onRemove && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove();
                                        }}
                                        type="button"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-slate-400">
                            <Image className="w-8 h-8 mx-auto mb-1" />
                            <span className="text-xs">Sem imagem</span>
                        </div>
                    )}
                </div>

                {/* Upload Button */}
                <div className="space-y-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onFileSelect(file);
                        }}
                        className="hidden"
                    />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => inputRef.current?.click()}
                            type="button"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {buttonLabel}
                        </Button>
                        {previewUrl && onRemove && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={onRemove}
                                type="button"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Recomendado: PNG ou JPG, máximo 500KB
                    </p>
                    {file && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {file.name}
                        </p>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function SetupReport() {
    const queryClient = useQueryClient();
    const { alert, confirm } = useConfirm();
    const fileInputRef = useRef(null);

    const [initialNumber, setInitialNumber] = useState('');
    const [footerText, setFooterText] = useState('');
    const [reportTitle, setReportTitle] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    // Comments/Orientations States
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [commentsText, setCommentsText] = useState('');

    // Cover States
    const [coverEnabled, setCoverEnabled] = useState(true);
    const [coverContent, setCoverContent] = useState(''); // Unified cover content
    const [coverBackgroundColor, setCoverBackgroundColor] = useState('#1e40af');
    const [coverImageFile, setCoverImageFile] = useState(null); // Custom cover image file
    const [coverImagePreview, setCoverImagePreview] = useState(null); // Custom cover image URL/preview
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [logo2File, setLogo2File] = useState(null); // Second logo
    const [logo2Preview, setLogo2Preview] = useState(null); // Second logo preview
    const [isUploading, setIsUploading] = useState(false);
    const coverImageInputRef = useRef(null);
    const logo2InputRef = useRef(null);

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
            setReportTitle(settings.report_title || '');
            setEmailSubject(settings.email_subject_default || 'Relatório de Visita Técnica - {client_name} - {date}');

            setEmailBody(settings.email_body_default || '');

            // Comments/Orientations settings
            setCommentsEnabled(settings.comments_orientations_enabled !== false);
            setCommentsText(settings.comments_orientations_text || '');

            // Cover settings
            setCoverEnabled(settings.cover_enabled !== false); // Default true

            // Build unified cover content from individual fields or use saved content
            if (settings.cover_content) {
                setCoverContent(settings.cover_content);
            } else {
                // Migrate from old format to new unified format
                const defaultContent = `
<h1 style="text-align: center; font-size: 2em; font-weight: bold; margin-bottom: 1em;">${settings.cover_title || 'Relatório de Ensaio Analítico'}</h1>
<h2 style="text-align: center; font-size: 1.5em; margin-bottom: 1.5em;">${settings.cover_subtitle || 'Prezado Cliente'}</h2>
<p style="text-align: justify; margin-bottom: 2em;">${settings.cover_text || 'Segue relatórios de ensaios analíticos para controle de processo referente aos serviços contratados.'}</p>
<p style="text-align: center; margin-top: 3em;"><strong>${settings.cover_signature_name || 'Adriano Carlos Gava'}</strong></p>
<p style="text-align: center;"><em>${settings.cover_signature_role || 'Gestor - Laboratório de Aguas e Processos de Tratamento'}</em></p>
<hr style="margin: 2em 0;" />
<p style="text-align: center; font-size: 0.9em;">${settings.cover_footer_text || 'Atendimento ao Cliente - Para esclarecimentos de suas dúvidas: Fones: (011) 9.8348.9922 (011) 9.8331.7957 - E-mail: atendimento@wgabrasil.com.br'}</p>
`.trim();
                setCoverContent(defaultContent);
            }

            setCoverBackgroundColor(settings.cover_background_color || '#1e40af');
            if (settings.logo_url) {
                setLogoPreview(settings.logo_url);
            }
            if (settings.logo2_url) {
                setLogo2Preview(settings.logo2_url);
            }
            // Load custom cover image if exists
            if (settings.cover_image_url) {
                setCoverImagePreview(settings.cover_image_url);
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

    const handleFileSelect = (file, setFile, setPreview) => {
        if (file) {
            setFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsUploading(true);
        try {
            let logoUrl = logoFile ? null : logoPreview;

            // Upload logo if new file selected
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `logo_${Date.now()}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('public')
                    .upload(filePath, logoFile, { upsert: true });

                if (uploadError) {
                    // Try alternative bucket name 'uploads' if 'public' fails logic
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

            // Upload cover image if new file selected
            let coverImageUrl = coverImageFile ? null : coverImagePreview;
            if (coverImageFile) {
                const fileExt = coverImageFile.name.split('.').pop();
                const fileName = `cover_${Date.now()}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                const { error: coverUploadError } = await supabase.storage
                    .from('uploads')
                    .upload(filePath, coverImageFile, { upsert: true });

                if (coverUploadError) throw coverUploadError;

                const { data: coverUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
                coverImageUrl = coverUrlData.publicUrl;
            }

            // Upload logo 2 if new file selected
            let logo2Url = logo2File ? null : logo2Preview;
            if (logo2File) {
                const fileExt = logo2File.name.split('.').pop();
                const fileName = `logo2_${Date.now()}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                const { error: logo2UploadError } = await supabase.storage
                    .from('public')
                    .upload(filePath, logo2File, { upsert: true });

                if (logo2UploadError) {
                    const { error: logo2UploadError2 } = await supabase.storage
                        .from('uploads')
                        .upload(filePath, logo2File, { upsert: true });
                    if (logo2UploadError2) throw logo2UploadError2;
                    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
                    logo2Url = urlData.publicUrl;
                } else {
                    const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
                    logo2Url = urlData.publicUrl;
                }
            }

            await saveMutation.mutateAsync({
                current_report_number: parseInt(initialNumber) || 1,
                logo_url: logoUrl,
                logo2_url: logo2Url,
                footer_text: footerText,
                report_title: reportTitle,
                email_subject_default: emailSubject,
                email_body_default: emailBody,
                cover_enabled: coverEnabled,
                cover_content: coverContent,
                cover_background_color: coverBackgroundColor,
                cover_image_url: coverImageUrl,
                comments_orientations_enabled: commentsEnabled,
                comments_orientations_text: commentsText
            });

        } catch (error) {
            console.error('Save error:', error);
            alert({ title: 'Erro', message: 'Erro ao salvar: ' + error.message, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    // ... handleSaveResp, openNewResp, openEditResp ... (omitted for brevity in replacement, but effectively need to keep the file structure valid.
    // Actually this replacement chunk is too large and cuts off the rest of the file. I should only replace `ImageUploadCard` and `SetupReport` start up to `handleSave` end.
    // The previous chunk logic might be risky if I don't precise the end.

    // Let's refine the replacement to be specific blocks.
    // 1. ImageUploadCard
    // 2. handleSave logic
    // 3. ImageUploadCard usages in return.


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
                    <ImageUploadCard
                        title="Logo do Relatório"
                        description="Faça upload do logo que será exibido nos relatórios PDF."
                        icon={Image}
                        previewUrl={logoPreview}
                        onFileSelect={(f) => handleFileSelect(f, setLogoFile, setLogoPreview)}
                        onRemove={() => { setLogoFile(null); setLogoPreview(null); }}
                        file={logoFile}
                        inputRef={fileInputRef}
                    />

                    {/* Logo 2 Upload (Segundo Logo - Esquerda do Cabeçalho) */}
                    <ImageUploadCard
                        title="Logo 2 (Lado Direito)"
                        description="Segundo logo que aparece ao lado do título do relatório."
                        icon={Image}
                        previewUrl={logo2Preview}
                        onFileSelect={(f) => handleFileSelect(f, setLogo2File, setLogo2Preview)}
                        onRemove={() => { setLogo2File(null); setLogo2Preview(null); }}
                        file={logo2File}
                        inputRef={logo2InputRef}
                        buttonLabel="Escolher Logo 2"
                    />

                    {/* Header and Footer Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-green-500" />
                                Cabeçalho e Rodapé
                            </CardTitle>
                            <CardDescription>
                                Personalize os textos fixos do relatório.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="reportTitle">Título do Relatório (Cabeçalho)</Label>
                                <Input
                                    id="reportTitle"
                                    value={reportTitle}
                                    onChange={(e) => setReportTitle(e.target.value)}
                                    placeholder="Padrão: Relatório de Atendimento Técnico em Campo"
                                />
                                <p className="text-xs text-slate-500">
                                    Define o título principal que aparece no topo de todas as páginas.
                                </p>
                            </div>

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

                    {/* Comentários/Orientações */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MessageSquareText className="w-4 h-4 text-amber-500" />
                                    Comentários / Orientações
                                </CardTitle>
                                <CardDescription>
                                    Texto fixo que aparece ao final do relatório com instruções, notas importantes e metodologia analítica.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="comments-switch" className="text-sm text-slate-600">
                                    {commentsEnabled ? 'Exibir no relatório' : 'Oculto'}
                                </Label>
                                <Switch
                                    id="comments-switch"
                                    checked={commentsEnabled}
                                    onCheckedChange={setCommentsEnabled}
                                />
                            </div>
                        </CardHeader>
                        {commentsEnabled && (
                            <CardContent className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                                    <p className="text-xs text-amber-800">
                                        💡 <strong>Dica:</strong> Este texto é compartilhado por todos os relatórios. Edite com cuidado pois afetará todos os próximos relatórios gerados.
                                    </p>
                                </div>
                                <RichTextEditor
                                    value={commentsText}
                                    onChange={setCommentsText}
                                    placeholder="Digite o texto de comentários e orientações que aparecerá no relatório..."
                                    minHeight="400px"
                                />
                                <p className="text-xs text-slate-500">
                                    Use a barra de ferramentas para formatar o texto com negrito, listas, títulos e cores.
                                </p>
                            </CardContent>
                        )}
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
                                <Label htmlFor="emailBody">Corpo do Email</Label>
                                <div className="text-xs text-slate-500 mb-1">
                                    Use o editor para formatar o email. Variáveis dinâmicas: <code className="bg-slate-100 px-1 rounded">{'{client_name}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{date}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{link}'}</code>
                                </div>
                                <RichTextEditor
                                    value={emailBody}
                                    onChange={setEmailBody}
                                    placeholder="<div><h1>Seu Relatório</h1><p>Prezado cliente...</p></div>"
                                    minHeight="300px"
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
                            <CardContent className="space-y-6">
                                {/* Cover Image Upload - Priority Option */}
                                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1">
                                            <Label className="text-base font-semibold text-green-800 flex items-center gap-2">
                                                <Upload className="w-5 h-5" />
                                                Capa Personalizada (Prioridade)
                                            </Label>
                                            <p className="text-sm text-green-700 mt-1 mb-3">
                                                Faça upload de uma imagem PNG/JPG para usar como capa.
                                                <strong> Se uma imagem for enviada, ela terá prioridade sobre o editor abaixo.</strong>
                                            </p>

                                            <input
                                                ref={coverImageInputRef}
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setCoverImageFile(file);
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setCoverImagePreview(reader.result);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />

                                            <div className="flex items-center gap-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => coverImageInputRef.current?.click()}
                                                    className="bg-white border-green-400 text-green-700 hover:bg-green-100"
                                                >
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    {coverImagePreview ? 'Trocar Capa' : 'Upload de Capa'}
                                                </Button>

                                                {coverImagePreview && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => {
                                                            setCoverImageFile(null);
                                                            setCoverImagePreview(null);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}

                                            </div>
                                        </div>

                                        {/* Preview */}
                                        {coverImagePreview && (
                                            <div className="w-40 h-56 border rounded-lg overflow-hidden shadow-md bg-white flex-shrink-0">
                                                <img
                                                    src={coverImagePreview}
                                                    alt="Preview da capa"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {coverImagePreview && (
                                        <div className="mt-3 bg-green-100 border border-green-300 rounded-md px-3 py-2">
                                            <p className="text-sm text-green-800 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4" />
                                                <strong>Capa personalizada ativa!</strong> Esta imagem será usada como capa do relatório.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-slate-500">
                                            {coverImagePreview ? 'Ou edite o conteúdo alternativo' : 'Ou use o editor abaixo'}
                                        </span>
                                    </div>
                                </div>

                                {/* Editor Fallback */}
                                <div className={coverImagePreview ? 'opacity-50' : ''}>
                                    <ColorPicker
                                        value={coverBackgroundColor}
                                        onChange={setCoverBackgroundColor}
                                        label="Cor de Fundo da Capa"
                                    />

                                    <div className="space-y-2 mt-4">
                                        <Label htmlFor="coverContent">Conteúdo da Capa {coverImagePreview && <span className="text-slate-400">(não será usado enquanto a imagem acima estiver ativa)</span>}</Label>
                                        <p className="text-xs text-slate-500 mb-2">
                                            Edite livremente todo o conteúdo da capa. Use a barra de ferramentas para formatar texto, adicionar títulos, listas, links e cores.
                                        </p>
                                        <RichTextEditor
                                            value={coverContent}
                                            onChange={setCoverContent}
                                            placeholder="Digite o conteúdo completo da capa..."
                                            minHeight="400px"
                                            backgroundColor={coverBackgroundColor}
                                        />
                                        <p className="text-xs text-slate-500 mt-2">
                                            💡 <strong>Dica:</strong> Você pode incluir título, subtítulo, texto principal, assinatura e rodapé tudo em um único editor.
                                        </p>
                                    </div>
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
