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
- **Dashboard**: Visão geral com métricas reais do Firestore (contatos, emails enviados, taxa de entrega, abertura, clique e rejeição)
- **Listas de Contatos**: Organização de contatos em listas separadas, importação CSV (separador ;), download de template CSV
- **Campanhas**: Criação com seleção de template, escolha de lista de contatos, preenchimento de variáveis, preview ao vivo 50/50 e envio via Mailgun
- **Templates**: Editor dedicado com color picker (4 cores), editor HTML, variáveis com validação (obrigatórias/opcionais) e preview ao vivo 50/50
- **Analytics**: Métricas detalhadas de envio, entrega, abertura, cliques, rejeições, spam complaints e descadastros (dados de webhooks Mailgun)
- **Configurações**: Gerenciamento de conta, email settings, segurança e notificações
- **Performance**: Lazy loading de páginas, code splitting por vendor (React, Firebase, React Query)

## Estrutura

```
supersend/
├── src/                        # Frontend React
│   ├── components/             # Componentes reutilizáveis
│   │   ├── auth/               # LoginForm, RegisterForm, VerifyEmailForm
│   │   ├── layout/             # Sidebar, Header, DashboardLayout, AuthLayout
│   │   └── ui/                 # Button, Input, Card, ConfirmModal
│   ├── hooks/                  # React Query hooks
│   │   ├── useAuth.ts          # Autenticação
│   │   ├── useCampaigns.ts     # CRUD + envio de campanhas
│   │   ├── useContactLists.ts  # Listas de contatos + contatos em cada lista
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
│   │       ├── contactLists.ts # Listas de contatos + contatos por lista
│   │       ├── settings.ts     # Configurações do usuário
│   │       ├── storage.ts      # Upload/delete de logos (Firebase Storage)
│   │       └── templates.ts    # CRUD + extração de variáveis
│   ├── pages/                  # Páginas da aplicação
│   │   ├── DashboardPage.tsx   # Métricas reais + campanhas recentes
│   │   ├── ContactListsPage.tsx # Gerenciamento de listas de contatos
│   │   ├── ListContactsPage.tsx # Contatos de uma lista específica
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
| `/contacts` | ContactListsPage | Gerenciamento de listas de contatos |
| `/contacts/:listId` | ListContactsPage | Contatos de uma lista específica |
| `/campaigns` | CampaignsPage | Lista de campanhas |
| `/campaigns/new` | CampaignEditorPage | Criar nova campanha |
| `/campaigns/:campaignId/edit` | CampaignEditorPage | Editar campanha existente |
| `/templates` | TemplatesPage | Lista de templates |
| `/templates/new` | TemplateEditorPage | Criar novo template |
| `/templates/:templateId/edit` | TemplateEditorPage | Editar template existente |
| `/analytics` | AnalyticsPage | Métricas detalhadas |
| `/settings` | SettingsPage | Configurações |
| `/login` | LoginPage | Login |
| `/register` | RegisterPage | Cadastro |
| `/verify-email` | VerifyEmailPage | Verificação de email |

## Fluxo de Trabalho

### Listas de Contatos → Templates → Campanhas

1. **Criar lista de contatos** em `/contacts`: criar lista, baixar template CSV, importar contatos via CSV (separador `;`)
2. **Criar template** em `/templates/new`: definir HTML, cores (color picker), assunto e testar com variáveis de preview
3. **Criar campanha** em `/campaigns/new`: selecionar template, **escolher lista de contatos**, preencher variáveis obrigatórias e enviar
4. Variáveis opcionais não preenchidas (logo, unsubscribe, etc.) são **automaticamente removidas** do HTML final — sem `{{placeholder}}` visível

### Importação de Contatos via CSV

O template CSV usa **ponto e vírgula (;)** como separador para compatibilidade com Excel brasileiro:

```csv
email;firstName;lastName;company;tags
joao@email.com;João;Silva;Empresa X;cliente,vip
maria@email.com;Maria;Santos;;lead
```

### Variáveis do Template

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `{{company}}` | Obrigatória | Nome da empresa |
| `{{title}}` | Obrigatória | Título do email |
| `{{content}}` | Obrigatória | Conteúdo principal |
| `{{cta_text}}` | Opcional | Texto do botão CTA (botão removido se vazio) |
| `{{cta_url}}` | Opcional | URL do botão CTA (botão removido se vazio) |
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

- **Bucket**: `gs://supersend-stg`
- **Frontend**: `getStorage(app, "gs://supersend-stg")` em `src/lib/firebase.ts`

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
| `mailgunWebhook` | HTTP | Recebe webhooks do Mailgun (opens, clicks, bounces, etc.) |
| `listMyContactLists` | Callable | Lista as `contactLists` do usuário autenticado (consumida pelo SuperLeed) |
| `importLeadsFromSuperLeed` | Callable | Importa leads enviados pelo SuperLeed como contatos em uma lista |
| `generateTemplateFromUrl` | Callable | Gera um template de email a partir de uma URL de referência (extrai logo, paleta e fonte da marca) |

