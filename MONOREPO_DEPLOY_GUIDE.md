# 🚀 Deploy Monorepo no Heroku - 3 Métodos

Seu repositório tem frontend e backend na mesma pasta. Existem **3 formas** de fazer deploy no Heroku:

---

## 📋 Estrutura do Projeto

```
humor-diario/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── Procfile
├── frontend/
│   ├── app/
│   ├── package.json
│   └── Procfile
├── heroku-setup.sh          ← Script de setup
├── heroku-backend.yml       ← Config backend
└── heroku-frontend.yml      ← Config frontend
```

---

## 🎯 MÉTODO 1: Buildpack Subdir (RECOMENDADO - Mais Fácil)

Este método usa um buildpack especial que aponta para as subpastas.

### Backend:

```bash
# 1. Criar app
heroku create humor-diario-backend

# 2. Adicionar buildpack de subdir
heroku buildpacks:add -a humor-diario-backend https://github.com/timanovsky/subdir-heroku-buildpack
heroku buildpacks:add -a humor-diario-backend heroku/python

# 3. Configurar pasta do backend
heroku config:set PROJECT_PATH=backend -a humor-diario-backend

# 4. Configurar variáveis de ambiente
heroku config:set MONGO_URL="mongodb+srv://..." -a humor-diario-backend
heroku config:set DB_NAME="mental_health_app" -a humor-diario-backend
heroku config:set JWT_SECRET_KEY="sua-chave-secreta" -a humor-diario-backend
heroku config:set STRIPE_API_KEY="sk_test_..." -a humor-diario-backend
heroku config:set EMERGENT_LLM_KEY="sk-emergent-..." -a humor-diario-backend

# 5. Deploy (do root do projeto)
git push heroku main

# 6. Testar
heroku open -a humor-diario-backend
```

### Frontend:

```bash
# 1. Criar app
heroku create humor-diario-frontend

# 2. Adicionar buildpack de subdir
heroku buildpacks:add -a humor-diario-frontend https://github.com/timanovsky/subdir-heroku-buildpack
heroku buildpacks:add -a humor-diario-frontend heroku/nodejs

# 3. Configurar pasta do frontend
heroku config:set PROJECT_PATH=frontend -a humor-diario-frontend

# 4. Configurar variáveis de ambiente
heroku config:set EXPO_PUBLIC_BACKEND_URL="https://humor-diario-backend.herokuapp.com" -a humor-diario-frontend
heroku config:set NODE_ENV="production" -a humor-diario-frontend

# 5. Deploy (do root do projeto)
git push heroku main

# 6. Testar
heroku open -a humor-diario-frontend
```

**✅ Vantagens:**
- Um único repositório Git
- Deploy direto do root
- Mais simples de gerenciar

---

## 🎯 MÉTODO 2: Git Subtree (Tradicional)

Este método cria branches separadas para cada app.

### Backend:

```bash
# 1. Criar app
heroku create humor-diario-backend

# 2. Configurar variáveis (mesmo do método 1)
heroku config:set MONGO_URL="..." -a humor-diario-backend
# ... outras configs

# 3. Deploy usando subtree
git subtree push --prefix backend heroku main

# Ou criar branch separada:
git subtree split --prefix backend -b backend-deploy
git push heroku backend-deploy:main
```

### Frontend:

```bash
# 1. Criar app
heroku create humor-diario-frontend

# 2. Configurar variáveis (mesmo do método 1)
heroku config:set EXPO_PUBLIC_BACKEND_URL="..." -a humor-diario-frontend

# 3. Deploy usando subtree
git subtree push --prefix frontend heroku main
```

**⚠️ Desvantagens:**
- Mais complexo
- Requer comandos especiais para cada deploy

---

## 🎯 MÉTODO 3: Script Automático (Experimental)

Usa o script `heroku-setup.sh` que copiamos criamos.

### Backend:

```bash
# 1. Criar app
heroku create humor-diario-backend

# 2. Configurar tipo de app
heroku config:set APP_TYPE=backend -a humor-diario-backend

# 3. Configurar outras variáveis
heroku config:set MONGO_URL="..." -a humor-diario-backend
# ... outras configs

# 4. Adicionar script ao Procfile (já feito)
# Procfile deve ter: release: bash heroku-setup.sh

# 5. Deploy
git push heroku main
```

### Frontend:

```bash
# Mesmo processo, mas com APP_TYPE=frontend
heroku create humor-diario-frontend
heroku config:set APP_TYPE=frontend -a humor-diario-frontend
heroku config:set EXPO_PUBLIC_BACKEND_URL="..." -a humor-diario-frontend
git push heroku main
```

