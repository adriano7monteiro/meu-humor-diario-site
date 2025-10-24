# 🚀 Deploy Rápido - Humor Diário no Heroku

## ⚡ Início Rápido (30 minutos)

### 🎯 Método Recomendado: Buildpack Subdir

Este método permite fazer deploy direto do repositório raiz, sem precisar separar backend e frontend.

---

## 📦 O que você vai precisar:

1. ✅ Conta Heroku (https://signup.heroku.com/)
2. ✅ Heroku CLI (https://devcenter.heroku.com/articles/heroku-cli)
3. ✅ MongoDB Atlas (https://www.mongodb.com/cloud/atlas/register)

---

## 🔥 Deploy em 3 Passos

### PASSO 1: Backend (10 min)

```bash
# Login
heroku login

# Criar app
heroku create humor-diario-backend

# Configurar buildpacks (IMPORTANTE!)
heroku buildpacks:add https://github.com/timanovsky/subdir-heroku-buildpack -a humor-diario-backend
heroku buildpacks:add heroku/python -a humor-diario-backend

# Apontar para pasta do backend
heroku config:set PROJECT_PATH=backend -a humor-diario-backend

# Configurar variáveis (substitua pelos seus valores)
heroku config:set \
  MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/" \
  DB_NAME="mental_health_app" \
  JWT_SECRET_KEY="chave-secreta-aqui" \
  STRIPE_API_KEY="sk_test_..." \
  EMERGENT_LLM_KEY="sk-emergent-..." \
  -a humor-diario-backend

# Deploy!
git push heroku main

# Testar
curl https://humor-diario-backend.herokuapp.com/api/
```

### PASSO 2: Frontend (10 min)

```bash
# Criar app
heroku create humor-diario-frontend

# Configurar buildpacks
heroku buildpacks:add https://github.com/timanovsky/subdir-heroku-buildpack -a humor-diario-frontend
heroku buildpacks:add heroku/nodejs -a humor-diario-frontend

# Apontar para pasta do frontend
heroku config:set PROJECT_PATH=frontend -a humor-diario-frontend

# Configurar variáveis
heroku config:set \
  EXPO_PUBLIC_BACKEND_URL="https://humor-diario-backend.herokuapp.com" \
  NODE_ENV="production" \
  -a humor-diario-frontend

# Deploy!
git push heroku main

# Abrir no navegador
heroku open -a humor-diario-frontend
```

### PASSO 3: MongoDB Atlas (5 min)

1. Criar conta: https://www.mongodb.com/cloud/atlas/register
2. Criar cluster M0 (GRÁTIS)
3. Database Access → Criar usuário
4. Network Access → Adicionar IP: `0.0.0.0/0`
5. Copiar connection string
6. Atualizar no Heroku:
   ```bash
   heroku config:set MONGO_URL="sua-connection-string" -a humor-diario-backend
   ```

---

## ✅ Pronto! Seu App Está no Ar!

- 🎨 **Frontend**: https://humor-diario-frontend.herokuapp.com
- ⚙️ **Backend**: https://humor-diario-backend.herokuapp.com/api/

---

## 📚 Documentação Completa

- **[MONOREPO_DEPLOY_GUIDE.md](MONOREPO_DEPLOY_GUIDE.md)** - 3 métodos diferentes de deploy
- **[HEROKU_DEPLOY_GUIDE.md](HEROKU_DEPLOY_GUIDE.md)** - Guia detalhado passo a passo
- **[HEROKU_CHECKLIST.md](HEROKU_CHECKLIST.md)** - Checklist para acompanhar

---

## 🔧 Comandos Úteis

```bash
# Ver logs em tempo real
heroku logs --tail -a humor-diario-backend
heroku logs --tail -a humor-diario-frontend

# Reiniciar apps
heroku restart -a humor-diario-backend
heroku restart -a humor-diario-frontend

# Ver variáveis de ambiente
heroku config -a humor-diario-backend

# Abrir no navegador
heroku open -a humor-diario-frontend
```

---

## 💰 Custos

- **Heroku Eco Dynos**: $5/mês por app = $10/mês total
- **MongoDB Atlas M0**: GRATUITO
- **Total**: ~$10 USD/mês

---

## ❓ Precisa de Ajuda?

### Erro comum: "Procfile not found"
```bash
# Verificar buildpacks
heroku buildpacks -a seu-app

# Deve ter 2 buildpacks:
# 1. subdir-heroku-buildpack
# 2. heroku/python (backend) ou heroku/nodejs (frontend)
```

### Frontend não conecta
```bash
# Verificar URL do backend
heroku config:get EXPO_PUBLIC_BACKEND_URL -a humor-diario-frontend

# Deve ser sem /api no final:
# ✅ https://humor-diario-backend.herokuapp.com
# ❌ https://humor-diario-backend.herokuapp.com/api
```

---

## 🎯 Alternativas ao Heroku

Se preferir plataformas gratuitas:

1. **Render.com** - Tem plano gratuito
2. **Railway.app** - $5 crédito/mês grátis
3. **Fly.io** - Plano gratuito disponível

Veja: [HEROKU_DEPLOY_GUIDE.md](HEROKU_DEPLOY_GUIDE.md) para comparação.

---

## 📂 Estrutura dos Arquivos Criados

```
humor-diario/
├── backend/
│   ├── Procfile              ✅ Configurado
│   ├── runtime.txt           ✅ Python 3.11
│   └── requirements.txt      ✅ Atualizado
│
├── frontend/
│   ├── Procfile              ✅ Configurado
│   └── package.json          ✅ Scripts de build
│
├── heroku-setup.sh           ✅ Script auxiliar
├── heroku-backend.yml        ✅ Config alternativa
├── heroku-frontend.yml       ✅ Config alternativa
│
└── Guias de Deploy:
    ├── QUICK_START.md        ← Você está aqui!
    ├── MONOREPO_DEPLOY_GUIDE.md
    ├── HEROKU_DEPLOY_GUIDE.md
    └── HEROKU_CHECKLIST.md
```

---

## ✨ Tudo Pronto!

Todos os arquivos necessários já foram criados. Basta seguir os 3 passos acima e seu app estará no ar! 🚀

**Tempo estimado**: 30 minutos
**Dificuldade**: ⭐⭐☆☆☆ (Fácil)

---

**Dúvidas?** Consulte os guias detalhados ou abra uma issue no GitHub.
