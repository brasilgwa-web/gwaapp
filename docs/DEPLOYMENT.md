# 🚀 WGA Brasil - Deployment Guide

This document covers the deployment process, environment variables, credentials, and CI/CD pipelines for the WGA Brasil application.

> **Environment**: Vercel (Frontend + Edge Functions) + Supabase (Backend/DB)

---

## 🔐 Credentials & Services

### 1. Supabase (Database & Auth)

- **Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)
- **Project ID**: `uaqjbdxntuchphtsbkyd`
- **Region**: Sao Paulo (sa-east-1)

**Environment Variables:**
```env
VITE_SUPABASE_URL=https://uaqjbdxntuchphtsbkyd.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
*Note: The Anon Key is safe to expose in the frontend build.*

### 2. Vercel (Hosting)

- **Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Project Name**: `gwabrasilapp`
- **Production URL**: `https://wgabrasilapp.vercel.app/`
- **Repository**: Connected to GitHub (`brasilgwa-web/gwaapp`)

### 3. Brevo / SMTP (Email Service)

Transactional emails are sent via Brevo SMTP relay.

- **Dashboard**: [app.brevo.com](https://app.brevo.com)
- **SMTP Host**: `smtp-relay.brevo.com`
- **Port**: `587`
- **User**: `9e18bc001@smtp-brevo.com`

**Environment Variables (Server-side Only):**
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=9e18bc001@smtp-brevo.com
SMTP_PASS=<your-smtp-password>
```

### 4. Google Drive API (File Uploads)

Used to save PDF reports directly to client folders in Google Drive.

- **Authentication Method**: OAuth2 Refresh Token Strategy.

**Environment Variables (Server-side Only):**
```env
GOOGLE_DRIVE_CLIENT_ID=<your-client-id>
GOOGLE_DRIVE_CLIENT_SECRET=<your-client-secret>
GOOGLE_DRIVE_REFRESH_TOKEN=<your-refresh-token>
```

> **Important**: Each client must have a `google_drive_folder_id` configured in the system to receive files.

### 5. Gemini AI (Analysis)

Used for generating automated technical analysis of visit data.

**Environment Variables:**
```env
VITE_GEMINI_API_KEY=<your-gemini-api-key>
```

---

## 🔄 CI/CD Pipeline

The project uses Vercel's automated git integration.

### Environments

| Environment | Branch | URL Pattern |
|-------------|--------|-------------|
| **Production** | `main` | `https://wgabrasilapp.vercel.app/` |
| **Staging** | `staging` | `https://gwabrasilapp-git-staging-*.vercel.app` |

### Deployment Workflow

1. **Development**:
   - Developers work on feature branches.
   - PRs are merged into `staging`.

2. **Staging (Homologation)**:
   - Pushing to `staging` triggers a preview deployment.
   - QA/Validation happens here.

3. **Production**:
   - Merge `staging` into `main`.
   - Vercel automatically builds and deploys to production.

### Git Commands Reference

**Deploying to Staging:**
```bash
git checkout staging
git pull origin staging
git merge your-feature-branch
git push origin staging
# Vercel will build and deploy
```

**Deploying to Production:**
```bash
git checkout main
git pull origin main
git merge staging
git push origin main
# Vercel will build and deploy
```

---

## 🛠️ Local Development Setup

To run the project locally, you need Node.js installed.

1. **Clone the repository**
   ```bash
   git clone https://github.com/brasilgwa-web/gwaapp.git
   cd gwaapp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   - Create a `.env.local` file based on `.env.example`.
   - Fill in the required keys (Supabase, Gemini).

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to view it in the browser.

5. **Test Production Build**
   ```bash
   npm run build
   npm run preview
   ```