---

## 🏆 Qual Método Escolher?

### Use MÉTODO 1 (Buildpack Subdir) se:
- ✅ Você quer o método mais simples
- ✅ Prefere um único repositório
- ✅ É sua primeira vez com Heroku
- 👉 **RECOMENDADO para 99% dos casos**

### Use MÉTODO 2 (Git Subtree) se:
- Você tem experiência com Git
- Precisa de controle granular
- Está seguindo documentação antiga

### Use MÉTODO 3 (Script) se:
- Você gosta de experimentar
- Quer aprender sobre scripts de build

---

## 📝 Exemplo Completo - MÉTODO 1 (RECOMENDADO)

### Passo 1: Preparar MongoDB Atlas (5 min)
```bash
1. Criar conta: https://www.mongodb.com/cloud/atlas/register
2. Criar cluster M0 (gratuito)
3. Criar usuário e senha
4. Liberar IP: 0.0.0.0/0
5. Copiar connection string
```

### Passo 2: Backend (10 min)
```bash
# Login no Heroku
heroku login

# Criar app
heroku create humor-diario-backend

# Buildpacks
heroku buildpacks:add https://github.com/timanovsky/subdir-heroku-buildpack -a humor-diario-backend
heroku buildpacks:add heroku/python -a humor-diario-backend

# Configurar pasta
heroku config:set PROJECT_PATH=backend -a humor-diario-backend

# Variáveis de ambiente
heroku config:set \
  MONGO_URL="mongodb+srv://user:password@cluster.mongodb.net/" \
  DB_NAME="mental_health_app" \
  JWT_SECRET_KEY="$(openssl rand -base64 32)" \
  STRIPE_API_KEY="sk_test_..." \
  EMERGENT_LLM_KEY="sk-emergent-55869Ff778123962f1" \
  -a humor-diario-backend

# Deploy
git add .
git commit -m "Setup backend"
git push heroku main

# Testar
curl https://humor-diario-backend.herokuapp.com/api/
```

### Passo 3: Frontend (10 min)
```bash
# Criar app
heroku create humor-diario-frontend

# Buildpacks
heroku buildpacks:add https://github.com/timanovsky/subdir-heroku-buildpack -a humor-diario-frontend
heroku buildpacks:add heroku/nodejs -a humor-diario-frontend

# Configurar pasta
heroku config:set PROJECT_PATH=frontend -a humor-diario-frontend

# Variáveis de ambiente
heroku config:set \
  EXPO_PUBLIC_BACKEND_URL="https://humor-diario-backend.herokuapp.com" \
  NODE_ENV="production" \
  -a humor-diario-frontend

# Deploy
git push heroku main

# Testar
heroku open -a humor-diario-frontend
```

---

## 🔧 Comandos Úteis

```bash
# Ver logs
heroku logs --tail -a humor-diario-backend
heroku logs --tail -a humor-diario-frontend

# Ver buildpacks configurados
heroku buildpacks -a humor-diario-backend

# Resetar buildpacks (se der erro)
heroku buildpacks:clear -a humor-diario-backend
# Adicionar novamente...

# Verificar variáveis
heroku config -a humor-diario-backend

# Reiniciar
heroku restart -a humor-diario-backend
```

---

## ⚠️ Troubleshooting

### Erro: "No such file or directory: backend/server.py"
**Solução:** Buildpack não configurado corretamente
```bash
heroku buildpacks:clear -a seu-app
heroku buildpacks:add https://github.com/timanovsky/subdir-heroku-buildpack -a seu-app
heroku buildpacks:add heroku/python -a seu-app
heroku config:set PROJECT_PATH=backend -a seu-app
```

### Erro: "Procfile not found"
**Solução:** Certifique-se que existe `backend/Procfile` ou `frontend/Procfile`

### Frontend não conecta ao backend
**Solução:** Verificar CORS e URL do backend
```bash
# Verificar URL configurada
heroku config:get EXPO_PUBLIC_BACKEND_URL -a humor-diario-frontend

# Deve ser: https://humor-diario-backend.herokuapp.com (sem /api no final)
```

---

## ✨ Resumo Final

**Método Recomendado:** MÉTODO 1 (Buildpack Subdir)

**Tempo total:** ~30 minutos
**Custo:** $10-14/mês (Heroku) + GRÁTIS (MongoDB Atlas)

**URLs Finais:**
- Backend: `https://humor-diario-backend.herokuapp.com/api/`
- Frontend: `https://humor-diario-frontend.herokuapp.com`

**Pronto!** Seu app Humor Diário está no ar! 🎉
