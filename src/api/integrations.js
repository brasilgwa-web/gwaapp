import { supabase } from '../lib/supabase';

// Supabase Storage Implementation
const UploadFile = async ({ file }) => {
    try {
        // Sanitize filename
        const MAX_NAME_LENGTH = 100;
        let safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        if (safeName.length > MAX_NAME_LENGTH) {
            safeName = safeName.substring(safeName.length - MAX_NAME_LENGTH);
        }

        const timestamp = Date.now();
        const path = `uploads/${timestamp}-${safeName}`;

        // We assume a 'public' bucket exists.
        // If not, we fall back to a dummy URL or user needs to create it.
        const { data, error } = await supabase.storage
            .from('public')
            .upload(path, file, { cacheControl: '3600', upsert: false });

        if (error) {
            console.error("Supabase Storage Upload Error:", error);
            // Fallback for demo/dev if bucket doesn't exist
            return { file_url: "https://placehold.co/600x400?text=Bucket+Config+Required" };
        }

        const { data: { publicUrl } } = supabase.storage
            .from('public')
            .getPublicUrl(path);

        return { file_url: publicUrl };

    } catch (e) {
        console.error("Upload exception:", e);
        return { file_url: "https://placehold.co/600x400?text=Upload+Error" };
    }
};

// Mock other integrations for now to prevent crashes
const GenerateImage = async () => ({ image_url: "https://placehold.co/600x400?text=AI+Generated" });
const InvokeLLM = async () => ({ result: "AI Analysis not connected." });
const SendEmail = async ({ to, subject, body }) => {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to,
                subject,
                html: body.replace(/\n/g, '<br>'), // Simple txt to html conversion
                text: body
            })
        });

        if (!response.ok) {
            // If backend is missing (local dev), fallback to mock with warning
            if (response.status === 404) {
                console.warn("Backend /api/send-email not found. Creating mock success for local dev.");
                alert("Aviso: Email não enviado no modo Desenvolvimento local (Backend ausente). Simulação de sucesso.");
                return { sent: true, mock: true };
            }
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to send email');
        }

        return await response.json();
    } catch (error) {
        console.error("SendEmail Integration Error:", error);
        throw error;
    }
};
const ExtractDataFromUploadedFile = async () => ({ data: {} });
const CreateFileSignedUrl = async () => ({ url: "" });
const UploadPrivateFile = async () => ({ file_url: "" });

export const Core = {
    UploadFile,
    GenerateImage,
    InvokeLLM,
    SendEmail,
    ExtractDataFromUploadedFile,
    CreateFileSignedUrl,
    UploadPrivateFile
};

// Maintain export structure matching base44 Sdk
export const InvokeLLMExport = InvokeLLM;
export const SendEmailExport = SendEmail;
export const UploadFileExport = UploadFile;
export const GenerateImageExport = GenerateImage;
export const ExtractDataFromUploadedFileExport = ExtractDataFromUploadedFile;
export const CreateFileSignedUrlExport = CreateFileSignedUrl;
export const UploadPrivateFileExport = UploadPrivateFile;