### Integração com SuperLeed

O **[SuperLeed](../superleed)** captura leads (Google Places + scraping de email) e os envia ao SuperSend para virarem contatos prontos para campanha.

**Mecanismo:** ambos rodam no mesmo projeto Firebase (`studio-9597335049-1a59a`) e compartilham Firebase Auth — o token do usuário logado autentica as duas callables abaixo.

**Callables expostas:**

- **`listMyContactLists`** (`onCall`)
  - Auth obrigatório.
  - Retorna `{ lists: [{ id, name, description, contactCount }] }` — apenas listas do `uid` chamador.
  - Usada pelo SuperLeed para popular o seletor "Lista de destino".

- **`importLeadsFromSuperLeed`** (`onCall`)
  - Auth obrigatório.
  - Payload:
    ```ts
    {
      leads: SuperLeedLeadInput[],          // máx 5000
      target:
        | { mode: "existing", listId: string }
        | { mode: "new", name: string, description?: string },
      source?: { searchId?: string, query?: string }
    }
    ```
  - Comportamento:
    - Valida ownership da lista (quando `existing`).
    - Cria a lista nova (quando `new`).
    - Filtra leads sem email válido (regex padrão).
    - Dedupe por email (case-insensitive) dentro do payload **e** contra contatos já presentes na lista.
    - Escreve em batches de 500 e atualiza `contactCount` via `increment`.
  - Retorno: `{ success, listId, listName, imported, skipped, withoutEmail, duplicates }`.

**Mapeamento Lead → Contact:**

| Contact | Origem |
|---|---|
| `email` | `lead.email` (lowercase, validado por regex) |
| `company` | `cnpjData.nomeFantasia ?? cnpjData.razaoSocial ?? lead.name` |
| `tags` | `["superleed", "query:<query>"]` |
| `customFields` | `source`, `searchId`, `cnpj`, `phone`, `website`, `address`, `googleMapsUrl`, `completenessScore`, `rating` (todos opcionais) |
| `unsubscribed` / `bounced` | `false` |

**Implementação:** `functions/src/integrations/superleed.ts` (`importLeadsToList`) + handlers em `functions/src/index.ts`.

### Mailgun Webhook Setup

O webhook `mailgunWebhook` recebe eventos assíncronos do Mailgun e atualiza os documentos `sentEmails` no Firestore. Eventos suportados:

| Evento | Ação |
|--------|------|
| `delivered` | Marca email como entregue |
| `opened` | Marca como aberto + conta aberturas |
| `clicked` | Marca como clicado + conta cliques + salva URL |
| `bounced`/`failed` | Marca status como "bounced" + marca contato como bounced (se permanente) |
| `complained` | Marca como spam complaint |
| `unsubscribed` | Marca contato como unsubscribed |

**Configuração:**

1. Definir o signing key nas functions:
```bash
firebase functions:secrets:set MAILGUN_WEBHOOK_SIGNING_KEY --project your_project_id
```
O signing key está no Mailgun Dashboard → Settings → API Keys → HTTP Webhook Signing Key.

2. Configurar webhooks no Mailgun Dashboard → Sending → Webhooks:
   - URL: `https://us-central1-<PROJECT_ID>.cloudfunctions.net/mailgunWebhook`
   - Eventos: Delivered, Opened, Clicked, Bounced/Failed, Complained, Unsubscribed

