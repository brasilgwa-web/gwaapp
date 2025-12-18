# 📋 WGA Brasil - Documentação Técnica

> **Documento de Handover** - Sistema de Gerenciamento de Visitas Técnicas

---

## 🏗️ Arquitetura do Sistema

```
┌────────────────────────────────────────────────────────────────┐
│                         FRONTEND                               │
│                    React + Vite + TailwindCSS                  │
│                     Hospedado no Vercel                        │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    SERVERLESS FUNCTIONS                        │
│                       (Vercel Edge)                            │
│   /api/send-email.js → Brevo SMTP                              │
│   /api/upload-drive.js → Google Drive API                      │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                        BACKEND                                 │
│                    Supabase (PostgreSQL)                       │
│              Auth + Database + Row Level Security              │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Credenciais e Serviços

### 1. Supabase (Banco de Dados)

| Item | Valor |
|------|-------|
| **Dashboard** | https://supabase.com/dashboard |
| **Project URL** | `https://uaqjbdxntuchphtsbkyd.supabase.co` |
| **Project ID** | `uaqjbdxntuchphtsbkyd` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (ver variáveis de ambiente) |

**Variáveis de Ambiente:**
```env
VITE_SUPABASE_URL=https://uaqjbdxntuchphtsbkyd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcWpiZHhudHVjaHBodHNia3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTg2MDEsImV4cCI6MjA4MDc5NDYwMX0.l0M5XvspdXAM4gsxqgaWp9rDJoLReASeZr1gnksRfJg
```

---

### 2. Vercel (Hospedagem)

| Item | Valor |
|------|-------|
| **Dashboard** | https://vercel.com/dashboard |
| **Projeto** | `gwaapp` |
| **URL de Produção** | `https://gwaapp.vercel.app` |
| **Repositório** | Conectado ao GitHub |

---

### 3. GitHub (Código Fonte)

| Item | Valor |
|------|-------|
| **Repositório** | `brasilgwa-web/gwaapp` |
| **URL** | https://github.com/brasilgwa-web/gwaapp |
| **Branch Principal** | `main` |

---

### 4. Brevo / SMTP (Envio de Email)

| Item | Valor |
|------|-------|
| **Dashboard** | https://app.brevo.com |
| **Servidor SMTP** | `smtp-relay.brevo.com` |
| **Porta** | `587` |
| **Usuário SMTP** | `9e18bc001@smtp-brevo.com` |
| **Senha SMTP** | Ver variáveis de ambiente no Vercel |
| **Email Remetente** | `brasilgwa@gmail.com` |

**Variáveis de Ambiente (Vercel):**
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=9e18bc001@smtp-brevo.com
SMTP_PASS=********** (configurado no Vercel)
```

---

### 5. Google Drive API (Upload de Relatórios)

| Item | Valor |
|------|-------|
| **Console** | https://console.cloud.google.com |
| **Projeto GCP** | Verificar qual projeto está configurado |
| **Método de Auth** | OAuth2 (Refresh Token) |

**Variáveis de Ambiente (Vercel):**
```env
GOOGLE_DRIVE_CLIENT_ID=**********.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=**********
GOOGLE_DRIVE_REFRESH_TOKEN=**********
```

> ⚠️ **Importante:** Cada cliente deve ter seu `google_drive_folder_id` configurado no cadastro para receber os PDFs.

---

### 6. Gemini AI (Geração de Análises)

| Item | Valor |
|------|-------|
| **API** | Google AI Studio |
| **Modelo Padrão** | `gemini-2.5-flash` |

**Variáveis de Ambiente:**
```env
VITE_GEMINI_API_KEY=**********
```

---

## 📁 Estrutura do Projeto

```
wga-brasil/
├── api/                    # Serverless Functions (Vercel)
│   ├── send-email.js       # Envio de email via Brevo SMTP
│   └── upload-drive.js     # Upload para Google Drive
├── src/
│   ├── api/                # Adapters para Supabase
│   │   ├── entities.js     # CRUD de tabelas
│   │   └── integrations.js # Email, Upload, etc.
│   ├── components/         # Componentes React
│   │   ├── ui/             # shadcn/ui components
│   │   ├── visit/          # Componentes de visita
│   │   └── setup/          # Componentes de configuração
│   ├── context/            # React Contexts
│   │   ├── AuthContext.jsx # Autenticação
│   │   └── ConfirmContext.jsx # Diálogos customizados
│   ├── lib/                # Utilitários
│   │   ├── supabase.ts     # Cliente Supabase
│   │   ├── gemini.js       # Cliente Gemini AI
│   │   └── utils.js        # Helpers
│   └── pages/              # Páginas da aplicação
├── public/                 # Arquivos estáticos
├── package.json            # Dependências
├── vite.config.js          # Configuração Vite
└── vercel.json             # Configuração Vercel
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Usuários do sistema (extende auth.users) |
| `roles` | Perfis de acesso (admin, gerente, tecnico) |
| `role_permissions` | Permissões por perfil |
| `clients` | Clientes cadastrados |
| `locations` | Locais/unidades do cliente |
| `equipments` | Tipos de equipamentos |
| `location_equipments` | Equipamentos instalados em cada local |
| `visits` | Visitas técnicas |
| `test_definitions` | Definições de testes/ensaios |
| `test_results` | Resultados dos testes por visita |
| `products` | Produtos químicos |
| `client_products` | Estoque de produtos por cliente |
| `visit_dosages` | Dosagens aplicadas por visita |
| `visit_photos` | Fotos anexadas às visitas |
| `observation_templates` | Templates de observação |
| `ai_settings` | Configurações da IA |

---

## 🔒 Sistema de Permissões (RBAC)

### Perfis Padrão

| Perfil | Permissões |
|--------|------------|
| **admin** | Acesso total |
| **gerente** | Dashboard, Visitas, Clientes, Usuários |
| **tecnico** | Dashboard, Visitas, Perfil |

### Rotas Protegidas

```
/dashboard       → requer 'dashboard'
/visits          → requer 'visits'
/setup/clients   → requer 'setup_clients'
/setup/equipments→ requer 'setup_equipments'
/users           → requer 'users'
/profile         → acesso livre (usuário logado)
```

---

## 🚀 Deploy e CI/CD

### Fluxo de Deploy

1. **Push para `main`** no GitHub
2. **Vercel detecta** automaticamente
3. **Build** é executado (`npm run build`)
4. **Deploy** para produção

### Comandos Úteis

```bash
# Desenvolvimento local
npm install
npm run dev

# Build de produção
npm run build

# Preview local do build
npm run preview
```

---

## 🔄 Transferência de Propriedade

### Checklist de Handover

- [ ] **Supabase:** Adicionar cliente como Owner → Settings → Members
- [ ] **Vercel:** Transferir projeto → Settings → General → Transfer
- [ ] **GitHub:** Adicionar como colaborador ou transferir repo
- [ ] **Brevo:** Criar conta nova ou transferir credenciais SMTP
- [ ] **Google Cloud:** Transferir projeto GCP ou criar novo
- [ ] **Domínio:** Atualizar DNS se houver domínio customizado

---

## 📞 Suporte

| Item | Contato |
|------|---------|
| **Desenvolvedor** | [Seu nome/email] |
| **Documentação Supabase** | https://supabase.com/docs |
| **Documentação Vercel** | https://vercel.com/docs |
| **Suporte Brevo** | https://help.brevo.com |

---

*Documento gerado em: Dezembro 2024*
*Versão do Sistema: 1.3.0*
