
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Vercel Serverless Function
export default async function handler(request, response) {
    // CORS
    response.setHeader('Access-Control-Allow-Credentials', true)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')

    if (request.method === 'OPTIONS') {
        return response.status(200).json({})
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { fileBase64, fileName, folderId } = request.body;

    if (!fileBase64 || !fileName || !folderId) {
        return response.status(400).json({ error: 'Missing fileBase64, fileName, or folderId' });
    }

    try {
        // Authenticate using Environment Variable (Production/Secure) or File (Local)
        let auth;
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
        } else {
            // Fallback for local testing if file exists
            const keyFilePath = path.join(process.cwd(), 'api', 'service-account.json');
            auth = new google.auth.GoogleAuth({
                keyFile: keyFilePath,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
        }

        const drive = google.drive({ version: 'v3', auth });

        // Convert Base64 back to Buffer/Stream
        // Remove data:application/pdf;base64, prefix if present
        const base64Data = fileBase64.replace(/^data:application\/pdf;base64,/, "");
        const fileBuffer = Buffer.from(base64Data, 'base64');

        // Needed for Stream
        const { Readable } = await import('stream');
        const bufferStream = new Readable();
        bufferStream.push(fileBuffer);
        bufferStream.push(null);

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'application/pdf',
            body: bufferStream,
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
            supportsAllDrives: true, // Needed for Shared Drives
        });

        return response.status(200).json({
            success: true,
            fileId: driveResponse.data.id,
            webViewLink: driveResponse.data.webViewLink
        });

    } catch (error) {
        console.error("Google Drive Upload Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