3. Ativar tracking no Mailgun Dashboard → Sending → Domain Settings → Tracking:
   - Opens tracking: **ON**
   - Clicks tracking: **ON**
   - Unsubscribes tracking: **ON**

## Gerar Template a partir de URL

Página dedicada (rota `/templates/new/from-url`, botão **"Gerar de URL"** em `/templates`) que cria um template de email aplicando a identidade visual de qualquer site público.

**Como funciona:**

1. Usuário cola a URL (ex: `https://exemplo.com.br`) e clica **"Buscar marca"**.
2. A callable `generateTemplateFromUrl` baixa a HTML server-side (com proteção SSRF) e extrai via cheerio:
   - **Logo** (preferência: `og:logo` → `apple-touch-icon` → `og:image` → `link rel=icon` → `<img>` no `<header>` → `/favicon.ico`).
   - **Nome da marca** (`og:site_name` → `<title>` → hostname).
   - **Cor primária** (`<meta name="theme-color">` → fundo de `header`/`button` em `<style>` → cor não-neutra mais frequente em `style=` inline).
   - **Cores de título/corpo/fundo** (de seletores `h1`/`h2`/`body`/`html` no CSS inline).
   - **Font-family** (de `body` no CSS, com fallback web-safe).
3. O HTML gerado usa um layout email-safe (tabelas + CSS inline) com a paleta extraída e mantém as variáveis `{{title}}`, `{{content}}`, `{{cta_text}}`, `{{cta_url}}`, `{{logo_url}}`, `{{company}}`, `{{subject}}`, etc. — totalmente compatível com `processCampaign`.
4. Usuário pode ajustar cores via color pickers, escolhe título, conteúdo, CTA, e salva. O template aparece em `/templates` e pode ser editado normalmente.

**Limites e proteções:**

- Apenas URLs `http(s)` públicas — IPs privados/loopback são bloqueados (SSRF guard).
- Timeout de 8s e limite de 2MB no body.
- Rate limit de 1 chamada / 5s por usuário (in-memory por instância).
- SPAs renderizadas só via JS (sem SSR) caem nos defaults (parser não executa JS).

**Por que não copiamos CSS do site direto:** clientes de email (Gmail, Outlook, Apple Mail) removem `<link>`, têm suporte parcial a `<style>` e não suportam flexbox/grid. Aplicar a marca a um layout email-safe pré-validado é a abordagem usada por Mailchimp, Brevo e similares.

## Firestore Collections

```
users/{userId}
├── contactLists/       # Listas de contatos
│   └── {listId}/
│       └── contacts/   # Contatos pertencentes à lista
├── campaigns/          # Campanhas de email
├── templates/          # Templates de email
└── sentEmails/         # Log de emails enviados (status, messageId, delivered, opened, clicked, bounced, complained)
```

### Estrutura de Listas de Contatos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome da lista |
| `description` | string? | Descrição opcional |
| `contactCount` | number | Número de contatos na lista |
| `createdAt` | Timestamp | Data de criação |
| `updatedAt` | Timestamp | Última atualização |

### Estrutura de Contatos (dentro de cada lista)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `email` | string | Email do contato (obrigatório) |
| `firstName` | string | Nome do contato |
| `lastName` | string | Sobrenome do contato |
| `company` | string | Empresa do contato |
| `tags` | string[] | Tags para segmentação |
| `customFields` | Record<string, string> | Campos personalizados |
| `unsubscribed` | boolean | Se o contato cancelou inscrição |
| `bounced` | boolean | Se o email retornou erro |
| `createdAt` | Timestamp | Data de criação |
| `updatedAt` | Timestamp | Última atualização |

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
| **Storage Bucket** | `gs://supersend-stg` |
| **Functions Codebase** | `supersend` |
| **Hosting Target** | `supersend` → site `supersendapp` |
| **Mailgun Domain** | `mg.promocaohp.com.br` |
| **Mailgun Domains Ativos** | `mg.fatosocial.com`, `mg.promocaohp.com.br`, `mg.fatosocial.com.br` |

## Licença

Privado - Todos os direitos reservados.
