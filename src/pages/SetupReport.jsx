import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Save, Loader2, Image, CheckCircle, AlignLeft } from "lucide-react";
import { useConfirm } from "@/context/ConfirmContext";
import { format } from "date-fns";

export default function SetupReport() {
    const queryClient = useQueryClient();
    const { alert } = useConfirm();
    const fileInputRef = useRef(null);

    const [initialNumber, setInitialNumber] = useState('');
    const [footerText, setFooterText] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

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

    // Initialize form when data loads
    React.useEffect(() => {
        if (settings) {
            setInitialNumber(settings.current_report_number?.toString() || '1');
            setFooterText(settings.footer_text || '');
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
                    console.error('Upload error:', uploadError);
                    // Try alternative bucket name
                    const { error: uploadError2 } = await supabase.storage
                        .from('uploads')
                        .upload(filePath, logoFile, { upsert: true });

                    if (uploadError2) throw uploadError2;

                    const { data: urlData } = supabase.storage
                        .from('uploads')
                        .getPublicUrl(filePath);
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
                footer_text: footerText
            });

        } catch (error) {
            console.error('Save error:', error);
            alert({ title: 'Erro', message: 'Erro ao salvar: ' + error.message, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    // Preview do número do relatório
    const now = new Date();
    const previewNumber = `${format(now, 'yy')}-${format(now, 'MM')}-${String(parseInt(initialNumber) || 1).padStart(6, '0')}`;

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
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Configurações de Relatório</h1>
                <p className="text-slate-500">Configure o formato e aparência dos relatórios</p>
            </div>

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
                            Formato: AA-MM-NNNNNN (Ano-Mês-Sequencial)
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

            {/* Save Button */}
            <div className="flex justify-end">
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
            </div>
        </div>
    );
}
