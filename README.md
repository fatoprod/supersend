# SuperSend

Plataforma de email marketing com painel completo para gestão de contatos, campanhas, templates e analytics.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Firebase (Auth, Firestore, Functions, Hosting)
- **Email**: Mailgun (`mg.promocaohp.com.br`)
- **State**: Zustand + TanStack React Query
- **Icons**: Lucide React

## Funcionalidades

- **Autenticação**: Login com email/senha e Google Sign-In, verificação de email com código de 6 dígitos
- **Dashboard**: Visão geral com métricas reais do Firestore (contatos, campanhas, taxa de abertura, taxa de clique)
- **Contatos**: CRUD completo com importação, busca e tags
- **Campanhas**: Criação com seleção de template, preenchimento de variáveis, preview ao vivo 50/50 e envio via Mailgun
- **Templates**: Editor dedicado com color picker (4 cores), editor HTML, variáveis com validação (obrigatórias/opcionais) e preview ao vivo 50/50
- **Analytics**: Métricas detalhadas de envio, abertura e cliques
- **Configurações**: Gerenciamento de conta, email settings, segurança e notificações

## Estrutura

```
supersend/
├── src/                        # Frontend React
│   ├── components/             # Componentes reutilizáveis
│   │   ├── auth/               # LoginForm, RegisterForm, VerifyEmailForm
│   │   ├── dashboard/          # Componentes do dashboard
│   │   ├── layout/             # Sidebar, Header, DashboardLayout, AuthLayout
│   │   └── ui/                 # Button, Input, Card
│   ├── hooks/                  # React Query hooks
│   │   ├── useAuth.ts          # Autenticação
│   │   ├── useCampaigns.ts     # CRUD + envio de campanhas
│   │   ├── useContacts.ts      # CRUD + importação de contatos
│   │   ├── useTemplates.ts     # CRUD + duplicação de templates
│   │   ├── useDashboard.ts     # Stats do dashboard e analytics
│   │   ├── useSettings.ts      # Configurações do usuário
│   │   └── useToast.tsx        # Sistema de notificações
│   ├── i18n/                   # Internacionalização (pt-BR, en)
│   ├── lib/                    # Firebase config + serviços
│   │   ├── firebase.ts         # Config Firebase (named db, storage)
│   │   └── services/           # Camada de serviços Firestore
│   │       ├── analytics.ts    # Dashboard stats e métricas
│   │       ├── campaigns.ts    # CRUD + envio (httpsCallable)
│   │       ├── contacts.ts     # CRUD + importação + busca
│   │       ├── settings.ts     # Configurações do usuário
│   │       └── templates.ts    # CRUD + extração de variáveis
│   ├── pages/                  # Páginas da aplicação
│   │   ├── DashboardPage.tsx   # Métricas reais + campanhas recentes
│   │   ├── ContactsPage.tsx    # Lista, busca, CRUD de contatos
│   │   ├── CampaignsPage.tsx   # Lista de campanhas + ações
│   │   ├── CampaignEditorPage.tsx  # Editor de campanha (50/50 com preview)
│   │   ├── TemplatesPage.tsx   # Lista/grid de templates
│   │   ├── TemplateEditorPage.tsx  # Editor de template (50/50 com preview)
│   │   ├── AnalyticsPage.tsx   # Métricas detalhadas
│   │   ├── SettingsPage.tsx    # Perfil, email, segurança, notificações
│   │   └── auth/               # Login, Register, VerifyEmail
│   ├── stores/                 # Zustand stores (auth, ui)
│   └── types/                  # TypeScript types
├── functions/                  # Firebase Functions (Node.js 20)
│   └── src/
│       ├── index.ts            # Entry point (6 functions exportadas)
│       ├── auth/               # Verificação de email
│       └── email/              # Integração Mailgun
├── firebase.json               # Config Firebase (codebase: supersend)
├── firestore.rules             # Regras de segurança Firestore
└── firestore.indexes.json      # Índices Firestore
```

## Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/dashboard` | DashboardPage | Métricas e campanhas recentes |
| `/contacts` | ContactsPage | Gestão de contatos |
| `/campaigns` | CampaignsPage | Lista de campanhas |
| `/campaigns/new` | CampaignEditorPage | Criar nova campanha |
| `/campaigns/:id/edit` | CampaignEditorPage | Editar campanha existente |
| `/templates` | TemplatesPage | Lista de templates |
| `/templates/new` | TemplateEditorPage | Criar novo template |
| `/templates/:id/edit` | TemplateEditorPage | Editar template existente |
| `/analytics` | AnalyticsPage | Métricas detalhadas |
| `/settings` | SettingsPage | Configurações |
| `/login` | LoginPage | Login |
| `/register` | RegisterPage | Cadastro |
| `/verify-email` | VerifyEmailPage | Verificação de email |

## Fluxo de Trabalho

### Templates → Campanhas

1. **Criar template** em `/templates/new`: definir HTML, cores (color picker), assunto e testar com variáveis de preview
2. **Criar campanha** em `/campaigns/new`: selecionar template, preencher variáveis obrigatórias (empresa, título, conteúdo, botão, etc.), definir destinatários e enviar
3. Variáveis opcionais não preenchidas (logo, unsubscribe, etc.) são **automaticamente removidas** do HTML final — sem `{{placeholder}}` visível

### Variáveis do Template

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `{{company}}` | Obrigatória | Nome da empresa |
| `{{title}}` | Obrigatória | Título do email |
| `{{content}}` | Obrigatória | Conteúdo principal |
| `{{cta_text}}` | Obrigatória | Texto do botão CTA |
| `{{cta_url}}` | Obrigatória | URL do botão CTA |
| `{{subject}}` | Obrigatória | Assunto do email |
| `{{logo_url}}` | Opcional | URL do logo (img removida se vazio) |
| `{{unsubscribe_url}}` | Opcional | Link de descadastro (link removido se vazio) |
| `{{preferences_url}}` | Opcional | Link de preferências (link removido se vazio) |
| `{{company_address}}` | Opcional | Endereço da empresa (parágrafo removido se vazio) |

## Recursos Nomeados (Multi-App Isolation)

Este projeto roda dentro de um projeto Firebase compartilhado (`studio-9597335049-1a59a`). Para evitar conflitos com outros apps, todos os recursos são nomeados:

### Firestore Database

- **Nome do banco**: `supersend-bd`
- **Frontend**: `getFirestore(app, "supersend-bd")` em `src/lib/firebase.ts`
- **Functions**: `getFirestore("supersend-bd")` de `firebase-admin/firestore`
- **firebase.json**: `"database": "supersend-bd"` na seção `firestore`
- **Deploy de rules/indexes**: Aplica automaticamente ao banco `supersend-bd` (não ao `(default)`)

### Storage Bucket

- **Bucket**: `gs://supervideo-stg`
- **Frontend**: `getStorage(app, "gs://supervideo-stg")` em `src/lib/firebase.ts`

### Functions Codebase

- **Codebase**: `supersend` em `firebase.json`
- O deploy de functions só gerencia as functions do codebase `supersend`
- Functions de outros apps (ex: `dashboardApi`, `ssrmargemcheck`) **não são afetadas**
- Na listagem do Firebase, as functions aparecem como `supersend:nomeDaFunction`

### Hosting Target

- **Target**: `supersend` → site `supersendapp`
- Configurado em `.firebaserc` com `firebase target:apply hosting supersend supersendapp`

> **Importante**: Ao fazer `firebase deploy`, apenas os recursos do SuperSend são afetados. Outros apps no mesmo projeto permanecem intactos.

## Firebase Functions

