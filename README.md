# CAAR-MOBIL - Sistema de Gestão

Sistema completo de gestão de inventário, vendas, serviços e finanças para CAAR MOBIL.

## 🚀 Deploy no Railway

### Pré-requisitos
- Conta no [Railway](https://railway.app)
- Conta no GitHub

### Passos para Deploy

1. **Criar Projeto no Railway**
   - Acesse [Railway](https://railway.app)
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Escolha o repositório `CAAR-MOBIL-VERSAOFINAL`

2. **Adicionar PostgreSQL**
   - No projeto Railway, clique em "+ New"
   - Selecione "Database" → "PostgreSQL"
   - O Railway criará automaticamente a variável `DATABASE_URL`

3. **Configurar Variáveis de Ambiente**
   No Railway, adicione as seguintes variáveis:
   ```
   NODE_ENV=production
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=mobileicaar@gmail.com
   SMTP_PASS=sua-senha-de-app
   ```

4. **Deploy Automático**
   - O Railway detectará automaticamente o `railway.json` e `nixpacks.toml`
   - O build será executado automaticamente
   - Aguarde o deploy completar

5. **Acessar Aplicação**
   - O Railway fornecerá uma URL pública
   - Acesse a URL para usar o sistema

## 📦 Instalação Local

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma generate
npx prisma db push

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar produção
npm start
```

## 🔧 Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express + Node.js
- **Database**: PostgreSQL (Prisma ORM)
- **Real-time**: Socket.IO
- **Mobile**: Capacitor
- **Desktop**: Electron

## 📝 Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

- `DATABASE_URL`: URL de conexão PostgreSQL
- `SMTP_HOST`: Servidor SMTP para emails
- `SMTP_PORT`: Porta SMTP
- `SMTP_USER`: Email para envio
- `SMTP_PASS`: Senha do email

## 🎯 Funcionalidades

- ✅ Gestão de Produtos e Inventário
- ✅ Controle de Vendas
- ✅ Ordens de Serviço
- ✅ Gestão Financeira
- ✅ Relatórios e Análises
- ✅ Sistema de Usuários e Permissões
- ✅ Notificações em Tempo Real
- ✅ Assistente Virtual (Robot)
- ✅ PWA (Progressive Web App)
- ✅ Suporte Mobile (Android/iOS)

## 📱 Build Mobile

```bash
# Sincronizar com Capacitor
npm run mobile:sync

# Abrir Android Studio
npm run mobile:open:android

# Abrir Xcode
npm run mobile:open:ios
```

## 🖥️ Build Desktop

```bash
# Build Electron
npm run electron:build
```

## 📄 Licença

Propriedade de CAAR MOBIL © 2026
