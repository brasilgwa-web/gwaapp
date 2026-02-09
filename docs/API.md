# 🔌 WGA Brasil - API Documentation

This project uses Vercel Edge Functions for server-side logic, primarily for handling sensitive operations like email sending and file uploads.

## Base URL
Development: `http://localhost:3000`
Production: `https://wgabrasilapp.vercel.app`

## Authenticated Endpoints

These endpoints are protected by CORS policies and are designed to be called from the frontend application.

### 1. Send Email

Sends transactional emails using Brevo SMTP.

- **Endpoint**: `/api/send-email`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient email address |
| `subject` | string | Yes | Email subject |
| `html` | string | Yes | HTML content of the email |
| `text` | string | No | Plain text fallback |

#### Response (200 OK)

```json
{
  "message": "Email sent successfully via Brevo SMTP",
  "id": "<message-id>"
}
```

#### Example Usage

```javascript
await fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'client@example.com',
    subject: 'Report',
    html: '<p>Your report is ready.</p>'
  })
});
```

---

### 2. Upload to Google Drive

Uploads a PDF file to a specific Google Drive folder.

- **Endpoint**: `/api/upload-drive`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileBase64` | string | Yes | File content encoded in Base64 (with or without data URI prefix) |
| `fileName` | string | Yes | Name of the file to be saved |
| `folderId` | string | Yes | Google Drive Folder ID destination |

#### Response (200 OK)

```json
{
  "success": true,
  "fileId": "1A2B3C...",
  "webViewLink": "https://drive.google.com/..."
}
```

#### authentication

Uses Service Account or OAuth2 (configured via Environment Variables).

---

## 🗄️ Supabase API

The application communicates directly with Supabase for Database and Auth operations.

- **Client**: `src/lib/supabase.ts`
- **Authentication**: Usage of `sb-access-token` via Supabase Auth.
- **Security**: Row Level Security (RLS) policies enforce access control on the database side.

### Key Tables

Refer to `docs/ARCHITECTURE.md` for the database schema details.
