# 🚀 Guia de Deploy para Railway - CAAR MOBIL 2026

## ✅ Pré-requisitos Verificados

- ✅ `railway.json` configurado
- ✅ Scripts de build e start prontos
- ✅ Prisma configurado
- ✅ Socket.io configurado
- ✅ Sistema de presença online implementado
- ✅ PWA configurado

---

## 📋 Passo a Passo para Deploy

### 1️⃣ **Preparar o Projeto**

Certifique-se de que está na pasta do projeto:
```bash
cd "c:\Users\CALL MOBILE\Pictures\CAAR-MOBIL-2026-main\CAAR-MOBIL-2026-main"
```

### 2️⃣ **Criar Conta no Railway**

1. Acesse: https://railway.app
2. Clique em **"Start a New Project"**
3. Faça login com GitHub (recomendado)

### 3️⃣ **Criar Banco de Dados PostgreSQL**

1. No Railway, clique em **"+ New"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. Aguarde a criação (leva ~30 segundos)
4. Copie a **DATABASE_URL** que aparecerá nas variáveis

### 4️⃣ **Deploy do Projeto**

**Opção A: Deploy via GitHub (Recomendado)**

1. Suba seu código para o GitHub:
```bash
git init
git add .
git commit -m "Deploy CAAR MOBIL 2026"
git branch -M main
git remote add origin SEU_REPOSITORIO_GITHUB
git push -u origin main
```

2. No Railway:
   - Clique em **"+ New"** → **"GitHub Repo"**
   - Selecione seu repositório
   - Railway detectará automaticamente o `railway.json`

**Opção B: Deploy via Railway CLI**

1. Instale o Railway CLI:
```bash
npm i -g @railway/cli
```

2. Faça login:
```bash
railway login
```

3. Inicialize o projeto:
```bash
railway init
```

4. Faça o deploy:
```bash
railway up
```

### 5️⃣ **Configurar Variáveis de Ambiente**

No painel do Railway, vá em **"Variables"** e adicione:

```env
# Banco de Dados (já deve estar configurado automaticamente)
DATABASE_URL=postgresql://...

# Porta (Railway define automaticamente)
PORT=${{PORT}}

# Node Environment
NODE_ENV=production

# Configurações do Sistema
ADMIN_EMAIL=seu-email@exemplo.com
```

### 6️⃣ **Executar Migrações do Prisma**

O Railway executará automaticamente:
```bash
npx prisma db push
```

Isso acontece no comando `npm start` definido no `package.json`.

### 7️⃣ **Verificar Deploy**

1. Aguarde o build completar (~3-5 minutos)
2. Railway fornecerá uma URL: `https://seu-projeto.up.railway.app`
3. Acesse a URL e teste o login

---

## 🔧 Configurações Importantes

### **Healthcheck**
O Railway verificará `/api/test` a cada 120 segundos para garantir que o servidor está ativo.

### **Restart Policy**
Configurado para reiniciar automaticamente em caso de falha.

### **Build Command**
```bash
npm run build
```
Isso executa:
1. `npx prisma generate` - Gera o Prisma Client
2. `vite build` - Compila o frontend
3. `npm run server:build` - Compila o backend

### **Start Command**
```bash
npm start
```
Isso executa:
1. `npx prisma db push` - Sincroniza o banco de dados
2. `node dist-server/index.cjs` - Inicia o servidor

---

## 🎯 Funcionalidades que Funcionarão no Railway

✅ **Sistema de Login** - Autenticação completa
✅ **Gestão de Produtos** - CRUD completo
✅ **Ordens de Serviço** - Gerenciamento de serviços
✅ **Finanças** - Controle financeiro
✅ **Equipe** - Gestão de usuários
✅ **Presença Online** - Rastreamento em tempo real via Socket.io
✅ **Notificações** - Sistema de notificações em tempo real
✅ **PWA** - Instalável como aplicativo
✅ **Temas** - Modo claro/escuro
✅ **Multi-idioma** - PT/EN

---

## 🔒 Segurança

- ✅ Senhas criptografadas com bcrypt
- ✅ Soft delete de usuários
- ✅ Sistema de permissões (Admin/Manager/Employee)
- ✅ Logs de auditoria
- ✅ Conexão segura com PostgreSQL

---

## 📊 Monitoramento

Após o deploy, você pode monitorar:
- **Logs em tempo real** no painel do Railway
- **Uso de recursos** (CPU, RAM, Network)
- **Uptime** e disponibilidade
- **Métricas de requisições**

---

## 🆘 Solução de Problemas

### Build falhou?
```bash
# Verifique os logs no Railway
# Geralmente é falta de memória ou dependências
```

### Banco de dados não conecta?
```bash
# Verifique se a DATABASE_URL está correta
# Certifique-se de que o PostgreSQL foi criado
```

### Socket.io não funciona?
```bash
# Railway suporta WebSockets nativamente
# Certifique-se de que CORS está configurado corretamente
```

---

## 🎉 Pronto!

Seu sistema **CAAR MOBIL 2026** estará disponível 24/7 no Railway!

**URL de Produção:** `https://seu-projeto.up.railway.app`

**Login Padrão:**
- Email: `admin@callmobile.com`
- Senha: `admin123`

⚠️ **IMPORTANTE:** Altere a senha do admin após o primeiro login!

---

## 💰 Custos

Railway oferece:
- **$5 de crédito grátis por mês** (suficiente para projetos pequenos)
- **Plano Hobby:** $5/mês para projetos pessoais
- **Plano Pro:** $20/mês para produção

Seu projeto deve consumir ~$3-5/mês dependendo do tráfego.

---

## 📞 Suporte

Desenvolvido por: **Redwall Security**
- Email: sredwall07@gmail.com
- Tel: 874311477 / 834796764

---

**Boa sorte com o deploy! 🚀**
