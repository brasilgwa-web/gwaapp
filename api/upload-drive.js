
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
        let auth;
        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        // Strategy 1: OAuth2 (Personal Gmail & Workspace) - PREFERRED for Personal
        if (clientId && clientSecret && refreshToken) {
            console.log("Using OAuth2 Authentication");
            const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            auth = oauth2Client;
        }
        // Strategy 2: Service Account (Workspace Only)
        else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            console.log("Using Service Account Authentication (Env Var)");
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
        }
        // Strategy 3: Service Account File (Local Dev)
        else {
            console.log("Using Service Account File (Local)");
            const keyFilePath = path.join(process.cwd(), 'api', 'service-account.json');
            auth = new google.auth.GoogleAuth({
                keyFile: keyFilePath,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
        }

        const drive = google.drive({ version: 'v3', auth });

        // Convert Base64 back to Buffer/Stream
        // Remove header (data:application/pdf;base64,...) safely
        const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
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
            supportsAllDrives: true,
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
