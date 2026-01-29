# 📱 Guia de Conversão para Aplicativo Mobile - CAAR MOBIL

Este documento contém as instruções detalhadas para transformar o sistema CAAR MOBIL em um aplicativo nativo para Android e iOS utilizando o **Capacitor**.

## ✅ O que já foi configurado
1. **Capacitor Core & CLI:** Instalados.
2. **Plataformas:** Diretórios `android/` e `ios/` criados com sucesso.
3. **Página de Administração:** Adicionados botões de download na aba de Configurações do Administrador.
4. **capacitor.config.ts:** Configurado com o ID `com.callmobile.caarmobil`.

---

## 🛠️ Como Gerar os Aplicativos (Builds)

### 1. Preparação dos Arquivos Web
Sempre que você alterar o código do React, execute:
```bash
npm run mobile:sync
```
*Isso compila o React e sincroniza os arquivos com as pastas nativas.*

### 2. Gerar APK para Android
1. Certifique-se de ter o **Android Studio** instalado.
2. No VS Code / Terminal, execute:
   ```bash
   npm run mobile:open:android
   ```
3. No Android Studio:
   - Vá em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - O Android Studio gerará o arquivo e exibirá uma notificação para "Locate APK".
4. **Para o Botão do Admin funcionar:**
   - Copie o arquivo gerado para: `public/downloads/caarmobil-latest.apk`.
   - Após o deploy do site, os administradores poderão baixá-lo diretamente.

### 3. Gerar App para iOS (Necessário Mac)
1. Certifique-se de ter o **Xcode** instalado.
2. No terminal do Mac, execute:
   ```bash
   npm run mobile:open:ios
   ```
3. No Xcode:
   - Configure sua conta de desenvolvedor em **Signing & Capabilities**.
   - Conecte um iPhone físico ou use um simulador.
   - Clique no botão **Play** (Run).

---

## 🎨 Personalização (Ícone e Splash Screen)
Para gerar todos os tamanhos de ícones automaticamente:
1. Coloque um ícone de no mínimo 1024x1024px em `assets/logo.png`.
2. Instale a ferramenta de assets:
   ```bash
   npm install @capacitor/assets --save-dev
   ```
3. Execute o comando de geração:
   ```bash
   npx capacitor-assets generate
   ```

---

## 🚀 Acesso a Funcionalidades Nativas (Futuro)
Como o app usa Capacitor, você pode adicionar plugins a qualquer momento para acessar hardware:
- **Câmera:** `npm install @capacitor/camera`
- **Notificações Push:** `npm install @capacitor/push-notifications`
- **Geolocalização:** `npm install @capacitor/geolocation`

---

## 🔗 Link de Download no Painel Admin
A área de **Configurações > Segurança** agora contém uma nova seção: **"Aplicativo Mobile"**.
- O botão de **Android** busca o arquivo em `/downloads/caarmobil-latest.apk`.
- O botão de **iOS** aponta para o TestFlight (ajuste o link conforme necessário no arquivo `src/components/AdminSettings.tsx`).