| Função | Tipo | Descrição |
|--------|------|-----------|
| `onUserCreated` | Auth trigger | Cria documento do usuário e envia código de verificação |
| `verifyEmail` | Callable | Valida o código de 6 dígitos |
| `resendVerification` | Callable | Reenvia código de verificação |
| `sendSingleEmail` | Callable | Envia email individual via Mailgun |
| `processCampaign` | Callable | Processa e envia campanha para lista de contatos |
| `processScheduledCampaigns` | Scheduled | Verifica e envia campanhas agendadas (a cada 5 min) |

## Firestore Collections

```
users/{userId}
├── contacts/       # Contatos do usuário
├── campaigns/      # Campanhas de email
├── templates/      # Templates de email
└── sentEmails/     # Log de emails enviados (status, messageId, opened, clicked)
```

## Setup Local

### Pré-requisitos

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- GitHub CLI (`gh`) — opcional, mas recomendado
- Conta Firebase com projeto Blaze

### Contas e Autenticação

O projeto requer login em duas plataformas via CLI. **Sempre verifique se está logado na conta correta antes de qualquer operação.**

#### Firebase CLI

```bash
# Verificar conta atual
firebase login:list

# Conta correta: fatosocialdigital@gmail.com
# Se estiver na conta errada:
firebase logout
firebase login
```

> O projeto Firebase é `studio-9597335049-1a59a` e pertence à conta `fatosocialdigital@gmail.com`.

#### GitHub CLI / Git

```bash
# Verificar conta atual
gh auth status

# Conta correta: fatoprod
# Se estiver na conta errada:
gh auth login
```

> O repositório é `fatoprod/supersend`. Se o `git push` falhar com erro 403, provavelmente o credential manager está usando outra conta GitHub. Execute `gh auth login` para corrigir.

#### Google Cloud CLI (gcloud)

Necessário apenas para operações avançadas (criar bancos Firestore nomeados, buckets, etc.):

```bash
# Verificar conta atual
gcloud auth list

# Conta correta: fatosocialdigital@gmail.com
gcloud auth login
```

### Instalação

```bash
# Clonar repositório
git clone https://github.com/fatoprod/supersend.git
cd supersend

# Instalar dependências do frontend
npm install

# Instalar dependências das functions
cd functions && npm install && cd ..
```

### Configuração

1. Criar arquivo `.env` na raiz:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

2. Configurar Mailgun nas functions:

```bash
firebase functions:secrets:set MAILGUN_API_KEY --project your_project_id
```

3. Criar arquivo `functions/.env.your_project_id`:

```env
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=mg.yourdomain.com
```

### Seed de Template Padrão

```bash
cd functions
node seed-template.js <USER_UID>
```

Cria um template padrão com header, conteúdo, botão CTA e footer com 10 variáveis configuráveis.

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Build das functions
cd functions && npm run build
```

### Deploy

```bash
# Deploy completo
firebase deploy --project your_project_id

# Apenas hosting
firebase deploy --only hosting --project your_project_id

# Apenas functions
firebase deploy --only functions --project your_project_id

# Apenas firestore rules/indexes
firebase deploy --only firestore --project your_project_id
```

## Firebase Console

Após o deploy, ativar no Firebase Console:

1. **Authentication → Sign-in method**: Ativar Email/Password e Google
2. **Authentication → Settings → Authorized domains**: Adicionar domínio do hosting

## Produção

| Recurso | Valor |
|---------|-------|
| **URL** | https://supersendapp.web.app |
| **Projeto Firebase** | `studio-9597335049-1a59a` |
| **Firestore Database** | `supersend-bd` (nomeado) |
| **Storage Bucket** | `gs://supervideo-stg` |
| **Functions Codebase** | `supersend` |
| **Hosting Target** | `supersend` → site `supersendapp` |
| **Mailgun Domain** | `mg.promocaohp.com.br` |
| **Mailgun Domains Ativos** | `mg.fatosocial.com`, `mg.promocaohp.com.br`, `mg.fatosocial.com.br` |

## Licença

Privado - Todos os direitos reservados.
