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
- **Dashboard**: Visão geral com métricas (contatos, campanhas, taxa de abertura, taxa de clique)
- **Contatos**: CRUD completo com importação, busca e tags
- **Campanhas**: Criação, agendamento e envio de campanhas de email
- **Templates**: Editor de templates de email reutilizáveis
- **Analytics**: Métricas detalhadas de envio, abertura e cliques
- **Configurações**: Gerenciamento de conta e preferências

## Estrutura

```
supersend/
├── src/                    # Frontend React
│   ├── components/         # Componentes reutilizáveis
│   │   ├── auth/           # LoginForm, RegisterForm, VerifyEmailForm
│   │   ├── dashboard/      # Componentes do dashboard
│   │   ├── layout/         # Sidebar, Header, DashboardLayout, AuthLayout
│   │   └── ui/             # Button, Input, Card
│   ├── hooks/              # useAuth, useToast
│   ├── lib/                # Firebase config
│   ├── pages/              # Páginas da aplicação
│   ├── stores/             # Zustand stores (auth, ui)
│   └── types/              # TypeScript types
├── functions/              # Firebase Functions (Node.js 20)
│   └── src/
│       ├── index.ts        # Entry point (6 functions exportadas)
│       ├── auth/           # Verificação de email
│       └── email/          # Integração Mailgun
├── firebase.json           # Config Firebase (codebase: supersend)
├── firestore.rules         # Regras de segurança Firestore
└── firestore.indexes.json  # Índices Firestore
```

## Firebase Functions

| Função | Tipo | Descrição |
|--------|------|-----------|
| `onUserCreated` | Auth trigger | Cria documento do usuário e envia código de verificação |
| `verifyEmail` | Callable | Valida o código de 6 dígitos |
| `resendVerification` | Callable | Reenvia código de verificação |
| `sendSingleEmail` | Callable | Envia email individual via Mailgun |
| `processCampaign` | Callable | Processa e envia campanha para lista de contatos |
| `processScheduledCampaigns` | Scheduled | Verifica e envia campanhas agendadas (a cada 5 min) |

> **Codebase**: `supersend` — as functions são isoladas de outros apps no mesmo projeto Firebase.

## Setup Local

### Pré-requisitos

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Conta Firebase com projeto Blaze

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

- **URL**: https://supersendapp.web.app
- **Projeto Firebase**: `studio-9597335049-1a59a`
- **Mailgun Domain**: `mg.promocaohp.com.br`

## Licença

Privado - Todos os direitos reservados.
