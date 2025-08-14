# 🚀 Guia de Deploy - CSV AI Processor

## 📋 Visão Geral
Este guia detalha as três opções de deploy disponíveis para o CSV AI Processor:

1. **🌐 Web App (Vercel)** - Deploy na nuvem
2. **🖥️ Desktop App (Electron)** - Aplicativo nativo
3. **💼 SaaS Features** - Recursos empresariais

---

## 🌐 1. Deploy Web (Vercel)

### Pré-requisitos
- Conta no GitHub
- Conta no Vercel (gratuita)
- Repositório Git configurado

### Passos para Deploy

1. **Preparar o repositório:**
```bash
git init
git add .
git commit -m "Initial commit - CSV AI Processor"
git remote add origin https://github.com/seu-usuario/csv-ai-processor.git
git push -u origin main
```

2. **Deploy no Vercel:**
- Acesse [vercel.com](https://vercel.com)
- Conecte sua conta GitHub
- Selecione o repositório `csv-ai-processor`
- Configure as variáveis de ambiente:
  - `OPENAI_API_KEY`: Sua chave da OpenAI
  - `NODE_ENV`: production

3. **Configuração automática:**
O arquivo `vercel.json` já está configurado com:
- Roteamento correto para API e arquivos estáticos
- Configurações de build otimizadas
- Headers de segurança

### URL de Produção
Após o deploy, você receberá uma URL como:
`https://csv-ai-processor-seu-hash.vercel.app`

---

## 🖥️ 2. Desktop App (Electron)

### Instalação das Dependências
```bash
npm install electron electron-builder --save-dev
```

### Comandos Disponíveis

**Executar em modo desenvolvimento:**
```bash
npm run electron-dev
```

**Build para produção:**
```bash
npm run electron-build
```

**Empacotamento por plataforma:**
```bash
# Windows
npm run electron-pack-win

# macOS
npm run electron-pack-mac

# Linux
npm run electron-pack-linux
```

### Recursos do Desktop App
- ✅ Interface otimizada para desktop
- ✅ Funciona offline (após configuração inicial)
- ✅ Integração com sistema de arquivos
- ✅ Notificações nativas
- ✅ Auto-updater configurado

### Distribuição
Os arquivos de instalação serão gerados em:
- Windows: `dist/CSV AI Processor Setup.exe`
- macOS: `dist/CSV AI Processor.dmg`
- Linux: `dist/CSV AI Processor.AppImage`

---

## 💼 3. SaaS Features

### Recursos Implementados

#### 🔐 Rate Limiting
- Limite de requisições por IP
- Configurável via ambiente
- Prevenção contra abuso

#### 📊 Analytics Dashboard
- Estatísticas de uso em tempo real
- Métricas de sucesso/erro
- Análise por tipo de operação
- Acesse: `http://localhost:3000/dashboard.html`

#### 🛡️ Security Middleware
- Headers de segurança (Helmet)
- Compressão de resposta
- Proteção CORS configurável

#### 📈 Monitoring
- Endpoint de health check: `/api/health`
- Endpoint de estatísticas: `/api/stats`
- Logs estruturados

### Configuração SaaS

1. **Variáveis de Ambiente (.env):**
```env
OPENAI_API_KEY=sua_chave_aqui
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://seu-dominio.com
```

2. **Executar com recursos SaaS:**
```bash
npm start
```

3. **Monitoramento:**
- Dashboard: `http://localhost:3000/dashboard.html`
- API Stats: `http://localhost:3000/api/stats`
- Health Check: `http://localhost:3000/api/health`

---

## 🔧 Configurações Avançadas

### Customização de Rate Limiting
```javascript
// middleware/rateLimiter.js
const windowMs = process.env.RATE_LIMIT_WINDOW_MS || 900000; // 15 minutos
const maxRequests = process.env.RATE_LIMIT_MAX_REQUESTS || 100;
```

### Configuração de CORS
```javascript
// server.js
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
};
```

### Analytics Customizadas
```javascript
// utils/statsManager.js
// Adicione suas próprias métricas personalizadas
```

---

## 📚 Scripts NPM Disponíveis

```json
{
  "dev": "nodemon server.js",
  "start": "node server.js",
  "electron-dev": "concurrently \"npm run dev\" \"electron .\"",
  "electron-build": "electron-builder",
  "electron-pack-win": "electron-builder --win",
  "electron-pack-mac": "electron-builder --mac",
  "electron-pack-linux": "electron-builder --linux",
  "vercel-build": "echo 'Build completed'",
  "deploy": "vercel --prod"
}
```

---

## 🌟 Próximos Passos

### Para Web App
1. Configurar domínio customizado no Vercel
2. Implementar analytics (Google Analytics/Mixpanel)
3. Adicionar sistema de feedback

### Para Desktop App
1. Configurar auto-updater
2. Adicionar notificações push
3. Integração com sistema de arquivos local

### Para SaaS
1. Sistema de assinatura/billing
2. Autenticação de usuário
3. API keys personalizadas
4. Dashboard administrativo

---

## 🆘 Troubleshooting

### Problemas Comuns

**1. Erro de Deploy no Vercel:**
- Verificar se `OPENAI_API_KEY` está configurada
- Confirmar se `vercel.json` está correto

**2. Electron não inicializa:**
- Executar `npm run electron-dev` primeiro
- Verificar se todas as dependências estão instaladas

**3. Rate Limiting muito restritivo:**
- Ajustar variáveis em `.env`
- Verificar configuração em `middleware/rateLimiter.js`

### Logs e Debugging
```bash
# Verificar logs do servidor
npm run dev

# Debug do Electron
npm run electron-dev
# Abrir DevTools: Ctrl+Shift+I
```

---

## 🌐 Outras opções de Deploy:

### Railway (Simples)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Render (Gratuito)
- Conecte seu GitHub
- Auto-deploy automático

### Heroku (Pago)
```bash
npm install -g heroku
heroku create seu-app-csv-ia
git push heroku main
```

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs no console
2. Consultar documentação da API OpenAI
3. Revisar configurações de ambiente

**Sucesso no seu deploy! 🚀**
